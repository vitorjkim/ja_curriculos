-- Script para adicionar job_id na tabela favorites e criar tabelas de interações e mensagens

-- Adicionar coluna job_id na tabela favorites
ALTER TABLE favorites ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;

-- Criar tabela de interações das empresas com candidatos
CREATE TABLE IF NOT EXISTS company_interactions (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('interested', 'not_profile', 'interview')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de mensagens/notificações para candidatos
CREATE TABLE IF NOT EXISTS candidate_messages (
  id SERIAL PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('resume_viewed', 'resume_downloaded', 'interaction')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
