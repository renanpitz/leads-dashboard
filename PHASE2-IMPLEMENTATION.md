# 📊 Phase 2 - Sistema de Gestão Financeira Completo

## ✅ Implementação Concluída

A Fase 2 do sistema de gestão financeira foi implementada com sucesso, adicionando funcionalidades avançadas de controle de recebíveis, tabelas de preços e relatórios detalhados.

---

## 📁 Arquivos Criados/Modificados

### 1. **Migration SQL**
- `supabase-migration-phase2.sql` - Script completo de criação das tabelas

### 2. **Biblioteca Supabase**
- `lib/supabase.ts` - ✅ Atualizado com novas interfaces e funções

### 3. **Novos Componentes**
- `components/receivables-control.tsx` - Controle de recebíveis (parcelas)
- `components/price-table-manager.tsx` - Gerenciador de tabelas de preços
- `components/revenue-reports.tsx` - Relatórios avançados de receita
- `components/service-analysis.tsx` - Análise de serviços
- `components/ui/tabs.tsx` - Componente de abas (shadcn/ui)

### 4. **Componentes Atualizados**
- `components/financial-dashboard.tsx` - ✅ Integrado com sistema de abas

---

## 🗄️ Estrutura do Banco de Dados

### Novas Tabelas

#### 1. **parcelas**
Armazena cada parcela individual das consultas parceladas.

**Colunas principais:**
- `id` - ID único da parcela
- `consulta_id` - Referência à consulta
- `numero_parcela` - Número da parcela (1, 2, 3...)
- `valor_parcela` - Valor desta parcela
- `data_vencimento` - Data de vencimento
- `data_pagamento` - Data efetiva do pagamento (NULL = não pago)
- `status` - Pendente | Pago | Atrasado
- `metodo_pagamento` - Como foi pago

**Índices criados:**
- `idx_parcelas_consulta_id`
- `idx_parcelas_status`
- `idx_parcelas_vencimento`
- `idx_parcelas_status_vencimento`

#### 2. **tabelas_precos**
Diferentes tabelas de preço (Particular, Convênios, etc.)

**Colunas principais:**
- `id` - ID único da tabela
- `nome` - Nome da tabela (único)
- `descricao` - Descrição opcional
- `ativa` - Se está ativa para uso
- `padrao` - Se é a tabela padrão (apenas uma pode ser)

**Constraint especial:**
- Apenas uma tabela pode ser padrão por vez

#### 3. **itens_tabela_precos**
Itens (serviços) de cada tabela de preços

**Colunas principais:**
- `id` - ID único do item
- `tabela_preco_id` - Referência à tabela de preços
- `tipo_servico` - Consulta | Sessão
- `descricao` - Descrição do serviço
- `valor` - Preço do serviço
- `ordem` - Ordem de exibição
- `ativo` - Se o item está ativo

---

## 🚀 Instruções de Implantação

### Passo 1: Executar Migration SQL

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Cole o conteúdo completo do arquivo `supabase-migration-phase2.sql`
4. Execute o script
5. Verifique se não houve erros

**Verificação:**
```sql
-- Conferir se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parcelas', 'tabelas_precos', 'itens_tabela_precos');

-- Ver dados iniciais
SELECT * FROM tabelas_precos;
SELECT * FROM itens_tabela_precos;
```

### Passo 2: Instalar Dependências

Se ainda não tiver instalado, instale as dependências do Radix UI:

```bash
npm install @radix-ui/react-tabs
# ou
yarn add @radix-ui/react-tabs
# ou
pnpm add @radix-ui/react-tabs
```

**Dependências de gráficos** (já devem estar instaladas):
```bash
npm install recharts
```

### Passo 3: Verificar Variáveis de Ambiente

