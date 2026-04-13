-- =====================================================
-- ADD PRODUTOS TO CONSULTAS
-- =====================================================
-- Adds a column to store one or more products related to a Consulta/Sessão.
-- Example value: "VPPB, Zumbido"
--
-- RUN THIS IN: Supabase Dashboard > SQL Editor
-- =====================================================

ALTER TABLE consultas
  ADD COLUMN IF NOT EXISTS produtos TEXT;

CREATE INDEX IF NOT EXISTS idx_consultas_produtos ON consultas(produtos);
