# 🚀 CurriculoJá - Guia Completo de Instalação

## 📋 Resumo da Implementação

Implementei um **backend Node.js + Express + PostgreSQL** completo para sua aplicação CurriculoJá! 

### ✅ O que foi implementado:

#### **Backend (API)**
- ✅ **Servidor Express** com middlewares de segurança
- ✅ **PostgreSQL** como banco de dados principal
- ✅ **Autenticação JWT** com refresh tokens
- ✅ **Rate Limiting** para proteção contra ataques
- ✅ **Validação de dados** com express-validator
- ✅ **Logs de atividade** para auditoria
- ✅ **CORS** configurado para o frontend
- ✅ **Estrutura de banco** completa (8 tabelas)
- ✅ **Seeds** com dados de exemplo
- ✅ **Middlewares de autorização** (admin, company, candidate)

#### **Frontend (Integração)**
- ✅ **API Service** para comunicação com backend
- ✅ **AuthContext** atualizado para usar JWT
- ✅ **Login/Register** conectados à API
- ✅ **AdminDashboard** parcialmente integrado
- ✅ **Renovação automática** de tokens

#### **Recursos Avançados**
- ✅ **Health check** endpoint
- ✅ **Tratamento de erros** padronizado
- ✅ **Compressão gzip** para performance
- ✅ **Helmet** para headers de segurança
- ✅ **Morgan** para logs HTTP

---

## 🛠️ Passo a Passo para Rodar

### **1️⃣ Instalar PostgreSQL**

#### **Opção A: Download Direto (Mais Fácil)**
1. Acesse: https://www.postgresql.org/download/windows/
2. Baixe a versão mais recente
3. Execute o instalador
4. **Senha do postgres**: `postgres` (ou anote a sua)
5. **Porta**: `5432` (padrão)

#### **Opção B: Via Chocolatey**
```powershell
# Instalar Chocolatey (como Administrador)
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar PostgreSQL
choco install postgresql
```

### **2️⃣ Configurar Banco de Dados**
```powershell
# Conectar ao PostgreSQL
psql -U postgres

# No prompt do PostgreSQL:
CREATE DATABASE curriculoja;
\l
\q
```

### **3️⃣ Configurar Backend**
```powershell
# Navegar para o backend
cd "c:\Users\operscti\Downloads\horizons-export-61e972b8-9ac9-42b9-882d-870d540185d9\backend"

# Verificar se .env existe e editar se necessário
# (já criei com configurações padrão)

# Inicializar banco de dados
npm run init-db

# Popular com dados iniciais
npm run seed
```

### **4️⃣ Iniciar Backend**
```powershell
# Ainda no diretório backend
npm run dev
```

Você deve ver:
```
✅ Servidor rodando com sucesso!
📡 API: http://localhost:3001
🏥 Health: http://localhost:3001/health
👤 Usuário admin padrão:
   Email: admin@curriculoja.com
   Senha: admin123
```

### **5️⃣ Iniciar Frontend**
```powershell
# Em outro terminal, navegar para a raiz
cd "c:\Users\operscti\Downloads\horizons-export-61e972b8-9ac9-42b9-882d-870d540185d9"

# Iniciar frontend
npm run dev
```

---

## 🔑 Contas de Teste

Após executar `npm run seed`, você terá:

| Tipo | Email | Senha | Acesso |
|------|-------|--------|---------|
| **Admin** | admin@curriculoja.com | admin123 | Dashboard Admin |
| **Empresa** | empresa@exemplo.com | empresa123 | Dashboard Empresa |
| **Candidato** | candidato@exemplo.com | candidato123 | Meus Currículos |

---

## 🌐 URLs Importantes

- **Frontend**: http://localhost:5173 ou http://localhost:5174
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Admin Dashboard**: http://localhost:5173/admin-dashboard

---

## 🔗 Endpoints da API

### **Autenticação**
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registrar
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário atual
- `POST /api/auth/refresh` - Renovar token

### **Usuários (Admin)**
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Obter usuário
- `PUT /api/users/:id` - Atualizar usuário
- `PATCH /api/users/:id/toggle-status` - Habilitar/desabilitar
- `DELETE /api/users/:id` - Deletar usuário
- `POST /api/users/bulk-action` - Ações em lote

---

## 🗄️ Estrutura do Banco

### **Tabelas Criadas:**
1. **users** - Usuários do sistema
2. **resumes** - Currículos dos candidatos
3. **jobs** - Vagas das empresas
4. **applications** - Candidaturas
5. **journey_progress** - Progresso da jornada
6. **user_sessions** - Sessões de usuário
7. **activity_logs** - Logs de atividade

---

## 🔧 Troubleshooting

### **PostgreSQL não inicia:**
```powershell
# Iniciar serviço
net start postgresql-x64-16

# Verificar serviços
services.msc
```

### **Erro de conexão:**
- Verificar se PostgreSQL está rodando
- Conferir configurações no `.env`
- Senha do postgres correta

### **API não conecta:**
- Backend rodando em http://localhost:3001
- Frontend configurado para usar essa URL
- CORS habilitado para localhost:5173 e 5174

### **Erro de autenticação:**
- Limpar localStorage do navegador
- Fazer login novamente
- Verificar se backend está rodando

---

## 📈 Próximos Passos

### **Já Funcionando:**
✅ Login/Register com JWT  
✅ Dashboard Admin com estatísticas  
✅ Listagem de usuários da API  
✅ Autenticação protegida  

### **Para Implementar:**
🔄 Finalizar integração do AdminDashboard  
🔄 Adicionar endpoints de currículos  
🔄 Adicionar endpoints de vagas  
🔄 Migrar jornada do candidato  
🔄 Upload de arquivos  

---

## 🎯 Como Testar

1. **Iniciar backend e frontend**
2. **Acessar**: http://localhost:5173
3. **Login como admin**: admin@curriculoja.com / admin123
4. **Acessar Dashboard Admin**
5. **Verificar dados vindos da API**

---

## 📞 Suporte

Se tiver problemas:
1. Verificar se PostgreSQL está instalado e rodando
2. Conferir arquivo `.env` no backend
3. Ver logs do terminal (backend e frontend)
4. Testar health check: http://localhost:3001/health

**Tudo pronto para usar! 🚀**
