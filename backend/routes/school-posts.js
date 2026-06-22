import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper: parse image_url to get images array
const parseImages = (imageUrl) => {
  if (!imageUrl) return [];
  // Tenta parsear como JSON (múltiplas imagens)
  if (imageUrl.startsWith('[')) {
    try {
      const arr = JSON.parse(imageUrl);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  // Se não for JSON, é uma única imagem
  return [imageUrl];
};

// Helper to map row to API post object with comments
const mapPost = (row) => {
  const images = parseImages(row.image_url);
  return {
    id: row.id,
    school_id: row.school_id,
    author: {
      id: row.school_id,
      name: row.school_name || row.author_name || 'Escola',
      email: row.school_email || null,
      avatar: row.school_profile_image || null,
    },
    image: images[0] || null, // retrocompatibilidade - primeira imagem
    images: images, // novo campo com todas as imagens
    caption: row.caption || '',
    createdAt: row.created_at,
    likes: Array.isArray(row.likes_user_ids) ? row.likes_user_ids : [],
    comments: Array.isArray(row.comments) ? row.comments.map(c => ({
      id: c.id,
      author: { id: c.user_id, name: c.user_name || 'Usuário', avatar: c.user_profile_image || null },
      text: c.text,
      createdAt: c.created_at,
      likes_count: c.likes_count || 0,
      liked_user_ids: c.liked_user_ids || [],
      replies: Array.isArray(c.replies) ? c.replies.map(r => ({
        id: r.id,
        author: { id: r.user_id, name: r.user_name || 'Usuário', avatar: r.user_profile_image || null },
        text: r.text,
        createdAt: r.created_at,
        likes_count: r.likes_count || 0,
        liked_user_ids: r.liked_user_ids || []
      })) : []
    })) : []
  };
};

// Public: list posts by school (or all if not provided)
router.get('/', async (req, res) => {
  try {
    const { school_id } = req.query;
    const params = [];
    let where = '';
    if (school_id) { params.push(school_id); where = `WHERE p.school_id = $${params.length}`; }

    // Aggregate likes and comments, plus author info
    const q = `
      SELECT 
        p.id, p.school_id, p.image_url, p.caption, p.created_at,
        u.school_name, u.email as school_email, u.profile_image as school_profile_image,
        -- likes as array of user_ids
        COALESCE(l.likes_user_ids, ARRAY[]::uuid[]) AS likes_user_ids,
        -- comments as JSON array
        COALESCE(c.comments, '[]'::json) AS comments
      FROM school_posts p
      JOIN users u ON u.id = p.school_id
      LEFT JOIN (
        SELECT post_id, ARRAY_AGG(user_id) AS likes_user_ids
        FROM school_post_likes
        GROUP BY post_id
      ) l ON l.post_id = p.id
      LEFT JOIN (
        SELECT c.post_id,
               json_agg(
                 json_build_object(
                   'id', c.id,
                   'user_id', c.user_id,
                   'user_name', (
                     SELECT COALESCE(NULLIF(name,''), NULLIF(company_name,''), NULLIF(school_name,''), email, 'Usuário')
                     FROM users WHERE id = c.user_id
                   ),
                   'user_profile_image', (
                     SELECT profile_image FROM users WHERE id = c.user_id
                   ),
                   'text', c.text,
                   'created_at', c.created_at,
                   'likes_count', (SELECT COUNT(*) FROM school_comment_likes l WHERE l.comment_id=c.id),
                   'liked_user_ids', COALESCE((SELECT ARRAY_AGG(user_id) FROM school_comment_likes WHERE comment_id=c.id), ARRAY[]::uuid[]),
                   'replies', COALESCE((
                     SELECT json_agg(json_build_object(
                       'id', r.id,
                       'user_id', r.user_id,
                       'user_name', (
                         SELECT COALESCE(NULLIF(name,''), NULLIF(company_name,''), NULLIF(school_name,''), email, 'Usuário')
                         FROM users WHERE id = r.user_id
                       ),
                       'user_profile_image', (
                         SELECT profile_image FROM users WHERE id = r.user_id
                       ),
                       'text', r.text,
                       'created_at', r.created_at,
                       'likes_count', (SELECT COUNT(*) FROM school_comment_likes l2 WHERE l2.comment_id=r.id),
                       'liked_user_ids', COALESCE((SELECT ARRAY_AGG(user_id) FROM school_comment_likes WHERE comment_id=r.id), ARRAY[]::uuid[])
                     ) ORDER BY r.created_at ASC)
                     FROM school_post_comments r
                     WHERE r.post_id=c.post_id AND r.parent_id=c.id
                   ), '[]'::json)
                 )
                 ORDER BY c.created_at ASC
               ) AS comments
        FROM school_post_comments c
        WHERE c.parent_id IS NULL
        GROUP BY c.post_id
      ) c ON c.post_id = p.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT 200
    `;
    const r = await pool.query(q, params);
    const posts = r.rows.map(mapPost);
    res.json({ success: true, posts });
  } catch (e) {
    console.error('GET /api/school-posts error', e);
    res.status(500).json({ success: false, message: 'Erro ao listar publicações' });
  }
});

// Create post (school only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'school') return res.status(403).json({ success:false, message:'Apenas escolas podem publicar' });
    const { image, images, caption } = req.body || {};
    
    // Suportar tanto 'image' (string única) quanto 'images' (array)
    let imageArray = [];
    if (images && Array.isArray(images) && images.length > 0) {
      imageArray = images.filter(img => typeof img === 'string' && img.length > 10).slice(0, 10);
    } else if (image && typeof image === 'string' && image.length > 10) {
      imageArray = [image];
    }
    
    if (imageArray.length === 0) return res.status(400).json({ success:false, message:'Pelo menos uma imagem é obrigatória' });
    
    // Armazenar como JSON se múltiplas imagens, ou string simples se única (retrocompatibilidade)
    const imageValue = imageArray.length === 1 ? imageArray[0] : JSON.stringify(imageArray);
    
    const ins = await pool.query(`
      INSERT INTO school_posts (school_id, image_url, caption)
      VALUES ($1, $2, $3)
      RETURNING id, school_id, image_url, caption, created_at
    `, [req.user.id, imageValue, caption || null]);
    const row = ins.rows[0];
    const author = await pool.query('SELECT school_name, email FROM users WHERE id=$1', [req.user.id]);
    res.status(201).json({ success:true, post: mapPost({ ...row, school_name: author.rows[0]?.school_name, school_email: author.rows[0]?.email, likes_user_ids: [], comments: [] }) });
  } catch (e) {
    console.error('POST /api/school-posts error', e);
    res.status(500).json({ success:false, message:'Erro ao criar publicação' });
  }
});

