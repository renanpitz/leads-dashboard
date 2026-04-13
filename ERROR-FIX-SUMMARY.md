# ✅ Fix: "Erro ao buscar parcelas pendentes"

## 🔍 Problema Identificado

O erro ocorria porque a **tabela `parcelas` não existe no banco de dados**. Este é um recurso novo (Phase 2) que requer executar uma migração SQL no Supabase.

### Sintomas:
- ❌ Erro: "Erro ao buscar parcelas pendentes: {}"
- ❌ Componente de Controle de Recebíveis não carrega
- ❌ Mensagem vazia no erro (objeto `{}`)

### Causa Raiz:
A tabela `parcelas` só é criada quando você executa o arquivo `supabase-migration-phase2.sql` no SQL Editor do Supabase. Sem essa migração, o banco de dados não tem as tabelas necessárias.

---

## 🛠️ Correções Implementadas

### 1. **lib/supabase.ts** - Melhor tratamento de erros

**Adicionado:**
```typescript
// Nova função para verificar se a tabela existe
export async function checkParcelasTableExists(): Promise<{ exists: boolean; error?: string }>
```

**Modificado:**
```typescript
export async function getParcelasPendentes(): Promise<Parcela[]> {
  // Agora lança erro com detalhes completos em vez de retornar array vazio
  // Logs detalhados: code, message, details, hint
}
```

**Benefícios:**
- ✅ Detecção automática de tabela não existente (código PostgreSQL 42P01)
- ✅ Mensagens de erro detalhadas com código e descrição
- ✅ Logs completos no console para debug

---

### 2. **components/receivables-control.tsx** - Interface amigável

**Adicionado:**
- ✅ Verificação de existência da tabela antes de buscar dados
- ✅ Tela de instruções de migração quando tabela não existe
- ✅ Botões de ação: "Verificar Novamente" e "Abrir Supabase Dashboard"
- ✅ Lista de passos detalhada para executar a migração
- ✅ Informações sobre o que será criado na migração

**Interface de Migração Necessária:**

Quando a tabela não existe, o componente agora mostra:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Migração de Banco de Dados Necessária               │
│                                                         │
│ Como executar a migração:                              │
│ 1. Acesse o Supabase Dashboard                        │
│ 2. Vá em SQL Editor                                   │
│ 3. Abra supabase-migration-phase2.sql                 │
│ 4. Copie e cole no SQL Editor                         │
│ 5. Clique em Run                                      │
│ 6. Recarregue esta página                             │
│                                                         │
│ O que será criado:                                     │
│ • Tabela parcelas                                      │
│ • Tabela tabelas_precos                               │
│ • Tabela itens_tabela_precos                          │
│ • Funções automáticas                                  │
│ • Políticas de segurança (RLS)                        │
│                                                         │
│ [Verificar Novamente] [Abrir Supabase Dashboard]      │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Próximos Passos (IMPORTANTE!)

### Passo 1: Executar a Migração SQL

**Você PRECISA executar a migração para o sistema funcionar!**

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto do leads-dashboard

2. **Vá para o SQL Editor:**
   - Menu lateral → **SQL Editor**
   - Clique em **New Query**

3. **Execute a migração:**
   - Abra o arquivo: `supabase-migration-phase2.sql`
   - Copie TODO o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em **RUN** (botão verde)

4. **Aguarde confirmação:**
   - Deve aparecer "Success. No rows returned"
   - Isso significa que as tabelas foram criadas

5. **Recarregue a aplicação:**
   - Volte ao navegador
   - Recarregue a página (F5)
   - O erro deve desaparecer!

---

## 🎯 O Que a Migração Cria

### Tabela: `parcelas`
Controle de parcelas individuais de consultas parceladas:
- Número da parcela (1/3, 2/3, etc.)
- Valor de cada parcela
- Data de vencimento
- Status (Pendente, Pago, Atrasado)
- Método de pagamento
- Data de pagamento

### Tabela: `tabelas_precos`
Múltiplas tabelas de preço:
- Particular
- Convênios
- Promoções
- Tabela padrão

