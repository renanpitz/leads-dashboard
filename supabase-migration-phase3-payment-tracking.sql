-- =====================================================
-- PHASE 3 ENHANCEMENT: Payment Tracking for Expenses
-- =====================================================
-- This migration adds payment tracking columns to the despesas table
-- allowing users to track which expenses have been paid, when, and for how much.
--
-- FEATURES ADDED:
-- - Mark expenses as paid/unpaid
-- - Track payment date
-- - Track partial payments (valor_pago)
-- - Filter by payment status (Pago/Pendente/Atrasado)
--
-- RUN THIS IN: Supabase Dashboard > SQL Editor
-- =====================================================

-- Add payment tracking columns to despesas table
ALTER TABLE despesas 
  ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_pagamento DATE,
  ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2);

-- Add indexes for performance on payment queries
CREATE INDEX IF NOT EXISTS idx_despesas_pago ON despesas(pago);
CREATE INDEX IF NOT EXISTS idx_despesas_data_pagamento ON despesas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_pago_data ON despesas(pago, data_pagamento);

-- Add check constraint to ensure valor_pago doesn't exceed valor
ALTER TABLE despesas 
  DROP CONSTRAINT IF EXISTS despesas_valor_pago_check;

ALTER TABLE despesas 
  ADD CONSTRAINT despesas_valor_pago_check 
  CHECK (valor_pago IS NULL OR valor_pago <= valor);

-- Add check constraint to ensure data_pagamento is set when pago is true
ALTER TABLE despesas 
  DROP CONSTRAINT IF EXISTS despesas_pagamento_check;

ALTER TABLE despesas 
  ADD CONSTRAINT despesas_pagamento_check 
  CHECK (
    (pago = false) OR 
    (pago = true AND data_pagamento IS NOT NULL)
  );

-- Add comments
COMMENT ON COLUMN despesas.pago IS 'Indica se a despesa foi paga';
COMMENT ON COLUMN despesas.data_pagamento IS 'Data em que a despesa foi paga';
COMMENT ON COLUMN despesas.valor_pago IS 'Valor efetivamente pago (pode ser parcial)';

-- Create a helpful view for payment status
CREATE OR REPLACE VIEW vw_despesas_status_pagamento AS
SELECT
  d.id,
  d.data,
  d.descricao,
  d.valor,
  d.valor_pago,
  d.valor - COALESCE(d.valor_pago, 0) AS saldo,
  d.pago,
  d.data_pagamento,
  d.forma_pagamento,
  c.nome AS categoria_nome,
  c.cor AS categoria_cor,
  CASE
    WHEN d.pago = true THEN 'Pago'
    WHEN d.pago = false AND d.data < CURRENT_DATE THEN 'Atrasado'
    WHEN d.pago = false AND d.data >= CURRENT_DATE THEN 'Pendente'
    ELSE 'Desconhecido'
  END AS status_pagamento,
  CASE
    WHEN d.pago = true THEN 0
    WHEN d.data < CURRENT_DATE THEN CURRENT_DATE - d.data
    ELSE 0
  END AS dias_atraso
FROM despesas d
LEFT JOIN categorias_despesas c ON d.categoria_id = c.id
ORDER BY d.data DESC;

COMMENT ON VIEW vw_despesas_status_pagamento IS 'Visão consolidada de despesas com status de pagamento calculado automaticamente';

-- Create a function to get overdue expenses
CREATE OR REPLACE FUNCTION get_despesas_atrasadas()
RETURNS TABLE (
  id BIGINT,
  data DATE,
  descricao TEXT,
  valor DECIMAL(10,2),
  dias_atraso INTEGER,
  categoria_nome VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.data,
    d.descricao,
    d.valor,
    (CURRENT_DATE - d.data)::INTEGER AS dias_atraso,
    c.nome AS categoria_nome
  FROM despesas d
  LEFT JOIN categorias_despesas c ON d.categoria_id = c.id
  WHERE d.pago = false
    AND d.data < CURRENT_DATE
  ORDER BY dias_atraso DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_despesas_atrasadas() IS 'Retorna todas as despesas atrasadas (não pagas após a data de vencimento)';

-- Create a function to get payment statistics
CREATE OR REPLACE FUNCTION get_estatisticas_pagamento(
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  total_despesas DECIMAL(10,2),
  total_pago DECIMAL(10,2),
  total_pendente DECIMAL(10,2),
  total_atrasado DECIMAL(10,2),
  qtd_despesas BIGINT,
  qtd_pagas BIGINT,
  qtd_pendentes BIGINT,
  qtd_atrasadas BIGINT,
  percentual_pago DECIMAL(5,2)
) AS $$
DECLARE
  v_data_inicio DATE := COALESCE(p_data_inicio, date_trunc('month', CURRENT_DATE)::DATE);
  v_data_fim DATE := COALESCE(p_data_fim, CURRENT_DATE);
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(d.valor), 0) AS total_despesas,
    COALESCE(SUM(CASE WHEN d.pago THEN COALESCE(d.valor_pago, d.valor) ELSE 0 END), 0) AS total_pago,
    COALESCE(SUM(CASE WHEN NOT d.pago AND d.data >= CURRENT_DATE THEN d.valor ELSE 0 END), 0) AS total_pendente,
    COALESCE(SUM(CASE WHEN NOT d.pago AND d.data < CURRENT_DATE THEN d.valor ELSE 0 END), 0) AS total_atrasado,
    COUNT(*) AS qtd_despesas,
    COUNT(*) FILTER (WHERE d.pago) AS qtd_pagas,
    COUNT(*) FILTER (WHERE NOT d.pago AND d.data >= CURRENT_DATE) AS qtd_pendentes,
    COUNT(*) FILTER (WHERE NOT d.pago AND d.data < CURRENT_DATE) AS qtd_atrasadas,
    CASE 
      WHEN SUM(d.valor) > 0 THEN 
        (SUM(CASE WHEN d.pago THEN COALESCE(d.valor_pago, d.valor) ELSE 0 END) * 100.0 / SUM(d.valor))::DECIMAL(5,2)
      ELSE 0
    END AS percentual_pago
  FROM despesas d
  WHERE d.data BETWEEN v_data_inicio AND v_data_fim;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_estatisticas_pagamento(DATE, DATE) IS 'Retorna estatísticas consolidadas de pagamento de despesas para um período';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase Dashboard > SQL Editor
-- 2. Verify new columns exist: SELECT * FROM despesas LIMIT 1;
-- 3. Test the new view: SELECT * FROM vw_despesas_status_pagamento;
-- 4. Test functions: SELECT * FROM get_despesas_atrasadas();
-- 5. Reload the Expense Management component in the app
-- =====================================================
