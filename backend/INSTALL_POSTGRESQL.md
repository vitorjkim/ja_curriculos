# 🗃️ Guia de Instalação - PostgreSQL no Windows

## 📥 Opção 1: Download Direto (Recomendado)

### 1. Baixar PostgreSQL:
- Acesse: https://www.postgresql.org/download/windows/
- Baixe a versão mais recente (Windows x86-64)
- Execute o instalador

### 2. Durante a Instalação:
- **Senha do superuser (postgres):** `postgres` (ou anote a sua)
- **Porta:** `5432` (padrão)
- **Locale:** `Portuguese, Brazil` ou `Default locale`

### 3. Após Instalação:
```powershell
# Adicionar ao PATH (se não foi automático)
# Abrir PowerShell como Administrador:
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Testar instalação
psql --version
```

## 📥 Opção 2: Via Chocolatey

### 1. Instalar Chocolatey primeiro:
```powershell
# Executar como Administrador no PowerShell:
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Instalar PostgreSQL:
```powershell
choco install postgresql
```

## 🚀 Configurar Banco de Dados

### 1. Conectar ao PostgreSQL:
```powershell
# Conectar como superuser
psql -U postgres
```

### 2. Criar banco e usuário:
```sql
-- Criar banco de dados
CREATE DATABASE curriculoja;

-- Verificar se foi criado
\l

-- Conectar ao banco
\c curriculoja

-- Sair
\q
```

### 3. Testar conexão:
```powershell
psql -U postgres -d curriculoja
```

## ⚡ Iniciar o Backend

### 1. Navegar para o backend:
```powershell
cd "c:\Users\operscti\Downloads\horizons-export-61e972b8-9ac9-42b9-882d-870d540185d9\backend"
```

### 2. Verificar/editar .env:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curriculoja
DB_USER=postgres
DB_PASSWORD=postgres  # Sua senha do PostgreSQL
```

### 3. Inicializar banco:
```powershell
npm run init-db
npm run seed
```

### 4. Iniciar servidor:
```powershell
npm run dev
```

## 🔧 Troubleshooting

### PostgreSQL não inicia:
```powershell
# Iniciar serviço do PostgreSQL
net start postgresql-x64-16

# Ou verificar serviços
services.msc
```

### Erro de autenticação:
```powershell
# Resetar senha do postgres
# 1. Localizar pg_hba.conf em: C:\Program Files\PostgreSQL\16\data\
# 2. Alterar 'md5' para 'trust' temporariamente
# 3. Reiniciar serviço PostgreSQL
# 4. Conectar sem senha e alterar:
psql -U postgres
ALTER USER postgres PASSWORD 'nova_senha';
# 5. Reverter pg_hba.conf para 'md5'
# 6. Reiniciar serviço
```

### Porta em uso:
```powershell
# Verificar o que está usando a porta 5432
netstat -ano | findstr :5432

# Parar processo se necessário
taskkill /F /PID [NUMERO_DO_PID]
```

## 🎯 URLs Importantes

- **PgAdmin** (interface gráfica): http://localhost:5050
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

## 🔑 Usuários Padrão

Após executar `npm run seed`:

- **Admin**: admin@curriculoja.com / admin123
- **Empresa**: empresa@exemplo.com / empresa123  
- **Candidato**: candidato@exemplo.com / candidato123
