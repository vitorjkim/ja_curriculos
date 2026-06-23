-- =============================================================================
-- CurrículoJá Database Initialization Script (PostgreSQL)
-- =============================================================================
-- This script creates the complete database schema without Prisma
-- Supports: Railway, Render, Heroku, and local PostgreSQL instances
-- 
-- Run this script if:
-- 1. You're deploying to a new database on Railway/Render
-- 2. You need to reset your local development database
-- 3. You want to manually initialize the database
-- 
-- Usage:
--   psql -U postgres -d your_database < db_init.sql
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE - All user types (candidate, company, admin, school)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(20),
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  type VARCHAR(20) NOT NULL CHECK (type IN ('candidate', 'company', 'admin', 'school')),
  is_admin BOOLEAN DEFAULT FALSE,
  disabled BOOLEAN DEFAULT FALSE,
  profile_image TEXT,  -- Supports base64 and URLs
  bio TEXT,
  subscription_plan VARCHAR(20) DEFAULT 'free',
  subscription_status VARCHAR(20) DEFAULT 'active',
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- RESUMES TABLE - User resumes/curricula
-- =============================================================================
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  template VARCHAR(50) DEFAULT 'default',
  is_public BOOLEAN DEFAULT TRUE,
  personal_info JSONB,
  experience JSONB,
  education JSONB,
  skills JSONB,
  languages JSONB,
  projects JSONB,
  courses JSONB,
  file_hash VARCHAR(64),
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- JOBS TABLE - Job postings
-- =============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  salary_min DECIMAL(10, 2),
  salary_max DECIMAL(10, 2),
  salary_fixed DECIMAL(10, 2),
  location VARCHAR(255),
  area VARCHAR(100),
  subarea VARCHAR(100),
  work_type VARCHAR(50) CHECK (work_type IN ('presencial', 'remoto', 'hibrido')),
  contract_type VARCHAR(50) CHECK (contract_type IN ('clt', 'pj', 'estagio', 'temporario')),
  experience_level VARCHAR(50) CHECK (experience_level IN ('junior', 'pleno', 'senior', 'estagio')),
  is_active BOOLEAN DEFAULT TRUE,
  is_community BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  location_latitude DECIMAL(10, 6),
  location_longitude DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- APPLICATIONS TABLE - Job applications
-- =============================================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  cover_letter TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'interested', 'interview', 'approved', 'rejected')),
  notes TEXT,
  interview_date TIMESTAMP,
  interview_mode VARCHAR(50),
  interview_location VARCHAR(200),
  interview_link TEXT,
  interview_notes TEXT,
  interview_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, candidate_id)
);

-- =============================================================================
-- JOURNEY PROGRESS TABLE - User onboarding/journey tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS journey_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  step_id VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, step_id)
);

-- =============================================================================
-- USER SESSIONS TABLE - JWT refresh tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ACTIVITY LOGS TABLE - Audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FAVORITES TABLE - Companies saving candidates
-- =============================================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NULL REFERENCES jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, candidate_id, job_id)
);

-- =============================================================================
-- COMPANY FOLLOWS TABLE - Candidates following companies
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, company_id)
);

-- =============================================================================
-- SAVED JOBS TABLE - Candidates saving jobs
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, job_id)
);

-- =============================================================================
-- JOB ALERTS TABLE - User job alert subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(255),
  location VARCHAR(255),
  contract_types VARCHAR(255),
  experience_level VARCHAR(50),
  frequency VARCHAR(20) DEFAULT 'weekly',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CONVERSATIONS TABLE - Direct messages between users
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, company_id)
);

-- =============================================================================
-- CONVERSATION MESSAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- STUDENT PROFILE VIEWS TABLE - Track who viewed student profiles
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, company_id)
);

-- =============================================================================
-- SCHOOL POSTS TABLE - Posts by schools
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SCHOOL POST LIKES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES school_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- =============================================================================
-- SCHOOL POST COMMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES school_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  parent_id UUID REFERENCES school_post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SCHOOL COMMENT LIKES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES school_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);

-- =============================================================================
-- STUDENT POSTS TABLE - Posts by students/candidates
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- STUDENT POST LIKES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- =============================================================================
-- STUDENT POST COMMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  parent_id UUID NULL REFERENCES student_post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- STUDENT COMMENT LIKES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES student_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_id)
);

