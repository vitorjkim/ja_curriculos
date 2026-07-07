# 📋 RESUMO EXECUTIVO - ESTRUTURA DO CURRÍCULOJÁ

## 1️⃣ COLUNAS ATUAIS DA TABELA `users`

### Campos Principais (Schema Oficial):
```
id              → UUID PRIMARY KEY
email           → VARCHAR(255) UNIQUE NOT NULL
password        → VARCHAR(255) [bcrypt hash]
name            → VARCHAR(255) [para candidates/admins]
company_name    → VARCHAR(255) [para companies]
phone           → VARCHAR(20)
cpf             → VARCHAR(14) [para candidates]
cnpj            → VARCHAR(18) [para companies]
type            → VARCHAR(20) CHECK (candidate|company|admin|school)
is_admin        → BOOLEAN DEFAULT FALSE
disabled        → BOOLEAN DEFAULT FALSE
profile_image   → TEXT [suporta base64 ou URLs]
bio             → TEXT
social_links    → JSONB DEFAULT '{}'::jsonb
created_at      → TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at      → TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Colunas de Subscription/Planos:
```
subscription_plan       → VARCHAR(20) DEFAULT 'free'
subscription_status     → VARCHAR(20) DEFAULT 'active'
```

### Colunas de Verificação/Agência (Adicionadas Dinamicamente):
```
is_verified     → BOOLEAN DEFAULT FALSE        [Jobs.js linha 1246]
is_agency       → BOOLEAN DEFAULT FALSE        [Users.js lazy migration]
```

### Colunas de Empresa (Dinâmicas):
```
company_sector  → VARCHAR(120)
company_size    → VARCHAR(50)
location        → VARCHAR(255)
```

### Colunas de Escola (Dinâmicas):
```
school_name             → VARCHAR(255)
school_type             → VARCHAR(100)
school_address          → TEXT
school_city             → VARCHAR(100)
school_state            → VARCHAR(50)
school_cep              → VARCHAR(20)
school_director         → VARCHAR(255)
school_contact_phone    → VARCHAR(20)
school_website          → VARCHAR(255)
```

### Colunas de Redes Sociais (Dinâmicas - via PATCH):
```
linkedin_url    → VARCHAR
instagram_url   → VARCHAR
github_url      → VARCHAR
custom_url      → VARCHAR
life_status     → VARCHAR
resume_sections → [estrutura customizada]
```

---

## 2️⃣ ESTRUTURA PARA EMPRESAS

### ❌ NÃO EXISTE TABELA SEPARADA
Empresas são armazenadas na tabela `users` com `type='company'`

### Campos Relevantes:
| Campo | Tipo | Uso |
|-------|------|-----|
| `id` | UUID | Identificador único |
| `email` | VARCHAR | Login único |
| `company_name` | VARCHAR | Nome comercial |
| `cnpj` | VARCHAR(18) | Identificação (não validado, apenas UNIQUE) |
| `phone` | VARCHAR | Contato |
| `company_sector` | VARCHAR | Setor (dinâmico) |
| `company_size` | VARCHAR | Tamanho (dinâmico) |
| `bio` | TEXT | Descrição da empresa |
| `profile_image` | TEXT | Logo da empresa |
| `is_verified` | BOOLEAN | Status de verificação (dinâmico) |
| `subscription_plan` | VARCHAR | Plano contratado |
| `subscription_status` | VARCHAR | Status do plano |
| `disabled` | BOOLEAN | Conta desabilitada |
| `location` | VARCHAR | Localização principal |

### Relações:
- **jobs** → `company_id` FK referencia `users.id`
- **favorites** → `company_id` FK referencia `users.id` (empresas salvando candidatos)
- **student_profile_views** → `company_id` FK referencia `users.id`
- **partnerships** → `company_id` FK referencia `users.id` (com escolas)

---

## 3️⃣ PADRÃO DE MIDDLEWARES

### Arquivo: `backend/middleware/auth.js`

#### **1. authenticateToken** (Principal)
```javascript
// Uso: router.get('/protected', authenticateToken, handler)
// Entrada: Authorization: Bearer <JWT>
// Saída: req.user = { id, email, name, company_name, type, is_admin, disabled }
// Validações:
//   - Token presente e válido
//   - Usuário existe no banco
//   - Conta não está desabilitada
// Erros: 401 (não autenticado), 403 (token inválido)
```

#### **2. requireAdmin**
```javascript
// Uso: router.post('/admin-only', authenticateToken, requireAdmin, handler)
// Checa: req.user.type === 'admin' || req.user.is_admin
// Erro: 403 - ADMIN_REQUIRED
```

#### **3. requireCompany**
```javascript
// Uso: router.post('/job', authenticateToken, requireCompany, handler)
// Checa: req.user.type === 'company'
// Erro: 403 - COMPANY_REQUIRED
```

#### **4. requireCandidate**
```javascript
// Checa: req.user.type === 'candidate'
// Erro: 403 - CANDIDATE_REQUIRED
```

#### **5. requireOwnerOrAdmin**
```javascript
// Checa: req.user.id === params.id || is_admin
// Uso: router.put('/:id', authenticateToken, requireOwnerOrAdmin, handler)
// Erro: 403 - ACCESS_DENIED
```

#### **6. optionalAuth**
```javascript
// Tenta autenticar mas permite prosseguir sem req.user
// Uso: router.get('/jobs', optionalAuth, handler)
// Útil para endpoints públicos com dados extras se autenticado
```

### Padrão JWT:
```javascript
// Payload
{
  userId: "uuid-do-usuario",
  email: "usuario@email.com",
  type: "candidate" | "company" | "admin" | "school"
}
// Assinado com: process.env.JWT_SECRET
// Expiry: 7 dias
// Refresh: Armazenado em tabela user_sessions (30 dias)
```

---

## 4️⃣ PADRÃO DE ROTAS/CONTROLLERS

### Arquivo Base: `backend/server.js`
```javascript
// Importação centralizada (21 rotas)
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import jobRoutes from './routes/jobs.js';
// ... etc

