# 🗄️ Database Setup - CurrículoJá

## Overview

CurrículoJá uses **PostgreSQL** with the **`pg`** (node-postgres) driver. There is **NO dependency on Prisma**.

The database is automatically initialized when the backend server starts, creating all necessary tables and indexes.

---

## ✅ What's Already Implemented

### 1. **Connection Management** (`backend/config/database.js`)
- Uses PostgreSQL connection pool with `pg` library
- Supports multiple environment configurations:
  - **Railway**: `DATABASE_URL` (primary)
  - **Alternative Railway**: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
  - **Local Development**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

### 2. **Automatic Table Creation** (`backend/scripts/initDatabase.js`)
- Runs automatically when server starts
- Creates 25 tables with proper constraints and relationships
- Creates indexes for performance
- Creates triggers for `updated_at` timestamp
- Uses `CREATE TABLE IF NOT EXISTS` (idempotent)

### 3. **Data Seeding** (`backend/scripts/seed.js`)
- Runs automatically after table creation
- Only seeds if database is empty
- Creates:
  - Admin user: `admin@curriculoja.com` / `admin123`
  - Example company: `empresa@exemplo.com` / `empresa123`
  - Example candidate: `candidato@exemplo.com` / `candidato123`
  - Sample job posting
  - Sample resume

### 4. **Server Integration** (`backend/server.js`)
- Calls `createTables()` on startup
- Calls `seedDatabase()` on startup
- Gracefully handles database connection failures
- Server continues running even if database is unreachable (degraded mode)

---

## 🚀 Deployment (Railway/Render/Vercel)

### Railway Setup

1. **Create PostgreSQL Add-on in Railway**:
   - Go to your Railway project
   - Click "Add Service"
   - Select "PostgreSQL"
   - Connection string is automatically set as `DATABASE_URL`

2. **No Additional Configuration Needed**:
   - The backend automatically reads `DATABASE_URL`
   - Tables are created on first start
   - No manual migration commands needed

3. **Connection Test**:
   - Visit your backend's `/health` endpoint
   - Should show `"database": "connected"`

---

## 💻 Local Development

### Initial Setup

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS with Homebrew
   brew install postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib

   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Start PostgreSQL Service**:
   ```bash
   # macOS
   brew services start postgresql

   # Linux
   sudo service postgresql start

   # Windows
   # Usually starts automatically
   ```

3. **Create Development Database**:
   ```bash
   psql -U postgres
   CREATE DATABASE curriculoja;
   \q
   ```

4. **Configure `.env` in `backend/` folder**:
   ```env
   NODE_ENV=development
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=curriculoja
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   ```

5. **Start Backend Server**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

   On first run, you'll see:
   ```
   🗄️  Verificando estrutura do banco...
   ✅ Todas as tabelas foram criadas com sucesso!
   🌱 Iniciando seed do banco de dados...
   ✅ Seed concluído com sucesso!
   ```

---

## 📊 Database Schema

### Core Tables

#### `users` (25 columns)
Stores all user types: candidates, companies, admins, schools.
- Essential fields: `id`, `email`, `password`, `name`, `type`, `is_admin`
- Company-specific: `company_name`, `cnpj`
- Candidate-specific: `cpf`
- Optional: `profile_image`, `bio`, `social_links`

#### `jobs` (16 columns)
Job postings by companies.
- Essential: `id`, `company_id`, `title`, `description`
- Salary: `salary_min`, `salary_max`, `salary_fixed`
- Work conditions: `work_type`, `contract_type`, `experience_level`
- Categorization: `area`, `subarea`, `location`

#### `applications` (13 columns)
Job applications by candidates.
- Links: `job_id`, `candidate_id`, `resume_id`
- Status: `pending`, `reviewing`, `interested`, `interview`, `approved`, `rejected`
- Interview tracking: `interview_date`, `interview_mode`, `interview_confirmed`

#### `resumes` (11 columns)
User resumes in JSONB format.
- Template-based: `template`, `title`
- Content as JSONB: `personal_info`, `experience`, `education`, `skills`, `languages`, `projects`, `courses`
- Soft delete support: `deleted_at`

### Social/Community Tables

#### `school_posts` / `student_posts`
- Posts by schools and students
- Support likes, comments, and comment threads

#### `partnerships`
- School-company partnerships
- Stores partnership type and status