-- =============================================================================
-- PARTNERSHIPS TABLE - Schools and companies partnerships
-- =============================================================================
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partnership_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, company_id)
);

-- =============================================================================
-- SCHOOL CLASSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_name VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SCHOOL CLASS STUDENTS TABLE (junction table)
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, student_id)
);

-- =============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_disabled ON users(disabled);

-- Resumes indexes
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_public ON resumes(is_public);
CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_is_community ON jobs(is_community);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_area ON jobs(area);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

-- Journey indexes
CREATE INDEX IF NOT EXISTS idx_journey_user_id ON journey_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_step_id ON journey_progress(step_id);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- Logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON activity_logs(created_at);

-- Follows and Favorites indexes
CREATE INDEX IF NOT EXISTS idx_company_follows_candidate ON company_follows(candidate_id);
CREATE INDEX IF NOT EXISTS idx_company_follows_company ON company_follows(company_id);
CREATE INDEX IF NOT EXISTS idx_favorites_company ON favorites(company_id);
CREATE INDEX IF NOT EXISTS idx_favorites_candidate ON favorites(candidate_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_candidate ON saved_jobs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job ON saved_jobs(job_id);

-- Job Alerts indexes
CREATE INDEX IF NOT EXISTS idx_job_alerts_user ON job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_enabled ON job_alerts(enabled);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_candidate ON conversations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

-- Profile views indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_student ON student_profile_views(student_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_company ON student_profile_views(company_id);

-- School posts indexes
CREATE INDEX IF NOT EXISTS idx_school_posts_school ON school_posts(school_id);
CREATE INDEX IF NOT EXISTS idx_school_posts_created ON school_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_school_post_likes_post ON school_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_school_post_comments_post ON school_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_school_post_comments_parent ON school_post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_school_comment_likes_comment ON school_comment_likes(comment_id);

-- Student posts indexes
CREATE INDEX IF NOT EXISTS idx_student_posts_candidate ON student_posts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_student_posts_created ON student_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_student_post_likes_post ON student_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_student_post_comments_post ON student_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_student_post_comments_parent ON student_post_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_comment_likes_comment ON student_comment_likes(comment_id);

-- Partnerships indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_school ON partnerships(school_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_company ON partnerships(company_id);

-- School classes indexes
CREATE INDEX IF NOT EXISTS idx_school_classes_school ON school_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_school_class_students_class ON school_class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_school_class_students_student ON school_class_students(student_id);

-- =============================================================================
-- CREATE TRIGGER FUNCTION FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resumes_updated_at ON resumes;
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_alerts_updated_at ON job_alerts;
CREATE TRIGGER update_job_alerts_updated_at BEFORE UPDATE ON job_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partnerships_updated_at ON partnerships;
CREATE TRIGGER update_partnerships_updated_at BEFORE UPDATE ON partnerships 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_school_classes_updated_at ON school_classes;
CREATE TRIGGER update_school_classes_updated_at BEFORE UPDATE ON school_classes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DATABASE INITIALIZATION COMPLETE
-- =============================================================================

-- Summary of created tables:
-- 1. users - All user types (candidate, company, admin, school)
-- 2. resumes - User resumes/curricula
-- 3. jobs - Job postings
-- 4. applications - Job applications
-- 5. journey_progress - User onboarding tracking
-- 6. user_sessions - JWT refresh tokens
-- 7. activity_logs - Audit trail
-- 8. favorites - Companies saving candidates
-- 9. company_follows - Candidates following companies
-- 10. saved_jobs - Candidates saving jobs
-- 11. job_alerts - Job alert subscriptions
-- 12. conversations - Direct messages
-- 13. conversation_messages - Message content
-- 14. student_profile_views - Profile view tracking
-- 15. school_posts - School publications
-- 16. school_post_likes - Likes on school posts
-- 17. school_post_comments - Comments on school posts
-- 18. school_comment_likes - Likes on comments
-- 19. student_posts - Student publications
-- 20. student_post_likes - Likes on student posts
-- 21. student_post_comments - Comments on student posts
-- 22. student_comment_likes - Likes on student comments
-- 23. partnerships - School-company partnerships
-- 24. school_classes - School classes
-- 25. school_class_students - Student enrollments

SELECT 'Database initialization complete!' as message;