// Registro
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
```

### Padrão de Rota Individual (Ex: `routes/jobs.js`):
```javascript
import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken, requireCompany } from '../middleware/auth.js';

const router = express.Router();

// Lazy Migration Pattern (backward compat)
let ensuredColumn = false;
async function ensureColumn() {
  if (ensuredColumn) return;
  try {
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE`);
    ensuredColumn = true;
  } catch (e) {
    console.error('Migration error:', e.message);
  }
}

// GET /api/jobs - Listar (público)
router.get('/', async (req, res) => {
  try {
    await ensureColumn();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const result = await pool.query('SELECT * FROM jobs WHERE is_active = TRUE');
    res.json({ jobs: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erro interno', code: 'INTERNAL_ERROR' });
  }
});

// POST /api/jobs - Criar (autenticado + company)
router.post('/', 
  authenticateToken,
  requireCompany,
  body('title').notEmpty(),
  body('description').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      
      const result = await pool.query(
        'INSERT INTO jobs (company_id, title, description, ...) VALUES ($1, $2, $3, ...) RETURNING *',
        [req.user.id, req.body.title, req.body.description, ...]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno', code: 'INTERNAL_ERROR' });
    }
  }
);

// PUT /api/jobs/:id - Atualizar (empresa dona)
router.put('/:id', authenticateToken, requireCompany, async (req, res) => {
  // Validação: req.user.id === job.company_id
});

// DELETE /api/jobs/:id - Deletar (empresa dona)
router.delete('/:id', authenticateToken, requireCompany, async (req, res) => {
  // ...
});

export default router;
```

### Convenções:
- **REST**: GET (listar/um), POST (criar), PUT (atualizar), DELETE (deletar), PATCH (atualizar parcial)
- **Validação**: express-validator em cada endpoint
- **Autenticação**: Middleware Chain - `authenticateToken` → `requireRole` → handler
- **Erros**: `{ error: string, code: 'CODE', details?: string }`
- **Sucesso**: `{ data: object }` ou `{ [resource]: object }`

### Rotas Registradas (21 módulos):
```
/api/auth               → autenticação e tokens
/api/users              → perfil e gestão de usuários
/api/resumes            → currículos
/api/jobs               → vagas
/api/applications       → candidaturas
/api/favorites          → candidatos salvos (por empresa)
/api/interactions       → interações empresa-candidato
/api/messages           → mensagens diretas
/api/chat               → chat
/api/schools            → escolas
/api/school-posts       → posts de escolas
/api/student-posts      → posts de alunos
/api/students           → visualizações de perfil
/api/social-feed        → feed social
/api/journey            → onboarding
/api/job-alerts         → alertas de vagas
/api/saved-jobs         → vagas salvas
/api/agency             → agências
/api/ai                 → análise IA de CVs
/api/notifications      → notificações
/api/external-jobs      → vagas externas
```

---

## 5️⃣ TABELAS/COLUNAS DE PLANOS, VERIFICAÇÃO E PAGAMENTOS

### ✅ Implementado:

#### Tabela `users` - Colunas de Subscription:
```sql
subscription_plan       VARCHAR(20) DEFAULT 'free'
subscription_status     VARCHAR(20) DEFAULT 'active'
```

#### Tabela `users` - Verificação:
```sql
is_verified             BOOLEAN DEFAULT FALSE  -- Verificação de empresa
```

### ❌ NÃO Encontrado:

#### Tabelas Faltantes:
- ❌ `subscriptions` - Nenhuma tabela separada de planos
- ❌ `payments` - Nenhuma tabela de pagamentos
- ❌ `billing` - Nenhuma tabela de faturamento
- ❌ `verification_requests` - Nenhuma tabela de verificação

### ⚠️ Observações Críticas:

1. **Planos Sem Lógica Comercial**: 
   - Colunas existem mas não têm lógica de cobrança
   - Comentário em `routes/users.js` linha 27: "Plano premium para todas empresas - verificação removida"

2. **Verificação Incompleta**:
   - `is_verified` adicionada apenas em `jobs.js` (lazy migration)
   - Não está no schema inicial (`db_init.sql`)
   - Sem endpoint de validação de CNPJ ou verificação manual

3. **Sem Integração de Pagamento**:
   - Stripe, PayPal, ou similar não encontrados
   - Sem tabela de historico de pagamentos
   - Sem lógica de downgrade/upgrade de plano

4. **Destaque Premium** (Implementado Parcialmente):
   - Tabela `job_company_highlights` existe (para vagas destacadas)
   - Mas sem validação se empresa tem plano premium
   - Query comentada em `jobs.js` linha 93

### 📊 Estrutura de Destaque (Se implementado):
```sql
CREATE TABLE job_company_highlights (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  company_id UUID NOT NULL,  -- empresa que pagou
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔗 ARQUIVOS-CHAVE PARA REFERÊNCIA

| Arquivo | Linha | Conteúdo |
|---------|-------|----------|
| `backend/db_init.sql` | 1-50 | Schema completo da tabela `users` |
| `backend/server.js` | 1-150 | Registro de todas as 21 rotas |
| `backend/middleware/auth.js` | 1-150 | 6 middlewares de autenticação |
| `backend/routes/auth.js` | 180-250 | Login com subscription_plan/status |
| `backend/routes/users.js` | 420-430 | Adição dinâmica de company_sector/size |
| `backend/routes/jobs.js` | 1240-1270 | Adição dinâmica de is_verified |
| `backend/routes/applications.js` | 1-50 | Campos de entrevista (dinâmicos) |

---

## 🎯 CONCLUSÃO

| Aspecto | Status | Notas |
|--------|--------|-------|
| **Schema de Users** | ✅ Completo | 20+ colunas (muitas dinâmicas) |
| **Tabela Companies** | ❌ Não existe | Usando `type='company'` em users |
| **Autenticação** | ✅ Implementado | JWT 7d + Refresh 30d |
| **Middlewares** | ✅ Robusto | 6 tipos diferentes |
| **Padrão de Rotas** | ✅ Consistente | REST + validação centralizada |
| **Planos/Subscription** | ⚠️ Parcial | Colunas existem, sem lógica comercial |
| **Verificação** | ⚠️ Parcial | Coluna existe, sem validação |
| **Pagamentos** | ❌ Não existe | Nenhuma tabela ou lógica |

