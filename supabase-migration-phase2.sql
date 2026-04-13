-- =====================================================
-- MIGRATION PHASE 2 - GESTÃO FINANCEIRA COMPLETA
-- =====================================================
-- Criado em: 2024
-- Descrição: Adiciona controle de parcelas, tabelas de preços,
--            e funcionalidades avançadas de relatórios financeiros
-- =====================================================

-- ============ TABELA: parcelas ============
-- Armazena cada parcela individual das consultas parceladas
-- Permite controle granular de pagamentos e vencimentos

CREATE TABLE IF NOT EXISTS parcelas (
  id BIGSERIAL PRIMARY KEY,
  consulta_id BIGINT NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL, -- Número da parcela (1, 2, 3, etc.)
  valor_parcela DECIMAL(10, 2) NOT NULL, -- Valor desta parcela específica
  data_vencimento DATE NOT NULL, -- Data de vencimento da parcela
  data_pagamento DATE, -- Data efetiva do pagamento (NULL = não pago)
  status VARCHAR(20) NOT NULL DEFAULT 'Pendente', -- Pendente, Pago, Atrasado
  metodo_pagamento VARCHAR(50), -- Como foi pago (pode ser diferente da consulta original)
  observacoes TEXT, -- Notas sobre a parcela
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT parcelas_status_check CHECK (status IN ('Pendente', 'Pago', 'Atrasado')),
  CONSTRAINT parcelas_numero_positivo CHECK (numero_parcela > 0),
  CONSTRAINT parcelas_valor_positivo CHECK (valor_parcela > 0),
  CONSTRAINT parcelas_pagamento_check CHECK (
    (status = 'Pago' AND data_pagamento IS NOT NULL) OR 
    (status != 'Pago' AND data_pagamento IS NULL)
  )
);