// Toggle like (any authenticated user)
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Check if post exists
    const post = await pool.query('SELECT id FROM school_posts WHERE id=$1', [id]);
    if (post.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    // Toggle
    const existing = await pool.query('SELECT id FROM school_post_likes WHERE post_id=$1 AND user_id=$2', [id, req.user.id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM school_post_likes WHERE id=$1', [existing.rows[0].id]);
      return res.json({ success:true, liked:false });
    } else {
      await pool.query('INSERT INTO school_post_likes (post_id, user_id) VALUES ($1,$2)', [id, req.user.id]);
      return res.json({ success:true, liked:true });
    }
  } catch (e) {
    console.error('POST /api/school-posts/:id/like error', e);
    res.status(500).json({ success:false, message:'Erro ao curtir publicação' });
  }
});

// Add comment (any authenticated user)
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parent_id } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ success:false, message:'Texto é obrigatório' });
    const post = await pool.query('SELECT id FROM school_posts WHERE id=$1', [id]);
    if (post.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    // Validate parent if provided
    if (parent_id) {
      const parent = await pool.query('SELECT id FROM school_post_comments WHERE id=$1 AND post_id=$2', [parent_id, id]);
      if (parent.rows.length === 0) return res.status(400).json({ success:false, message:'Comentário pai inválido' });
    }
    const ins = await pool.query('INSERT INTO school_post_comments (post_id, user_id, text, parent_id) VALUES ($1,$2,$3,$4) RETURNING id, post_id, user_id, text, created_at', [id, req.user.id, String(text).trim(), parent_id || null]);
    const c = ins.rows[0];
    const author = await pool.query("SELECT COALESCE(NULLIF(name,''), NULLIF(company_name,''), NULLIF(school_name,''), email, 'Usuário') AS display_name FROM users WHERE id=$1", [req.user.id]);
    res.status(201).json({ success:true, comment: { id: c.id, author: { id: c.user_id, name: author.rows[0]?.display_name || 'Usuário' }, text: c.text, createdAt: c.created_at, parent_id: parent_id || null } });
  } catch (e) {
    console.error('POST /api/school-posts/:id/comment error', e);
    res.status(500).json({ success:false, message:'Erro ao comentar publicação' });
  }
});

// Toggle like on a comment
router.post('/comments/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const c = await pool.query('SELECT id FROM school_post_comments WHERE id=$1', [id]);
    if (c.rows.length === 0) return res.status(404).json({ success:false, message:'Comentário não encontrado' });
    const existing = await pool.query('SELECT id FROM school_comment_likes WHERE comment_id=$1 AND user_id=$2', [id, req.user.id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM school_comment_likes WHERE id=$1', [existing.rows[0].id]);
      return res.json({ success:true, liked:false });
    } else {
      await pool.query('INSERT INTO school_comment_likes (comment_id, user_id) VALUES ($1,$2)', [id, req.user.id]);
      return res.json({ success:true, liked:true });
    }
  } catch (e) {
    console.error('POST /api/school-posts/comments/:id/like error', e);
    res.status(500).json({ success:false, message:'Erro ao curtir comentário' });
  }
});

// Delete post (only author school)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'school') return res.status(403).json({ success:false, message:'Apenas escolas podem deletar publicações' });
    const { id } = req.params;
    const r = await pool.query('DELETE FROM school_posts WHERE id=$1 AND school_id=$2 RETURNING id', [id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    res.json({ success:true, removed:true });
  } catch (e) {
    console.error('DELETE /api/school-posts/:id error', e);
    res.status(500).json({ success:false, message:'Erro ao remover publicação' });
  }
});

export default router;
