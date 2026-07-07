import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Importar configurações e middlewares
import pool from './config/database.js';

// Importar rotas
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import resumeRoutes from './routes/resumes.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import favoritesRoutes from './routes/favorites.js';
import interactionsRoutes from './routes/interactions.js';
import messagesRoutes from './routes/messages.js';
import chatRoutes from './routes/chat.js';
import schoolRoutes from './routes/schools.js';
import externalJobsRoutes from './routes/external-jobs.js';
import schoolPostsRoutes from './routes/school-posts.js';
import studentPostsRoutes from './routes/student-posts.js';
import studentProfileViewsRoutes from './routes/student-profile-views.js';
import socialFeedRoutes from './routes/social-feed.js';
import journeyRoutes from './routes/journey.js';
import jobAlertsRoutes from './routes/jobAlerts.js';
import savedJobsRoutes from './routes/savedJobs.js';
import agencyRoutes from './routes/agency.js';
import aiRoutes from './routes/ai.js';
import notificationRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';

// Importar scripts
import createTables from './scripts/initDatabase.js';
import seedDatabase from './scripts/seed.js';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do .env dentro de backend
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// ============================================================================
// CORS - CONFIGURAÇÃO AGRESSIVA (coloca ANTES de qualquer middleware)
// ============================================================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ja-curriculos.vercel.app',
  'http://localhost:3001',
];

// Middleware de CORS customizado - executa ANTES de tudo
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Sempre permitir se houver uma origem autorizada ou se não houver origem
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '3600');
  }
  
  // Responder automaticamente a requisições OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Middleware cors padrão (redundante, mas reforça)
const corsOptions = {
  origin: allowedOrigins,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Middlewares de segurança e otimização (APÓS CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permite CORS com helmet
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Função para verificar se a rota é de upload
const isUploadRoute = (req) => {
  return req.path.includes('/upload') && req.method === 'POST';
};

// Parser JSON - excluir rotas de upload
app.use((req, res, next) => {
  if (!isUploadRoute(req)) {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    next();
  }
});

// Parser URL-encoded - excluir rotas de upload  
app.use((req, res, next) => {
  if (!isUploadRoute(req)) {
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  } else {
    next();
  }
});

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(join(__dirname, 'uploads')));
// Servir templates estáticos (planilhas/modelos)
app.use('/templates', express.static(join(__dirname, 'templates')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/external-jobs', externalJobsRoutes);
app.use('/api/school-posts', schoolPostsRoutes);
app.use('/api/student-posts', studentPostsRoutes);
app.use('/api/students', studentProfileViewsRoutes);
app.use('/api/social-feed', socialFeedRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/job-alerts', jobAlertsRoutes);
app.use('/api/saved-jobs', savedJobsRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Rota de healthcheck
app.get('/health', async (req, res) => {
  try {
    // Testar conexão com banco
    await pool.query('SELECT 1');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Rota de teste CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    status: 'CORS working',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    message: 'Se você vê isso, CORS está funcionando!'
  });
});

app.post('/api/cors-test', (req, res) => {
  res.json({
    status: 'CORS POST working',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    message: 'POST CORS está funcionando!'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'CurriculoJá API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    docs: '/api-docs'
  });
});

// Middleware de erro 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  
  // Erro de CORS
  if (error.message === 'Não permitido pelo CORS') {
    return res.status(403).json({
      error: 'CORS: Origem não permitida',
      code: 'CORS_ERROR'
    });
  }
  
  // Erro de JSON inválido
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: 'JSON inválido no corpo da requisição',
      code: 'INVALID_JSON'
    });
  }
  
  // Erro genérico
  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Função para inicializar o servidor
const startServer = async () => {
  console.log('🚀 Iniciando servidor CurriculoJá...');
  let dbOk = false;
  // Tentar conectar ao banco, mas não derrubar o servidor se falhar
  try {
    console.log('🔌 Testando conexão com PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conexão com PostgreSQL estabelecida');
    dbOk = true;
  } catch (error) {
    console.error('❌ Falha ao conectar no PostgreSQL:', error?.message || error);
    console.warn('⚠️ Iniciando API em modo degradado (sem banco). Alguns endpoints retornarão dados limitados.');
  }

  // Preparar banco apenas se a conexão foi bem-sucedida
  if (dbOk) {
    try {
      console.log('🗄️  Verificando estrutura do banco...');
      await createTables();
      console.log('🌱 Verificando dados iniciais...');
      await seedDatabase();
    } catch (prepErr) {
      console.error('❌ Erro preparando banco de dados:', prepErr?.message || prepErr);
    }
  }

  // Iniciar servidor sempre (modo normal ou degradado)
  app.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando com sucesso!`);
    console.log(`📡 API: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS habilitado para: ${allowedOrigins.join(', ')}`);
    if (!dbOk) {
      console.log('⚠️ Servidor em modo degradado: sem conexão com o banco.');
    }
    console.log(`\n📋 Rotas disponíveis:`);
    console.log(`   POST /api/auth/register - Registrar usuário`);
    console.log(`   POST /api/auth/login - Login`);
    console.log(`   POST /api/auth/refresh - Renovar token`);
    console.log(`   POST /api/auth/logout - Logout`);
    console.log(`   GET  /api/auth/me - Dados do usuário atual`);
    console.log(`   GET  /api/users - Listar usuários (admin)`);
    console.log(`   GET  /api/users/:id - Obter usuário`);
    console.log(`   PUT  /api/users/:id - Atualizar usuário`);
    console.log(`   PATCH /api/users/:id/toggle-status - Alterar status`);
    console.log(`   DELETE /api/users/:id - Deletar usuário (admin)`);
    console.log(`   POST /api/users/bulk-action - Ações em lote (admin)`);
  console.log(`   GET  /api/jobs - Listar vagas`);
    console.log(`   GET  /api/jobs/:id - Obter vaga específica`);
    console.log(`   GET  /api/jobs/company - Listar vagas da empresa`);
    console.log(`   GET  /api/jobs/companies/list - Listar empresas`);
    console.log(`   POST /api/jobs - Criar vaga (empresa)`);
  console.log(`   POST /api/jobs/community - Criar vaga da comunidade (admin)`);
    console.log(`   PUT  /api/jobs/:id - Atualizar vaga (empresa)`);
    console.log(`   DELETE /api/jobs/:id - Deletar vaga (empresa)`);
    console.log(`   PATCH /api/jobs/:id/toggle-status - Ativar/desativar vaga`);
  console.log(`   GET  /api/student-posts - Feed de posts de alunos (opcional ?user_id=)`);
  console.log(`   POST /api/student-posts - Criar post (candidato)`);
  console.log(`   POST /api/student-posts/:id/like - Curtir/Descurtir post`);
  console.log(`   POST /api/student-posts/:id/comment - Comentar`);
  console.log(`   DELETE /api/student-posts/:id - Excluir post próprio`);
  console.log(`   POST /api/students/:id/profile-view - Registrar visualização do perfil (empresa)`);
  console.log(`   GET  /api/students/:id/profile-views - Listar empresas que visualizaram (aluno/escola)`);
    console.log(`\n👤 Usuário admin padrão:`);
    console.log(`   Email: admin@curriculoja.com`);
    console.log(`   Senha: admin123`);
    console.log(`\n🎯 Ready for connections!`);
  });
};

// Tratamento de sinais de encerramento
process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, encerrando servidor...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, encerrando servidor...');
  await pool.end();
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();