-- Índices para performance em parcelas
CREATE INDEX IF NOT EXISTS idx_parcelas_consulta_id ON parcelas(consulta_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento ON parcelas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status_vencimento ON parcelas(status, data_vencimento);

-- Comentários em parcelas
COMMENT ON TABLE parcelas IS 'Armazena parcelas individuais de consultas parceladas para controle de recebíveis';
COMMENT ON COLUMN parcelas.numero_parcela IS 'Número sequencial da parcela (1 de 3, 2 de 3, etc.)';
COMMENT ON COLUMN parcelas.status IS 'Status da parcela: Pendente (não pago), Pago (quitado), Atrasado (vencido e não pago)';
COMMENT ON COLUMN parcelas.data_vencimento IS 'Data de vencimento programada da parcela';
COMMENT ON COLUMN parcelas.data_pagamento IS 'Data efetiva do pagamento (NULL = ainda não pago)';

-- ============ TABELA: tabelas_precos ============
-- Armazena diferentes tabelas de preço (ex: Convênio A, Particular, Promoção)
-- Permite criar múltiplas tabelas de preço para diferentes cenários

CREATE TABLE IF NOT EXISTS tabelas_precos (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE, -- Nome da tabela (ex: "Particular", "Convênio X")
  descricao TEXT, -- Descrição da tabela de preços
  ativa BOOLEAN NOT NULL DEFAULT true, -- Se está ativa para uso
  padrao BOOLEAN NOT NULL DEFAULT false, -- Se é a tabela padrão
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Garantir que apenas uma tabela seja padrão
CREATE UNIQUE INDEX IF NOT EXISTS idx_tabelas_precos_padrao_unica 
  ON tabelas_precos(padrao) WHERE padrao = true;

-- Índices para performance em tabelas_precos
CREATE INDEX IF NOT EXISTS idx_tabelas_precos_ativa ON tabelas_precos(ativa);
CREATE INDEX IF NOT EXISTS idx_tabelas_precos_nome ON tabelas_precos(nome);

-- Comentários em tabelas_precos
COMMENT ON TABLE tabelas_precos IS 'Armazena diferentes tabelas de preços (Particular, Convênios, Promoções, etc.)';
COMMENT ON COLUMN tabelas_precos.ativa IS 'Define se a tabela está disponível para uso';
COMMENT ON COLUMN tabelas_precos.padrao IS 'Define se esta é a tabela de preços padrão (apenas uma pode ser padrão)';

-- ============ TABELA: itens_tabela_precos ============
-- Armazena os preços específicos de cada serviço em cada tabela de preços

CREATE TABLE IF NOT EXISTS itens_tabela_precos (
  id BIGSERIAL PRIMARY KEY,
  tabela_preco_id BIGINT NOT NULL REFERENCES tabelas_precos(id) ON DELETE CASCADE,
  tipo_servico VARCHAR(50) NOT NULL, -- 'Consulta' ou 'Sessão'
  descricao VARCHAR(200) NOT NULL, -- Descrição do serviço
  valor DECIMAL(10, 2) NOT NULL, -- Preço do serviço nesta tabela
  ordem INTEGER DEFAULT 0, -- Ordem de exibição
  ativo BOOLEAN NOT NULL DEFAULT true, -- Se o item está ativo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT itens_tipo_check CHECK (tipo_servico IN ('Consulta', 'Sessão')),
  CONSTRAINT itens_valor_positivo CHECK (valor >= 0),
  CONSTRAINT itens_tabela_tipo_desc_unique UNIQUE (tabela_preco_id, tipo_servico, descricao)
);

-- Índices para performance em itens_tabela_precos
CREATE INDEX IF NOT EXISTS idx_itens_tabela_id ON itens_tabela_precos(tabela_preco_id);
CREATE INDEX IF NOT EXISTS idx_itens_tipo ON itens_tabela_precos(tipo_servico);
CREATE INDEX IF NOT EXISTS idx_itens_ativo ON itens_tabela_precos(ativo);
CREATE INDEX IF NOT EXISTS idx_itens_ordem ON itens_tabela_precos(ordem);

-- Comentários em itens_tabela_precos
COMMENT ON TABLE itens_tabela_precos IS 'Itens de preço (serviços) associados a cada tabela de preços';
COMMENT ON COLUMN itens_tabela_precos.tipo_servico IS 'Tipo do serviço: Consulta ou Sessão';
COMMENT ON COLUMN itens_tabela_precos.valor IS 'Valor do serviço nesta tabela de preços';
COMMENT ON COLUMN itens_tabela_precos.ordem IS 'Ordem de exibição do item na lista (menor = primeiro)';

-- ============ TRIGGERS ============

-- Trigger para atualizar updated_at em parcelas
CREATE OR REPLACE FUNCTION update_parcelas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcelas_updated_at
  BEFORE UPDATE ON parcelas
  FOR EACH ROW
  EXECUTE FUNCTION update_parcelas_timestamp();

-- Trigger para atualizar updated_at em tabelas_precos
CREATE OR REPLACE FUNCTION update_tabelas_precos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tabelas_precos_updated_at
  BEFORE UPDATE ON tabelas_precos
  FOR EACH ROW
  EXECUTE FUNCTION update_tabelas_precos_timestamp();

-- Trigger para atualizar updated_at em itens_tabela_precos
CREATE OR REPLACE FUNCTION update_itens_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER itens_tabela_precos_updated_at
  BEFORE UPDATE ON itens_tabela_precos
  FOR EACH ROW
  EXECUTE FUNCTION update_itens_timestamp();

-- Trigger para atualizar status de parcelas atrasadas automaticamente
CREATE OR REPLACE FUNCTION update_parcelas_atrasadas()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a parcela está pendente e passou da data de vencimento, marcar como atrasada
  IF NEW.status = 'Pendente' AND NEW.data_vencimento < CURRENT_DATE THEN
    NEW.status = 'Atrasado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcelas_check_atrasadas
  BEFORE INSERT OR UPDATE ON parcelas
  FOR EACH ROW
  EXECUTE FUNCTION update_parcelas_atrasadas();

-- ============ FUNÇÃO AUXILIAR ============
-- Função para atualizar status de todas as parcelas atrasadas (executar periodicamente)

CREATE OR REPLACE FUNCTION marcar_parcelas_atrasadas()
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE parcelas
  SET status = 'Atrasado'
  WHERE status = 'Pendente'
    AND data_vencimento < CURRENT_DATE;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION marcar_parcelas_atrasadas IS 'Atualiza status de parcelas vencidas para Atrasado. Executar diariamente via cron job.';

-- ============ DADOS INICIAIS ============
-- Criar tabela de preços padrão

INSERT INTO tabelas_precos (nome, descricao, ativa, padrao)
VALUES 
  ('Particular', 'Tabela de preços para atendimento particular', true, true),
  ('Convênio', 'Tabela de preços para convênios', true, false)
ON CONFLICT (nome) DO NOTHING;

-- Inserir itens de exemplo na tabela padrão
WITH tabela_padrao AS (
  SELECT id FROM tabelas_precos WHERE padrao = true LIMIT 1
)
INSERT INTO itens_tabela_precos (tabela_preco_id, tipo_servico, descricao, valor, ordem, ativo)
SELECT 
  tp.id,
  'Consulta',
  'Consulta Inicial',
  150.00,
  1,
  true
FROM tabela_padrao tp
ON CONFLICT (tabela_preco_id, tipo_servico, descricao) DO NOTHING;

WITH tabela_padrao AS (
  SELECT id FROM tabelas_precos WHERE padrao = true LIMIT 1
)
INSERT INTO itens_tabela_precos (tabela_preco_id, tipo_servico, descricao, valor, ordem, ativo)
SELECT 
  tp.id,
  'Sessão',
  'Sessão de Fisioterapia',
  120.00,
  2,
  true
FROM tabela_padrao tp
ON CONFLICT (tabela_preco_id, tipo_servico, descricao) DO NOTHING;

-- ============ POLICIES RLS (Row Level Security) ============
-- Ativar RLS nas novas tabelas

ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabelas_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_tabela_precos ENABLE ROW LEVEL SECURITY;

-- Políticas para parcelas (acesso completo para usuários autenticados)
CREATE POLICY "Usuários autenticados podem visualizar parcelas"
  ON parcelas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem inserir parcelas"
  ON parcelas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar parcelas"
  ON parcelas FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar parcelas"
  ON parcelas FOR DELETE
  USING (auth.role() = 'authenticated');

-- Políticas para tabelas_precos
CREATE POLICY "Usuários autenticados podem visualizar tabelas de preços"
  ON tabelas_precos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem inserir tabelas de preços"
  ON tabelas_precos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar tabelas de preços"
  ON tabelas_precos FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar tabelas de preços"
  ON tabelas_precos FOR DELETE
  USING (auth.role() = 'authenticated');

-- Políticas para itens_tabela_precos
CREATE POLICY "Usuários autenticados podem visualizar itens de preços"
  ON itens_tabela_precos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem inserir itens de preços"
  ON itens_tabela_precos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar itens de preços"
  ON itens_tabela_precos FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar itens de preços"
  ON itens_tabela_precos FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============ FIM DA MIGRATION ============
-- Para executar: Cole este SQL no SQL Editor do Supabase
-- Verificação: SELECT * FROM parcelas, tabelas_precos, itens_tabela_precos;
