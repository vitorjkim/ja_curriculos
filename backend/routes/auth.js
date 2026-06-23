import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { validateLogin, validateUserRegistration } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register - Registrar novo usuário
router.post('/register', validateUserRegistration, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      email, 
      password, 
      name, 
      companyName, 
      phone, 
      cpf, 
      cnpj, 
      type,
      bio,
      schoolName,
      schoolType,
      schoolDirector,
      schoolContactPhone,
      schoolCity,
      schoolState,
      schoolWebsite,
      profileImage,
      logo
    } = req.body;

    // Verificar se email já existe
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Este email já está sendo usado',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Verificar se CNPJ já existe (para empresas)
    if (type === 'company' && cnpj) {
      const existingCNPJ = await client.query(
        'SELECT id FROM users WHERE cnpj = $1 AND type = $2',
        [cnpj, 'company']
      );

      if (existingCNPJ.rows.length > 0) {
        return res.status(400).json({
          error: 'Este CNPJ já está cadastrado por outra empresa',
          code: 'CNPJ_ALREADY_EXISTS'
        });
      }
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Inserir usuário
    // Garantir colunas de escola
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR(255)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_type VARCHAR(120)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_director VARCHAR(120)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_contact_phone VARCHAR(40)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_city VARCHAR(120)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_state VARCHAR(60)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_website VARCHAR(255)`);
    
    // Garantir que profile_image seja TEXT para suportar base64
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT`);
    // Se a coluna já existe com VARCHAR, converter para TEXT
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'profile_image' AND data_type <> 'text'
        ) THEN
          ALTER TABLE users ALTER COLUMN profile_image TYPE TEXT;
        END IF;
      END $$;
    `);

    const result = await client.query(`
      INSERT INTO users (
        email, password, name, company_name, phone, cpf, cnpj,
        type, is_admin, bio, created_at,
        school_name, school_type, school_director, school_contact_phone, school_city, school_state, school_website,
        profile_image
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id, email, name, company_name, type, is_admin, created_at, school_name, profile_image
    `,[
      email,
      passwordHash,
      (type === 'candidate' || type === 'admin') ? name : null,
      type === 'company' ? companyName : null,
      phone || null,
      type === 'candidate' ? cpf : null,
      type === 'company' ? cnpj : null,
      type,
      type === 'admin',
      bio || null,
      type === 'school' ? (schoolName || name || null) : null,
      type === 'school' ? (schoolType || null) : null,
      type === 'school' ? (schoolDirector || null) : null,
      type === 'school' ? (schoolContactPhone || phone || null) : null,
      type === 'school' ? (schoolCity || null) : null,
      type === 'school' ? (schoolState || null) : null,
      type === 'school' ? (schoolWebsite || null) : null,
      profileImage || logo || null
    ]);

    const user = result.rows[0];

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Gerar refresh token
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias

    await client.query(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, refreshToken, expiresAt]);

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      user.id,
      'USER_REGISTERED',
      JSON.stringify({ userType: type }),
      req.ip
    ]);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
  user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        type: user.type,
        isAdmin: user.is_admin
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// POST /api/auth/login - Login
router.post('/login', validateLogin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const result = await client.query(`
      SELECT 
        id, email, password, name, company_name, type, is_admin, disabled, 
        subscription_plan, subscription_status,
        school_name, school_type, school_contact_phone, 
        school_city, school_state, school_website,
        profile_image, is_agency
      FROM users WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Email ou senha incorretos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = result.rows[0];

    // Verificar se conta está desabilitada
    if (user.disabled) {
      return res.status(401).json({
        error: 'Conta desabilitada. Entre em contato com o suporte.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Email ou senha incorretos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, userId: user.id, email: user.email, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Gerar refresh token
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias

    await client.query(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, refreshToken, expiresAt]);

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, ip_address, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [user.id, 'USER_LOGIN', req.ip]);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
          schoolName: user.school_name,
          schoolType: user.school_type,
          schoolContactPhone: user.school_contact_phone,
        schoolCity: user.school_city,
        schoolState: user.school_state,
        schoolWebsite: user.school_website,
        type: user.type,
        isAdmin: user.is_admin,
        subscriptionPlan: user.subscription_plan || 'free',
        subscriptionStatus: user.subscription_status || 'active',
        profileImage: user.profile_image,
        profile_image: user.profile_image,
        isAgency: user.is_agency || false
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Buscar sessão
    const sessionResult = await client.query(`
      SELECT us.user_id, us.expires_at, u.email, u.type, u.disabled
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.refresh_token = $1 AND us.expires_at > NOW()
    `, [refreshToken]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const session = sessionResult.rows[0];

    if (session.disabled) {
      return res.status(401).json({
        error: 'Conta desabilitada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Gerar novo JWT
    const token = jwt.sign(
      { userId: session.user_id, email: session.email, type: session.type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token renovado com sucesso',
      token
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { refreshToken } = req.body;

    // Remover sessão se refresh token fornecido
    if (refreshToken) {
      await client.query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token = $2',
        [req.user.id, refreshToken]
      );
    }

    // Log da ação
    await client.query(`
      INSERT INTO activity_logs (user_id, action, ip_address, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [req.user.id, 'USER_LOGOUT', req.ip]);

    res.json({
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// GET /api/auth/me - Obter dados do usuário atual
router.get('/me', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
  SELECT id, email, name, company_name, phone, cpf, cnpj, type, 
     is_admin, bio, profile_image, created_at, updated_at, subscription_plan, subscription_status,
     school_name, school_type, school_contact_phone, school_city, school_state, school_website,
     is_agency
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        phone: user.phone,
        cpf: user.cpf,
        cnpj: user.cnpj,
        type: user.type,
        isAdmin: user.is_admin,
        bio: user.bio,
        profileImage: user.profile_image,
        profile_image: user.profile_image,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        subscriptionPlan: user.subscription_plan || 'free',
        subscriptionStatus: user.subscription_status || 'active',
        schoolName: user.school_name,
        schoolType: user.school_type,
        schoolContactPhone: user.school_contact_phone,
        schoolCity: user.school_city,
        schoolState: user.school_state,
        schoolWebsite: user.school_website,
        isAgency: user.is_agency || false
      }
    });

  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    client.release();
  }
});

// POST /api/auth/upgrade - Atualizar plano de assinatura
router.post('/upgrade', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.type !== 'company') {
      return res.status(403).json({ error: 'Apenas empresas podem alterar o plano' });
    }
    const { plan } = req.body;
    if (!['free','pro','premium'].includes(plan)) {
      return res.status(400).json({ error: 'Plano inválido' });
    }
    await client.query('UPDATE users SET subscription_plan = $1, subscription_status = $2, updated_at = NOW() WHERE id = $3',[plan,'active',req.user.id]);
    res.json({ success: true, plan });
  } catch (e) {
    console.error('Erro upgrade plano:', e);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

export default router;