### Tabela: `itens_tabela_precos`
Itens/serviços de cada tabela de preço:
- Consulta
- Sessão
- Valores customizados por tabela

### Funções Automáticas:
- Atualização de status de parcelas atrasadas
- Triggers para updated_at
- Políticas RLS para segurança

---

## 🧪 Como Testar Depois da Migração

1. **Acesse o Controle de Recebíveis:**
   - Dashboard → Aba "Recebíveis"
   - Deve carregar sem erros

2. **Teste criando uma consulta parcelada:**
   - Vá em um cliente
   - Adicione consulta/sessão
   - Selecione forma de pagamento
   - Escolha parcelas > 1
   - As parcelas devem ser geradas automaticamente

3. **Verifique a tela de Recebíveis:**
   - Deve mostrar as parcelas pendentes
   - Cards de resumo: Total a Receber, Vencidas, Esta Semana, Próximo Mês
   - Filtros funcionando
   - Marcar como pago deve funcionar

---

## 🐛 Se Ainda Houver Erro Após a Migração

**Verifique:**

1. **Tabelas criadas?**
   ```sql
   -- Execute no SQL Editor do Supabase
   SELECT * FROM parcelas LIMIT 5;
   SELECT * FROM tabelas_precos;
   SELECT * FROM itens_tabela_precos;
   ```

2. **RLS (Row Level Security) habilitado?**
   - As políticas devem estar ativas
   - Verifique no Dashboard → Authentication → Policies

3. **Usuário autenticado?**
   - As políticas RLS exigem usuário logado
   - Faça logout e login novamente

4. **Console do navegador:**
   - Abra DevTools (F12)
   - Console → procure por erros detalhados
   - Deve mostrar código de erro se houver

---

## 📊 Funcionalidades Disponíveis Após Fix

### Controle de Recebíveis:
- ✅ Visualizar todas as parcelas pendentes
- ✅ Filtrar por status (Pendente, Pago, Atrasado)
- ✅ Filtrar por período de vencimento
- ✅ Buscar por descrição ou ID
- ✅ Ver aging analysis (vencidas, esta semana, próximo mês)
- ✅ Marcar parcelas como pagas
- ✅ Registrar método de pagamento
- ✅ Visualizar dias até vencimento/atraso

### Tabelas de Preços:
- ✅ Criar múltiplas tabelas de preço
- ✅ Definir preços por tipo de serviço
- ✅ Ativar/desativar tabelas
- ✅ Definir tabela padrão

---

## 📝 Resumo Técnico

**Arquivos modificados:**
1. `lib/supabase.ts`
   - Nova função: `checkParcelasTableExists()`
   - Modificado: `getParcelasPendentes()` com throw de erro detalhado
   - Fix: variável `event` não usada → `_event`

2. `components/receivables-control.tsx`
   - Novo state: `tableMissingError`
   - Nova verificação antes de buscar dados
   - Nova UI de instruções de migração
   - Melhor tratamento de erros

**Tabelas que precisam existir:**
- ✅ `parcelas` (nova - Phase 2)
- ✅ `tabelas_precos` (nova - Phase 2)
- ✅ `itens_tabela_precos` (nova - Phase 2)
- ✅ `consultas` (já existe)
- ✅ `clientes` (já existe - usando TABLE_NAME env)

---

## 🎉 Resultado Final

Após executar a migração, você terá:

1. ✅ **Erro resolvido** - componente carrega normalmente
2. ✅ **Controle completo de parcelas** - aging, status, pagamentos
3. ✅ **Gestão de tabelas de preço** - múltiplas tabelas customizadas
4. ✅ **Mensagens de erro claras** - se algo der errado, você saberá o que é
5. ✅ **UI intuitiva** - instruções de migração quando necessário

---

## 🆘 Suporte

Se precisar de ajuda:

1. **Verifique os logs do console** (F12 → Console)
2. **Verifique o SQL Editor do Supabase** - deve mostrar mensagens de erro se houver
3. **Arquivo de migração:** `supabase-migration-phase2.sql`
4. **Documentação do Supabase:** https://supabase.com/docs

---

**Data da correção:** 2024
**Status:** ✅ Corrigido - Aguardando execução da migração pelo usuário
