-- =====================================================
-- MIGRATION PHASE 3 - ADVANCED FINANCIAL MANAGEMENT
-- =====================================================
-- Created: 2024
-- Description: Adds expense tracking, financial goals, 
--              receipt issuance, and payment integrations
-- =====================================================

-- ============ TABLE: categorias_despesas ============
-- Categories for expense organization
CREATE TABLE IF NOT EXISTS categorias_despesas (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  cor VARCHAR(7) DEFAULT '#ef4444', -- Hex color code
  icone VARCHAR(50), -- Icon name/class
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for active categories ordered by ordem
CREATE INDEX IF NOT EXISTS idx_categorias_despesas_ativa_ordem 
ON categorias_despesas(ativa, ordem);

-- Comments
COMMENT ON TABLE categorias_despesas IS 'Categorias para organização de despesas';
COMMENT ON COLUMN categorias_despesas.cor IS 'Cor em formato hexadecimal (#RRGGBB)';
COMMENT ON COLUMN categorias_despesas.icone IS 'Nome do ícone para representação visual';

-- Insert default categories
INSERT INTO categorias_despesas (nome, descricao, cor, icone, ordem) VALUES
  ('Aluguel', 'Aluguel do espaço físico', '#8b5cf6', 'home', 1),
  ('Salários', 'Folha de pagamento e encargos', '#ef4444', 'users', 2),
  ('Marketing', 'Publicidade e divulgação', '#3b82f6', 'megaphone', 3),
  ('Material', 'Material de consumo e uso', '#10b981', 'package', 4),
  ('Equipamentos', 'Aquisição e manutenção de equipamentos', '#f59e0b', 'wrench', 5),
  ('Outros', 'Despesas diversas', '#6b7280', 'more-horizontal', 6)
ON CONFLICT (nome) DO NOTHING;

-- ============ TABLE: despesas ============
-- Expense tracking with categories and recurring options
CREATE TABLE IF NOT EXISTS despesas (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  categoria_id BIGINT NOT NULL REFERENCES categorias_despesas(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  forma_pagamento VARCHAR(50), -- Dinheiro, PIX, Cartão, Boleto, etc.
  anexo_url TEXT, -- URL to receipt/attachment in Supabase Storage
  recorrente BOOLEAN NOT NULL DEFAULT false,
  frequencia_recorrencia VARCHAR(20), -- mensal, trimestral, anual
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT despesas_valor_positivo CHECK (valor > 0),
  CONSTRAINT despesas_recorrencia_check CHECK (
    (recorrente = true AND frequencia_recorrencia IS NOT NULL) OR
    (recorrente = false)
  ),
  CONSTRAINT despesas_frequencia_check CHECK (
    frequencia_recorrencia IS NULL OR
    frequencia_recorrencia IN ('mensal', 'trimestral', 'anual')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria_id ON despesas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_despesas_forma_pagamento ON despesas(forma_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_recorrente ON despesas(recorrente);
CREATE INDEX IF NOT EXISTS idx_despesas_data_categoria ON despesas(data DESC, categoria_id);

-- Comments
COMMENT ON TABLE despesas IS 'Registro de despesas com categorização e opções de recorrência';
COMMENT ON COLUMN despesas.anexo_url IS 'URL do comprovante/anexo armazenado no Supabase Storage';
COMMENT ON COLUMN despesas.recorrente IS 'Indica se é uma despesa recorrente';
COMMENT ON COLUMN despesas.frequencia_recorrencia IS 'Frequência da recorrência: mensal, trimestral ou anual';

-- ============ TABLE: metas ============
-- Financial goals and projections
CREATE TABLE IF NOT EXISTS metas (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL, -- receita, despesa, lucro
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  valor_alvo DECIMAL(10, 2) NOT NULL,
  periodo VARCHAR(20) NOT NULL, -- mensal, trimestral, anual
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativa', -- ativa, pausada, concluida
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT metas_tipo_check CHECK (tipo IN ('receita', 'despesa', 'lucro')),
  CONSTRAINT metas_periodo_check CHECK (periodo IN ('mensal', 'trimestral', 'anual')),
  CONSTRAINT metas_status_check CHECK (status IN ('ativa', 'pausada', 'concluida')),
  CONSTRAINT metas_valor_positivo CHECK (valor_alvo > 0),
  CONSTRAINT metas_datas_check CHECK (data_fim > data_inicio)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metas_periodo ON metas(periodo);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);
CREATE INDEX IF NOT EXISTS idx_metas_data_inicio ON metas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_metas_data_fim ON metas(data_fim);
CREATE INDEX IF NOT EXISTS idx_metas_tipo_status ON metas(tipo, status);

-- Comments
COMMENT ON TABLE metas IS 'Metas financeiras para receita, despesa ou lucro';
COMMENT ON COLUMN metas.tipo IS 'Tipo de meta: receita, despesa ou lucro';
COMMENT ON COLUMN metas.periodo IS 'Período da meta: mensal, trimestral ou anual';
COMMENT ON COLUMN metas.status IS 'Status da meta: ativa, pausada ou concluída';

-- ============ TABLE: recibos ============
-- Issued receipts for consultations
CREATE TABLE IF NOT EXISTS recibos (
  id BIGSERIAL PRIMARY KEY,
  consulta_id BIGINT REFERENCES consultas(id) ON DELETE SET NULL, -- Optional link to consultation
  cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_recibo VARCHAR(50) NOT NULL UNIQUE,
  data_emissao DATE NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  servico_descricao TEXT NOT NULL,
  observacoes TEXT,
  pdf_url TEXT, -- URL to generated PDF in Supabase Storage
  enviado_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT recibos_valor_positivo CHECK (valor > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recibos_numero ON recibos(numero_recibo);
CREATE INDEX IF NOT EXISTS idx_recibos_cliente_id ON recibos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recibos_data_emissao ON recibos(data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_recibos_consulta_id ON recibos(consulta_id);

-- Comments
COMMENT ON TABLE recibos IS 'Recibos emitidos para clientes';
COMMENT ON COLUMN recibos.numero_recibo IS 'Número único do recibo (gerado automaticamente)';
COMMENT ON COLUMN recibos.pdf_url IS 'URL do PDF do recibo armazenado no Supabase Storage';
COMMENT ON COLUMN recibos.enviado_email IS 'Indica se o recibo foi enviado por email';

-- ============ TABLE: integracoes_pagamento ============
-- Payment gateway integrations (encrypted credentials)
CREATE TABLE IF NOT EXISTS integracoes_pagamento (
  id BIGSERIAL PRIMARY KEY,
  provedor VARCHAR(50) NOT NULL, -- mercadopago, stripe, pagseguro
  nome_configuracao VARCHAR(100) NOT NULL,
  api_key_encrypted TEXT, -- Encrypted API key
  webhook_url TEXT,
  webhook_secret_encrypted TEXT, -- Encrypted webhook secret
  ativa BOOLEAN NOT NULL DEFAULT false,
  ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox', -- sandbox, production
  ultimo_teste TIMESTAMP WITH TIME ZONE,
  teste_status VARCHAR(20), -- sucesso, falha
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT integracoes_provedor_check CHECK (provedor IN ('mercadopago', 'stripe', 'pagseguro')),
  CONSTRAINT integracoes_ambiente_check CHECK (ambiente IN ('sandbox', 'production')),
  CONSTRAINT integracoes_teste_status_check CHECK (
    teste_status IS NULL OR teste_status IN ('sucesso', 'falha')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integracoes_provedor ON integracoes_pagamento(provedor);
CREATE INDEX IF NOT EXISTS idx_integracoes_ativa ON integracoes_pagamento(ativa);
CREATE INDEX IF NOT EXISTS idx_integracoes_ambiente ON integracoes_pagamento(ambiente);

-- Comments
COMMENT ON TABLE integracoes_pagamento IS 'Configurações de integrações com gateways de pagamento';
COMMENT ON COLUMN integracoes_pagamento.api_key_encrypted IS 'Chave de API criptografada';
COMMENT ON COLUMN integracoes_pagamento.webhook_secret_encrypted IS 'Segredo do webhook criptografado';
COMMENT ON COLUMN integracoes_pagamento.ambiente IS 'Ambiente: sandbox (testes) ou production (produção)';

-- ============ TRIGGERS FOR UPDATED_AT ============
-- Auto-update updated_at timestamps

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Categorias despesas
DROP TRIGGER IF EXISTS update_categorias_despesas_updated_at ON categorias_despesas;
CREATE TRIGGER update_categorias_despesas_updated_at
  BEFORE UPDATE ON categorias_despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Despesas
DROP TRIGGER IF EXISTS update_despesas_updated_at ON despesas;
CREATE TRIGGER update_despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Metas
DROP TRIGGER IF EXISTS update_metas_updated_at ON metas;
CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON metas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Integrações pagamento
DROP TRIGGER IF EXISTS update_integracoes_pagamento_updated_at ON integracoes_pagamento;
CREATE TRIGGER update_integracoes_pagamento_updated_at
  BEFORE UPDATE ON integracoes_pagamento
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ ROW LEVEL SECURITY (RLS) ============
-- Enable RLS on all tables

ALTER TABLE categorias_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes_pagamento ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users full access
-- (Adjust according to your security requirements)

-- Categorias despesas policies
DROP POLICY IF EXISTS "Allow authenticated users full access to categorias_despesas" ON categorias_despesas;
CREATE POLICY "Allow authenticated users full access to categorias_despesas"
  ON categorias_despesas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Despesas policies
DROP POLICY IF EXISTS "Allow authenticated users full access to despesas" ON despesas;
CREATE POLICY "Allow authenticated users full access to despesas"
  ON despesas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Metas policies
DROP POLICY IF EXISTS "Allow authenticated users full access to metas" ON metas;
CREATE POLICY "Allow authenticated users full access to metas"
  ON metas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Recibos policies
DROP POLICY IF EXISTS "Allow authenticated users full access to recibos" ON recibos;
CREATE POLICY "Allow authenticated users full access to recibos"
  ON recibos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Integracoes pagamento policies
DROP POLICY IF EXISTS "Allow authenticated users full access to integracoes_pagamento" ON integracoes_pagamento;
CREATE POLICY "Allow authenticated users full access to integracoes_pagamento"
  ON integracoes_pagamento FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============ HELPFUL VIEWS ============

-- View: Despesas por categoria
CREATE OR REPLACE VIEW vw_despesas_por_categoria AS
SELECT 
  c.id AS categoria_id,
  c.nome AS categoria_nome,
  c.cor AS categoria_cor,
  c.icone AS categoria_icone,
  COUNT(d.id) AS total_despesas,
  COALESCE(SUM(d.valor), 0) AS valor_total,
  COALESCE(AVG(d.valor), 0) AS valor_medio
FROM categorias_despesas c
LEFT JOIN despesas d ON c.id = d.categoria_id
WHERE c.ativa = true
GROUP BY c.id, c.nome, c.cor, c.icone
ORDER BY valor_total DESC;

COMMENT ON VIEW vw_despesas_por_categoria IS 'Resumo de despesas agrupadas por categoria';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify all tables were created successfully
-- 3. Check RLS policies are enabled
-- 4. Test with sample data
-- =====================================================
