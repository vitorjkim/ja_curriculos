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
    candidate_id: row.candidate_id,
    author: {
      id: row.candidate_id,
      name: row.candidate_name || row.author_name || 'Usuário',
      email: row.candidate_email || null,
      avatar: row.candidate_avatar || null,
      profile_image: row.candidate_avatar || null,
      type: row.author_type || 'candidate',
    },
    image: images[0] || null, // retrocompatibilidade - primeira imagem
    images: images, // novo campo com todas as imagens
    caption: row.caption || '',
    createdAt: row.created_at,
    likes: Array.isArray(row.likes_user_ids) ? row.likes_user_ids : [],
    comments: Array.isArray(row.comments) ? row.comments.map(c => ({
      id: c.id,
      author: { id: c.user_id, name: c.user_name || 'Usuário', avatar: c.user_avatar || null, profile_image: c.user_avatar || null },
      text: c.text,
      createdAt: c.created_at,
      likes_count: c.likes_count || 0,
      liked_user_ids: c.liked_user_ids || [],
      replies: Array.isArray(c.replies) ? c.replies.map(r => ({
        id: r.id,
        author: { id: r.user_id, name: r.user_name || 'Usuário', avatar: r.user_avatar || null, profile_image: r.user_avatar || null },
        text: r.text,
        createdAt: r.created_at,
        likes_count: r.likes_count || 0,
        liked_user_ids: r.liked_user_ids || []
      })) : []
    })) : []
  };
};

// Public: list posts by candidate (or all if not provided)
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    console.log('📷 GET /api/student-posts - user_id:', user_id || 'TODOS');
    const params = [];
    let where = '';
    if (user_id) { params.push(user_id); where = `WHERE p.candidate_id = $${params.length}`; }

    const q = `
      SELECT 
        p.id, p.candidate_id, p.image_url, p.caption, p.created_at,
        COALESCE(NULLIF(u.name,''), NULLIF(u.company_name,''), NULLIF(u.school_name,''), u.email, 'Usuário') as candidate_name, 
        u.email as candidate_email, u.profile_image as candidate_avatar,
        u.type as author_type,
        COALESCE(l.likes_user_ids, ARRAY[]::uuid[]) AS likes_user_ids,
        COALESCE(c.comments, '[]'::json) AS comments
      FROM student_posts p
      JOIN users u ON u.id = p.candidate_id
      LEFT JOIN (
        SELECT post_id, ARRAY_AGG(user_id) AS likes_user_ids
        FROM student_post_likes
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
                   'user_avatar', (
                     SELECT profile_image FROM users WHERE id = c.user_id
                   ),
                   'text', c.text,
                   'created_at', c.created_at,
                   'likes_count', (SELECT COUNT(*) FROM student_comment_likes l WHERE l.comment_id=c.id),
                   'liked_user_ids', COALESCE((SELECT ARRAY_AGG(user_id) FROM student_comment_likes WHERE comment_id=c.id), ARRAY[]::uuid[]),
                   'replies', COALESCE((
                     SELECT json_agg(json_build_object(
                       'id', r.id,
                       'user_id', r.user_id,
                       'user_name', (
                         SELECT COALESCE(NULLIF(name,''), NULLIF(company_name,''), NULLIF(school_name,''), email, 'Usuário')
                         FROM users WHERE id = r.user_id
                       ),
                       'user_avatar', (
                         SELECT profile_image FROM users WHERE id = r.user_id
                       ),
                       'text', r.text,
                       'created_at', r.created_at,
                       'likes_count', (SELECT COUNT(*) FROM student_comment_likes l2 WHERE l2.comment_id=r.id),
                       'liked_user_ids', COALESCE((SELECT ARRAY_AGG(user_id) FROM student_comment_likes WHERE comment_id=r.id), ARRAY[]::uuid[])
                     ) ORDER BY r.created_at ASC)
                     FROM student_post_comments r
                     WHERE r.post_id=c.post_id AND r.parent_id=c.id
                   ), '[]'::json)
                 )
                 ORDER BY c.created_at ASC
               ) AS comments
        FROM student_post_comments c
        WHERE c.parent_id IS NULL
        GROUP BY c.post_id
      ) c ON c.post_id = p.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT 200
    `;
    const r = await pool.query(q, params);
    console.log('📷 Posts encontrados:', r.rows.length, '- User IDs:', r.rows.map(row => row.candidate_id));
    console.log('📷 Posts author_type:', r.rows.map(row => ({ name: row.candidate_name, type: row.author_type })));
    const posts = r.rows.map(mapPost);
    res.json({ success: true, posts });
  } catch (e) {
    console.error('GET /api/student-posts error', e);
    res.status(500).json({ success: false, message: 'Erro ao listar publicações' });
  }
});