Certifique-se que o arquivo `.env.local` contém:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
NEXT_PUBLIC_TABLE_NAME=nome-da-tabela-de-clientes
```

### Passo 4: Reiniciar o Servidor

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

---

## 🎯 Funcionalidades Implementadas

### 📋 1. Controle de Recebíveis

**Localização:** Dashboard Financeiro > Aba "Recebíveis"

**Funcionalidades:**
- ✅ Visualização de todas as parcelas pendentes
- ✅ Filtros por status (Pendente, Pago, Atrasado)
- ✅ Filtro por data de vencimento
- ✅ Busca por ID ou descrição
- ✅ Análise de aging (vencidas, a vencer esta semana, próximo mês)
- ✅ Marcar parcela como paga com método de pagamento
- ✅ Cards de resumo:
  - Total a receber
  - Parcelas vencidas
  - Vencimentos desta semana
  - Vencimentos do próximo mês
- ✅ Badges coloridos por status (verde=pago, amarelo=pendente, vermelho=atrasado)

**Geração Automática:**
- Quando uma consulta é criada com parcelas > 1, o sistema gera automaticamente todas as parcelas
- Primeira parcela vence na data da consulta
- Parcelas subsequentes vencem mensalmente

### 💰 2. Tabelas de Preços

**Localização:** Dashboard Financeiro > Aba "Tabelas de Preço"

**Funcionalidades:**
- ✅ Criar múltiplas tabelas de preço (Particular, Convênio X, Promoção, etc.)
- ✅ Marcar tabela como ativa/inativa
- ✅ Definir tabela padrão (apenas uma)
- ✅ Adicionar itens (serviços) em cada tabela:
  - Tipo: Consulta ou Sessão
  - Descrição personalizada
  - Valor específico
  - Ordem de exibição
  - Status ativo/inativo
- ✅ Editar e excluir tabelas e itens
- ✅ Visualizar tabela completa em preview
- ✅ Interface intuitiva com 2 colunas:
  - Esquerda: Lista de tabelas
  - Direita: Itens da tabela selecionada

**Dados Iniciais:**
O sistema cria automaticamente:
- Tabela "Particular" (padrão, ativa)
- Tabela "Convênio" (ativa)
- Itens de exemplo (Consulta Inicial R$ 150, Sessão de Fisioterapia R$ 120)

### 📊 3. Relatórios Avançados

**Localização:** Dashboard Financeiro > Aba "Relatórios"

**Funcionalidades:**
- ✅ Filtro por período customizado
- ✅ Cards de métricas:
  - Receita total
  - Total de transações
  - Ticket médio
- ✅ **Gráfico de Pizza:** Receita por tipo de serviço
- ✅ **Gráfico de Barras:** Receita por forma de pagamento
- ✅ **Tabela de Performance:** Análise detalhada por tipo de serviço
  - Quantidade
  - Receita total
  - Ticket médio
  - % do total (quantidade e receita)
- ✅ **Top 10 Clientes:** Maiores geradores de receita
  - Número de consultas
  - Total gasto
  - Média por consulta
- ✅ Botões de exportação (CSV/PDF) - placeholder para implementação futura

### 📈 4. Análise de Serviços

**Localização:** Dashboard Financeiro > Aba "Análise de Serviços"

**Funcionalidades:**
- ✅ Filtro por período
- ✅ Cards de resumo:
  - Receita total
  - Quantidade de serviços
  - Ticket médio
  - Serviços únicos cadastrados
- ✅ **Gráfico de Barras Horizontal:** Top 5 serviços mais lucrativos
- ✅ **Gráfico de Pizza:** Mix de serviços (distribuição por tipo)
- ✅ **Gráfico de Linhas:** Tendência de crescimento mensal
  - Evolução de Consultas
  - Evolução de Sessões
- ✅ **Tabela Detalhada:** Performance completa
  - Tipo e descrição do serviço
  - Quantidade
  - Receita total
  - Ticket médio
  - Percentual de quantidade
  - Percentual de receita

---

## 🎨 Design e UX

### Cores Utilizadas

**Status de Parcelas:**
- 🟢 Verde (#10b981): Pago
- 🟡 Amarelo (#eab308): Pendente
- 🔴 Vermelho (#ef4444): Atrasado

**Gráficos:**
- Verde (#10b981): Consultas, receitas positivas
- Azul (#3b82f6): Sessões, dados secundários
- Âmbar (#f59e0b): Dinheiro
- Roxo (#8b5cf6): Cartão
- Rosa (#ec4899): Dados adicionais

### Ícones Utilizados

- `LayoutDashboard`: Visão Geral
- `Wallet`: Recebíveis
- `Table`: Tabelas de Preço
- `BarChart3`: Relatórios
- `Activity`: Análise de Serviços
- `DollarSign`: Valores monetários
- `TrendingUp`: Crescimento
- `AlertCircle`: Alertas
- `CheckCircle2`: Confirmações

---

## 🔄 Integração com Sistema Existente

### Modificações em `addConsulta()`

A função foi modificada para gerar parcelas automaticamente:

```typescript
// Auto-gerar parcelas se parcelas > 1
if (data && payload.parcelas > 1) {
  await generateParcelas(data.id, valor_total, payload.parcelas, payload.data_consulta)
}
```

**Lógica de geração:**
1. Divide o valor total igualmente entre as parcelas
2. Primeira parcela vence na data da consulta
3. Parcelas seguintes vencem mensalmente (30 dias)
4. Status inicial: "Pendente"
5. Todas criadas na tabela `parcelas`

### Sistema de Abas (Tabs)

O `FinancialDashboard` agora usa componente Tabs do shadcn/ui:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    {/* 5 abas */}
  </TabsList>
  
  <TabsContent value="overview">
    {/* Visão Geral (existente) */}
  </TabsContent>
  
  <TabsContent value="receivables">
    {/* Novo: Recebíveis */}
  </TabsContent>
  
  {/* ... outras abas ... */}
</Tabs>
```