#### `school_classes` / `school_class_students`
- Manages school classes and student enrollments

### Support Tables

#### `conversations` / `conversation_messages`
- Direct messaging between candidates and companies

#### `job_alerts`
- Email alerts for job searches

#### `saved_jobs` / `favorites`
- Candidates save jobs
- Companies save candidates

#### `activity_logs`
- Audit trail of all actions

---

## 🔄 Migrations & Updates

### No Prisma Migrations
- We use raw SQL for all operations
- Database structure is defined in `backend/scripts/initDatabase.js`
- Changes are handled by adding `ALTER TABLE` commands if needed

### Manual Schema Updates

If you need to add a new column:

1. **Local Development**:
   ```sql
   ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
   ```

2. **Production (Railway)**:
   - SSH into your Railway PostgreSQL instance
   - Run the `ALTER TABLE` command
   - OR update `initDatabase.js` to include the new column in the `CREATE TABLE` statement

---

## 🔧 Manual Database Operations

### Backup Database

```bash
# Local
pg_dump -U postgres curriculoja > backup_$(date +%Y%m%d).sql

# Railway (from connection string)
pg_dump postgresql://user:password@host:port/db > backup.sql
```

### Restore Database

```bash
# From file
psql -U postgres curriculoja < backup_$(date +%Y%m%d).sql
```

### Reset Development Database

```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS curriculoja;"
psql -U postgres -c "CREATE DATABASE curriculoja;"

# Then restart your server to reinitialize
npm run dev
```

### Run Manual SQL Script

```bash
# Local
psql -U postgres curriculoja < backend/db_init.sql

# Via environment variables
psql $DATABASE_URL < backend/db_init.sql
```

---

## ✨ Features

### Automatic Timestamps
- All tables have `created_at` and `updated_at` timestamps
- `updated_at` is automatically set via database triggers

### Soft Deletes
- `resumes` table supports soft delete with `deleted_at` column
- Can be extended to other tables as needed

### JSONB Support
- `resumes` stores structured data as JSONB
- `users` stores social links as JSONB
- `activity_logs` stores details as JSONB

### Indexes
- Created on all foreign keys and frequently queried columns
- Performance optimized for common queries

### UUID Primary Keys
- All tables use `UUID` instead of auto-incrementing integers
- Better for distributed systems and privacy

---

## 📝 Troubleshooting

### Issue: "relation does not exist"
**Solution**: Database tables weren't created. Restart the server:
```bash
npm run dev
```
Server will automatically create all tables on startup.

### Issue: "password authentication failed"
**Solution**: Check your database credentials in `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=curriculoja
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

### Issue: Port 5432 already in use
**Solution**: PostgreSQL is already running. Either:
- Kill the process: `lsof -ti:5432 | xargs kill -9`
- Or use a different port in `.env`

### Issue: "FATAL: database does not exist"
**Solution**: Create the database:
```bash
psql -U postgres -c "CREATE DATABASE curriculoja;"
```

### Issue: Railway database connection timeout
**Solution**:
1. Check Railway dashboard for PostgreSQL add-on status
2. Verify `DATABASE_URL` is set in Railway environment variables
3. Check firewall rules allow outbound connections on port 5432

---

## 🔍 Health Checks

### Test Database Connection

```bash
# Via API
curl http://localhost:3001/health

# Response should show:
{
  "status": "ok",
  "database": "connected",
  "environment": "development",
  "uptime": 123.45
}
```

### View Database Tables

```bash
# Connect to database
psql -U postgres curriculoja

# List all tables
\dt

# View table structure
\d users

# Exit
\q
```

---

## 📚 Additional Resources

- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **pg Library**: https://node-postgres.com/
- **Railway PostgreSQL**: https://docs.railway.app/guides/postgresql
- **Database Design**: https://www.postgresql.org/docs/current/ddl.html

---

## ✅ Checklist for Production Deployment

- [ ] PostgreSQL add-on created in Railway
- [ ] `DATABASE_URL` environment variable is set
- [ ] Backend `.env` file is configured
- [ ] Server starts without database errors
- [ ] `/health` endpoint returns `"database": "connected"`
- [ ] Sample data is seeded (admin user exists)
- [ ] Backups are configured
- [ ] SSL connections are enforced for remote connections

---

**Last Updated**: 2026-06-22
**Status**: ✅ Production-ready (No Prisma)