// Create post (candidate, company, or school)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Permitir que candidatos, empresas e escolas publiquem
    if (!['candidate', 'company', 'school'].includes(req.user.type)) {
      return res.status(403).json({ success:false, message:'Apenas candidatos, empresas e escolas podem publicar' });
    }
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
      INSERT INTO student_posts (candidate_id, image_url, caption)
      VALUES ($1, $2, $3)
      RETURNING id, candidate_id, image_url, caption, created_at
    `, [req.user.id, imageValue, caption || null]);
    const row = ins.rows[0];
    const author = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.user.id]);
    res.status(201).json({ success:true, post: mapPost({ ...row, candidate_name: author.rows[0]?.name, candidate_email: author.rows[0]?.email, likes_user_ids: [], comments: [] }) });
  } catch (e) {
    console.error('POST /api/student-posts error', e);
    res.status(500).json({ success:false, message:'Erro ao criar publicação' });
  }
});

// Toggle like (any authenticated user)
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await pool.query('SELECT id FROM student_posts WHERE id=$1', [id]);
    if (post.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    const existing = await pool.query('SELECT id FROM student_post_likes WHERE post_id=$1 AND user_id=$2', [id, req.user.id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM student_post_likes WHERE id=$1', [existing.rows[0].id]);
      return res.json({ success:true, liked:false });
    } else {
      await pool.query('INSERT INTO student_post_likes (post_id, user_id) VALUES ($1,$2)', [id, req.user.id]);
      return res.json({ success:true, liked:true });
    }
  } catch (e) {
    console.error('POST /api/student-posts/:id/like error', e);
    res.status(500).json({ success:false, message:'Erro ao curtir publicação' });
  }
});

// Add comment (any authenticated user)
router.post('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parent_id } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ success:false, message:'Texto é obrigatório' });
    const post = await pool.query('SELECT id FROM student_posts WHERE id=$1', [id]);
    if (post.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    if (parent_id) {
      const parent = await pool.query('SELECT id FROM student_post_comments WHERE id=$1 AND post_id=$2', [parent_id, id]);
      if (parent.rows.length === 0) return res.status(400).json({ success:false, message:'Comentário pai inválido' });
    }
    const ins = await pool.query('INSERT INTO student_post_comments (post_id, user_id, text, parent_id) VALUES ($1,$2,$3,$4) RETURNING id, post_id, user_id, text, created_at', [id, req.user.id, String(text).trim(), parent_id || null]);
    const c = ins.rows[0];
    const author = await pool.query("SELECT COALESCE(NULLIF(name,''), NULLIF(company_name,''), NULLIF(school_name,''), email, 'Usuário') AS display_name FROM users WHERE id=$1", [req.user.id]);
    res.status(201).json({ success:true, comment: { id: c.id, author: { id: c.user_id, name: author.rows[0]?.display_name || 'Usuário' }, text: c.text, createdAt: c.created_at, parent_id: parent_id || null } });
  } catch (e) {
    console.error('POST /api/student-posts/:id/comment error', e);
    res.status(500).json({ success:false, message:'Erro ao comentar publicação' });
  }
});

// Toggle like on a comment
router.post('/comments/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const c = await pool.query('SELECT id FROM student_post_comments WHERE id=$1', [id]);
    if (c.rows.length === 0) return res.status(404).json({ success:false, message:'Comentário não encontrado' });
    const existing = await pool.query('SELECT id FROM student_comment_likes WHERE comment_id=$1 AND user_id=$2', [id, req.user.id]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM student_comment_likes WHERE id=$1', [existing.rows[0].id]);
      return res.json({ success:true, liked:false });
    } else {
      await pool.query('INSERT INTO student_comment_likes (comment_id, user_id) VALUES ($1,$2)', [id, req.user.id]);
      return res.json({ success:true, liked:true });
    }
  } catch (e) {
    console.error('POST /api/student-posts/comments/:id/like error', e);
    res.status(500).json({ success:false, message:'Erro ao curtir comentário' });
  }
});

// Delete post (author, admin, or company-owner when applicable)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Load post to verify ownership
    const postQ = await pool.query('SELECT id, candidate_id FROM student_posts WHERE id=$1', [id]);
    if (postQ.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    const post = postQ.rows[0];

    // Allow deletion if requester is the post creator, or an admin.
    // If the post was created by a company, the creator check will still allow the company to delete it.
    const isCreator = req.user.id === post.candidate_id;
    const isAdmin = req.user.type === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success:false, message:'Sem permissão para deletar publicação' });
    }

    const r = await pool.query('DELETE FROM student_posts WHERE id=$1 RETURNING id', [id]);
    if (r.rows.length === 0) return res.status(404).json({ success:false, message:'Publicação não encontrada' });
    res.json({ success:true, removed:true });
  } catch (e) {
    console.error('DELETE /api/student-posts/:id error', e);
    res.status(500).json({ success:false, message:'Erro ao remover publicação' });
  }
});

export default router;
