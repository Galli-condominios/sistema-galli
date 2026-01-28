-- Adicionar campo 'block' na tabela units
ALTER TABLE units ADD COLUMN IF NOT EXISTS block TEXT;

-- Adicionar campo 'total_units' na tabela condominiums
ALTER TABLE condominiums ADD COLUMN IF NOT EXISTS total_units INTEGER;