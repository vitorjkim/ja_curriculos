# CurriculoJá Backend API

Backend Node.js + Express + PostgreSQL para o sistema CurriculoJá.

## 🚀 Instalação

### 1. Instalar PostgreSQL

**Windows:**
```bash
# Baixar e instalar do site oficial: https://www.postgresql.org/download/windows/
# Ou via Chocolatey:
choco install postgresql

# Ou via Scoop:
scoop install postgresql
```

**Verificar instalação:**
```bash
psql --version
```

### 2. Configurar Banco de Dados

```bash
# Conectar ao PostgreSQL como superuser
psql -U postgres

# Criar banco de dados
CREATE DATABASE curriculoja;

# Criar usuário (opcional)
CREATE USER curriculoja_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE curriculoja TO curriculoja_user;

# Sair
\q
```

### 3. Instalar Dependências

```bash
cd backend
npm install
```

### 4. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
```

Exemplo do `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curriculoja
DB_USER=postgres
DB_PASSWORD=sua_senha_do_postgres

JWT_SECRET=uma_chave_jwt_super_secreta_e_longa_aqui

PORT=3001
NODE_ENV=development

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### 5. Inicializar Banco

```bash
# Criar tabelas
npm run init-db

# Popular com dados iniciais
npm run seed
```

### 6. Executar

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário atual

### Usuários (Admin)
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Obter usuário específico
- `PUT /api/users/:id` - Atualizar usuário
- `PATCH /api/users/:id/toggle-status` - Habilitar/desabilitar
- `DELETE /api/users/:id` - Deletar usuário
- `POST /api/users/bulk-action` - Ações em lote

### Sistema
- `GET /health` - Status da API
- `GET /` - Informações da API

## 🔑 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação.

### Headers necessários:
```
Authorization: Bearer <seu_jwt_token>
Content-Type: application/json
```

### Tipos de usuário:
- `candidate` - Candidato
- `company` - Empresa  
- `admin` - Administrador

## 📊 Estrutura do Banco

### Tabelas principais:
- `users` - Usuários do sistema
- `resumes` - Currículos dos candidatos
- `jobs` - Vagas das empresas
- `applications` - Candidaturas
- `journey_progress` - Progresso da jornada
- `user_sessions` - Sessões de usuário
- `activity_logs` - Logs de atividade

## 🛡️ Segurança

### Implementado:
- ✅ Rate limiting
- ✅ CORS configurado  
- ✅ Helmet para headers de segurança
- ✅ Validação de dados
- ✅ Hash de senhas com bcrypt
- ✅ JWT com expiração
- ✅ Logs de atividade
- ✅ Middleware de autenticação
- ✅ Proteção contra SQL injection

## 🧪 Usuários de Teste

**Administrador:**
- Email: `admin@curriculoja.com`
- Senha: `admin123`

**Empresa:**
- Email: `empresa@exemplo.com`
- Senha: `empresa123`

**Candidato:**
- Email: `candidato@exemplo.com`
- Senha: `candidato123`

## 📝 Logs

Os logs incluem:
- Requests HTTP (Morgan)
- Ações de usuário
- Erros do sistema
- Conexões com banco

## 🔧 Scripts Disponíveis

```bash
npm start          # Iniciar servidor
npm run dev        # Desenvolvimento com nodemon
npm run init-db    # Criar estrutura do banco
npm run seed       # Popular dados iniciais
```

## 🌍 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_HOST` | Host do PostgreSQL | localhost |
| `DB_PORT` | Porta do PostgreSQL | 5432 |
| `DB_NAME` | Nome do banco | curriculoja |
| `DB_USER` | Usuário do banco | postgres |
| `DB_PASSWORD` | Senha do banco | - |
| `JWT_SECRET` | Chave secreta JWT | - |
| `PORT` | Porta do servidor | 3001 |
| `NODE_ENV` | Ambiente | development |
| `ALLOWED_ORIGINS` | Origins CORS | localhost:5173,localhost:5174 |

## 🔍 Troubleshooting

### Erro de conexão PostgreSQL:
```bash
# Verificar se PostgreSQL está rodando
pg_isready -h localhost -p 5432

# Iniciar PostgreSQL (Windows)
net start postgresql-x64-14
```

### Erro de permissões:
```sql
-- Conectar como superuser e dar permissões
GRANT ALL PRIVILEGES ON DATABASE curriculoja TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seu_usuario;
```

### Resetar banco:
```bash
# Dropar e recriar banco
psql -U postgres -c "DROP DATABASE IF EXISTS curriculoja;"
psql -U postgres -c "CREATE DATABASE curriculoja;"
npm run init-db
npm run seed
```

## 📞 Suporte

Para problemas ou dúvidas, verifique:
1. Configurações do `.env`
2. PostgreSQL rodando
3. Permissões do banco
4. Logs do servidor
5. Documentação da API
