-- Adicionar coluna read_at na tabela candidate_messages
ALTER TABLE candidate_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