---

## 🧪 Testes Recomendados

### 1. Testar Criação de Parcelas

1. Criar uma consulta com 3 parcelas
2. Verificar se 3 registros foram criados na tabela `parcelas`
3. Conferir se as datas de vencimento estão corretas (mensal)
4. Verificar valores (valor_total / 3)

**SQL para conferir:**
```sql
SELECT * FROM parcelas WHERE consulta_id = [ID_DA_CONSULTA] ORDER BY numero_parcela;
```

### 2. Testar Controle de Recebíveis

1. Acessar aba "Recebíveis"
2. Verificar se parcelas aparecem com status correto
3. Marcar parcela como paga
4. Verificar se status mudou para "Pago"
5. Testar filtros de status, data e busca

### 3. Testar Tabelas de Preços

1. Criar nova tabela (ex: "Convênio Unimed")
2. Adicionar itens com valores diferentes
3. Marcar como tabela padrão
4. Verificar se apenas uma tabela é padrão
5. Editar e excluir itens
6. Visualizar preview da tabela

### 4. Testar Relatórios

1. Selecionar período com dados
2. Verificar se gráficos renderizam
3. Conferir se valores batem com database
4. Testar diferentes períodos
5. Verificar top 10 clientes

### 5. Testar Análise de Serviços

1. Verificar métricas gerais
2. Conferir gráfico de tendência (últimos meses)
3. Validar cálculo de percentuais
4. Testar filtros de período

---

## 🐛 Troubleshooting

### Erro: "Tabela não existe"

**Solução:** Executar o script SQL de migration novamente.

```sql
-- Verificar se tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Erro: "Cannot read properties of undefined"

**Solução:** Verificar se as policies RLS foram criadas corretamente.

```sql
-- Ver policies
SELECT * FROM pg_policies WHERE tablename IN ('parcelas', 'tabelas_precos', 'itens_tabela_precos');
```

### Gráficos não aparecem

**Solução:** Verificar se `recharts` está instalado.

```bash
npm list recharts
# Se não estiver instalado:
npm install recharts
```

### Abas não funcionam

**Solução:** Verificar se `@radix-ui/react-tabs` está instalado.

```bash
npm list @radix-ui/react-tabs
# Se não estiver instalado:
npm install @radix-ui/react-tabs
```

### Parcelas não são geradas automaticamente

**Solução:** Verificar logs do console. A função `generateParcelas()` é chamada após criar consulta.

```typescript
// Em lib/supabase.ts, conferir se esta linha existe:
if (data && payload.parcelas > 1) {
  await generateParcelas(data.id, valor_total, payload.parcelas, payload.data_consulta)
}
```

---

## 📝 Próximos Passos (Opcionais)

### Melhorias Futuras Sugeridas

1. **Exportação de Relatórios**
   - Implementar export CSV real
   - Implementar export PDF com gráficos

2. **Notificações de Vencimento**
   - Email automático para parcelas próximas do vencimento
   - WhatsApp API para lembretes

3. **Dashboard de Parcelas no Cliente**
   - Mostrar parcelas na modal de detalhes do paciente
   - Link direto para marcar como pago

4. **Integração com Tabelas de Preços**
   - Dropdown na criação de consulta para selecionar da tabela de preços
   - Auto-fill do valor baseado na tabela selecionada

5. **Relatórios Agendados**
   - Envio automático de relatórios mensais
   - Dashboards executivos

6. **Cron Job para Parcelas Atrasadas**
   - Executar `marcar_parcelas_atrasadas()` diariamente
   - Usar Supabase Edge Functions ou serviço externo

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)
- [Radix UI Tabs](https://www.radix-ui.com/docs/primitives/components/tabs)
- [date-fns Documentation](https://date-fns.org/)

---

## ✨ Conclusão

A Fase 2 está **100% implementada** e pronta para uso! 

Todos os componentes foram criados com:
- ✅ TypeScript com tipagem completa
- ✅ Componentes reutilizáveis
- ✅ Estados de loading
- ✅ Tratamento de erros
- ✅ Toasts de feedback
- ✅ Design responsivo
- ✅ Acessibilidade
- ✅ Performance otimizada
- ✅ Texto 100% em português

**Estrutura modular** permite fácil manutenção e expansão futura.

---

**Desenvolvido com ❤️ para gestão financeira profissional de clínicas e consultórios**
