import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Middleware de autenticação
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔍 Auth Middleware - Header:', authHeader);
  console.log('🔍 Auth Middleware - Token:', token ? 'Presente' : 'Ausente');

  if (!token) {
    console.log('❌ Auth Middleware - Token não fornecido');
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      code: 'TOKEN_REQUIRED'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth Middleware - Token decodificado:', decoded.userId);
    
    // Verificar se o usuário ainda existe no banco
    const result = await pool.query(
      'SELECT id, email, name, company_name, type, is_admin, disabled FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ Auth Middleware - Usuário não encontrado:', decoded.userId);
      return res.status(401).json({ 
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];
    console.log('✅ Auth Middleware - Usuário encontrado:', user.email, user.type);

    if (user.disabled) {
      console.log('❌ Auth Middleware - Conta desabilitada:', user.email);
      return res.status(401).json({ 
        error: 'Conta desabilitada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth Middleware - Erro ao verificar token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({ 
      error: 'Token inválido',
      code: 'TOKEN_INVALID'
    });
  }
};

// Middleware para verificar se é admin
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticação requerida',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.type !== 'admin' && !req.user.is_admin) {
    return res.status(403).json({ 
      error: 'Acesso restrito a administradores',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Middleware para verificar se é empresa
export const requireCompany = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticação requerida',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.type !== 'company') {
    return res.status(403).json({ 
      error: 'Acesso restrito a empresas',
      code: 'COMPANY_REQUIRED'
    });
  }

  next();
};

// Middleware para verificar se é candidato
export const requireCandidate = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticação requerida',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.type !== 'candidate') {
    return res.status(403).json({ 
      error: 'Acesso restrito a candidatos',
      code: 'CANDIDATE_REQUIRED'
    });
  }

  next();
};

// Middleware para verificar se é o próprio usuário ou admin
export const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Autenticação requerida',
      code: 'AUTH_REQUIRED'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  const isAdmin = req.user.type === 'admin' || req.user.is_admin;
  const isOwner = req.user.id === targetUserId;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ 
      error: 'Acesso negado',
      code: 'ACCESS_DENIED'
    });
  }

  next();
};

// Middleware opcional: tenta autenticar se houver token; se falhar, prossegue sem usuário
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, email, name, company_name, type, is_admin, disabled FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows.length === 0) return next();
      const user = result.rows[0];
      if (user.disabled) return next();
      req.user = user;
    } catch (e) {
      // Ignora token inválido/expirado para não bloquear rotas públicas
    }
    return next();
  } catch {
    return next();
  }
};
