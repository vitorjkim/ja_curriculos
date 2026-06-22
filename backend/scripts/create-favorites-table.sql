-- Script para criar tabela favorites

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
