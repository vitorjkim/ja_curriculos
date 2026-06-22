import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper: parse image_url to get images array
const parseImages = (imageUrl) => {
  if (!imageUrl) return [];
  if (imageUrl.startsWith('[')) {
    try {
      const arr = JSON.parse(imageUrl);
      if (Array.isArray(arr)) return arr;
    } catch {}
  }
  return [imageUrl];
};

// GET /api/social-feed - Buscar todas as publicações
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const currentUserId = req.user?.id || req.user?.userId;
    let allPosts = [];

    // Buscar posts de estudantes e empresas (ambos usam a tabela student_posts)
    if (!type || type === 'students' || type === 'companies' || type === 'all') {
      try {
        const userTypeFilter = type === 'students'
          ? `AND u.type IN ('candidate', 'student')`
          : type === 'companies'
            ? `AND u.type = 'company'`
            : '';

        const studentQuery = `
          SELECT 
            p.id, p.candidate_id, p.image_url, p.caption, p.created_at,
            u.name as author_name, u.email as author_email, u.profile_image as author_avatar,
            u.company_name as company_name, u.type as user_type,
            (SELECT COUNT(*) FROM student_post_likes WHERE post_id = p.id) as likes_count,
            (SELECT COUNT(*) FROM student_post_comments WHERE post_id = p.id) as comments_count,
            EXISTS(SELECT 1 FROM student_post_likes WHERE post_id = p.id AND user_id = $1) as user_liked
          FROM student_posts p
          JOIN users u ON u.id = p.candidate_id
          WHERE 1=1 ${userTypeFilter}
          ORDER BY p.created_at DESC
          LIMIT 50
        `;
        const studentResult = await pool.query(studentQuery, [currentUserId]);
        
        for (const row of studentResult.rows) {
          const images = parseImages(row.image_url);
          const isCompany = row.user_type === 'company';
          const authorName = isCompany 
            ? (row.company_name || 'Empresa') 
            : (row.author_name || 'Estudante');
          
          allPosts.push({
            id: row.id,
            user_id: row.candidate_id,
            type: isCompany ? 'company' : 'student',
            postType: isCompany ? 'company' : 'student',
            author: {
              id: row.candidate_id,
              name: authorName,
              email: row.author_email,
              avatar: row.author_avatar
            },
            user: {
              id: row.candidate_id,
              name: authorName,
              email: row.author_email,
              avatar: row.author_avatar,
              type: isCompany ? 'company' : 'student'
            },
            image: images[0] || null,
            images: images,
            content: {
              type: 'image',
              url: images[0] || null,
              thumbnail: images[0] || null
            },
            caption: row.caption || '',
            description: row.caption || '',
            createdAt: row.created_at,
            timestamp: formatTimestamp(row.created_at),
            likes: parseInt(row.likes_count) || 0,
            comments: parseInt(row.comments_count) || 0,
            liked: row.user_liked || false
          });
        }
      } catch (err) {
        console.log('Erro ao buscar posts de estudantes/empresas:', err.message);
      }
    }

    // Buscar posts de escolas
    if (!type || type === 'schools' || type === 'all') {
      try {
        const schoolQuery = `
          SELECT 
            p.id, p.school_id, p.image_url, p.caption, p.created_at,
            u.school_name as author_name, u.email as author_email, u.profile_image as author_avatar,
            (SELECT COUNT(*) FROM school_post_likes WHERE post_id = p.id) as likes_count,
            (SELECT COUNT(*) FROM school_post_comments WHERE post_id = p.id) as comments_count,
            EXISTS(SELECT 1 FROM school_post_likes WHERE post_id = p.id AND user_id = $1) as user_liked
          FROM school_posts p
          JOIN users u ON u.id = p.school_id
          ORDER BY p.created_at DESC
          LIMIT 50
        `;
        const schoolResult = await pool.query(schoolQuery, [currentUserId]);
        
        for (const row of schoolResult.rows) {
          const images = parseImages(row.image_url);
          allPosts.push({
            id: row.id,
            user_id: row.school_id,
            type: 'school',
            postType: 'school',
            author: {
              id: row.school_id,
              name: row.author_name || 'Escola',
              email: row.author_email,
              avatar: row.author_avatar
            },
            user: {
              id: row.school_id,
              name: row.author_name || 'Escola',
              email: row.author_email,
              avatar: row.author_avatar,
              type: 'school'
            },
            image: images[0] || null,
            images: images,
            content: {
              type: 'image',
              url: images[0] || null,
              thumbnail: images[0] || null
            },
            caption: row.caption || '',
            description: row.caption || '',
            createdAt: row.created_at,
            timestamp: formatTimestamp(row.created_at),
            likes: parseInt(row.likes_count) || 0,
            comments: parseInt(row.comments_count) || 0,
            liked: row.user_liked || false
          });
        }
      } catch (err) {
        console.log('Erro ao buscar posts de escolas:', err.message);
      }
    }

    // Ordenar por data de criação (mais recentes primeiro)
    allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      posts: allPosts,
      total: allPosts.length
    });
  } catch (error) {
    console.log('GET /api/social-feed error', error);
    res.status(500).json({ error: 'Erro ao buscar publicações' });
  }
});

// Função auxiliar para formatar timestamp
function formatTimestamp(date) {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now - posted;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return '1d atrás';
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  return posted.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default router;
