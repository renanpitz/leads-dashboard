# ✅ Checklist: Migração Phase 2 - Controle de Recebíveis

## Antes de Começar

- [ ] Tenho acesso ao **Supabase Dashboard** do projeto
- [ ] Sei qual é o projeto correto no Supabase
- [ ] O arquivo `supabase-migration-phase2.sql` está no projeto
- [ ] Fiz backup do banco (opcional, mas recomendado)

---

## Passo a Passo

### 1. Acessar Supabase
- [ ] Acessei https://supabase.com/dashboard
- [ ] Fiz login na minha conta
- [ ] Selecionei o projeto correto (leads-dashboard)

### 2. Abrir SQL Editor
- [ ] Cliquei em **SQL Editor** no menu lateral
- [ ] Cliquei em **New Query** (ou botão +)
- [ ] A interface do SQL Editor está aberta

### 3. Preparar a Migração
- [ ] Abri o arquivo `supabase-migration-phase2.sql` no meu editor de código
- [ ] Copiei TODO o conteúdo do arquivo (Ctrl+A → Ctrl+C)
- [ ] Colei no SQL Editor do Supabase (Ctrl+V)

### 4. Executar a Migração
- [ ] Revisei que TODO o conteúdo foi colado
- [ ] Cliquei no botão **RUN** (verde, canto superior direito)
- [ ] Aguardei a execução (pode levar alguns segundos)

### 5. Verificar Sucesso
- [ ] Vi a mensagem "Success. No rows returned" (ou similar)
- [ ] Não houve mensagens de erro em vermelho
- [ ] Se houve erro, copiei a mensagem completa para debug

### 6. Confirmar Criação das Tabelas
- [ ] No menu lateral, cliquei em **Table Editor**
- [ ] Vejo a tabela **parcelas** na lista
- [ ] Vejo a tabela **tabelas_precos** na lista
- [ ] Vejo a tabela **itens_tabela_precos** na lista

### 7. Testar na Aplicação
- [ ] Voltei para a aplicação web (navegador)
- [ ] Recarreguei a página (F5 ou Ctrl+R)
- [ ] Fiz login novamente (se necessário)
- [ ] Acessei o Dashboard

### 8. Verificar Controle de Recebíveis
- [ ] Cliquei na aba **Recebíveis** (ou equivalente)
- [ ] A página carregou sem erros
- [ ] Vejo os cards de resumo (Total a Receber, Vencidas, etc.)
- [ ] Vejo a tabela de parcelas (pode estar vazia se não tiver parcelas)
- [ ] **NÃO** vejo mais o card laranja de "Migração Necessária"

---

## Teste Completo (Opcional)

### Criar uma Consulta Parcelada
- [ ] Acessei um cliente existente
- [ ] Cliquei em "Adicionar Consulta/Sessão"
- [ ] Preenchi os dados:
  - Tipo: Consulta ou Sessão
  - Quantidade: 1
  - Valor: R$ 150,00 (por exemplo)
  - Data: hoje
  - Forma de pagamento: PIX (ou outro)
  - **Parcelas: 3** (ou outro número > 1)
- [ ] Cliquei em "Adicionar"
- [ ] A consulta foi criada com sucesso

### Verificar Geração de Parcelas
- [ ] Voltei para a aba **Recebíveis**
- [ ] Vejo 3 novas parcelas na lista (1/3, 2/3, 3/3)
- [ ] Cada parcela tem:
  - Valor correto (total dividido por 3)
  - Status "Pendente"
  - Data de vencimento (mês atual, próximo mês, etc.)
- [ ] Os cards de resumo atualizaram (Total a Receber, etc.)

### Testar Marcar como Pago
- [ ] Cliquei em "Marcar como Pago" em uma parcela
- [ ] Selecionei o método de pagamento (PIX, Dinheiro, etc.)
- [ ] Cliquei em "Confirmar Pagamento"
- [ ] A parcela mudou para status "Pago"
- [ ] Os cards de resumo atualizaram (Total a Receber diminuiu)

---

## Problemas Comuns

### ❌ Erro: "relation 'parcelas' already exists"
**Solução:** A tabela já existe! Você pode:
- Pular a criação (está OK)
- OU dropar as tabelas antigas e recriar:
  ```sql
  DROP TABLE IF EXISTS parcelas CASCADE;
  DROP TABLE IF EXISTS tabelas_precos CASCADE;
  DROP TABLE IF EXISTS itens_tabela_precos CASCADE;
  -- Depois execute a migração novamente
  ```

### ❌ Erro: "permission denied"
**Solução:**
- Verifique se você é o owner do projeto no Supabase
- Verifique se está usando o projeto correto
- Tente fazer login novamente no Supabase

### ❌ Erro: "syntax error at or near..."
**Solução:**
- Verifique se copiou TODO o arquivo SQL
- Não cole apenas uma parte do arquivo
- Certifique-se que não há caracteres estranhos

### ❌ Ainda vejo "Migração Necessária" na aplicação
**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue a página com Ctrl+F5 (hard reload)
3. Faça logout e login novamente
4. Verifique se as tabelas foram realmente criadas no Table Editor

### ❌ Erro 401 ou 403 ao acessar parcelas
**Solução:**
- As políticas RLS podem não estar aplicadas
- Execute esta query no SQL Editor:
  ```sql
  -- Verificar se RLS está habilitado
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename IN ('parcelas', 'tabelas_precos', 'itens_tabela_precos');
  ```
- Se `rowsecurity` for `false`, execute:
  ```sql
  ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tabelas_precos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE itens_tabela_precos ENABLE ROW LEVEL SECURITY;
  ```

---

## Rollback (Se Necessário)

Se algo der muito errado e você quiser desfazer:

```sql
-- ATENÇÃO: Isso apaga TODOS os dados das tabelas Phase 2!
DROP TABLE IF EXISTS parcelas CASCADE;
DROP TABLE IF EXISTS tabelas_precos CASCADE;
DROP TABLE IF EXISTS itens_tabela_precos CASCADE;

-- Apagar as funções criadas
DROP FUNCTION IF EXISTS update_parcelas_timestamp CASCADE;
DROP FUNCTION IF EXISTS update_tabelas_precos_timestamp CASCADE;
DROP FUNCTION IF EXISTS update_itens_timestamp CASCADE;
DROP FUNCTION IF EXISTS update_parcelas_atrasadas CASCADE;
DROP FUNCTION IF EXISTS marcar_parcelas_atrasadas CASCADE;
```

---

## Confirmação Final

### ✅ Migração Bem-Sucedida Se:

- [x] Vejo as 3 novas tabelas no Table Editor
- [x] A aba Recebíveis carrega sem erros
- [x] Consigo criar consultas parceladas
- [x] As parcelas são geradas automaticamente
- [x] Consigo marcar parcelas como pagas
- [x] Os filtros e busca funcionam
- [x] Não há erros no console do navegador (F12)

### 🎉 Pronto!

Se todos os itens acima estão ✅, a migração foi um sucesso!

Você agora tem:
- ✨ Controle completo de recebíveis
- ✨ Gestão de parcelas com aging
- ✨ Tabelas de preço customizáveis
- ✨ Atualizações automáticas de status

---

## Próximos Passos

Depois da migração bem-sucedida:

1. **Configure suas Tabelas de Preço**
   - Acesse Configurações → Tabelas de Preço
   - Edite os valores padrão
   - Crie novas tabelas (Convênios, Promoções, etc.)

2. **Importe Consultas Antigas** (se tiver)
   - Consultas já existentes no sistema
   - Podem precisar gerar parcelas manualmente se forem parceladas

3. **Configure Alertas** (futuro)
   - Notificações de parcelas vencendo
   - Relatórios automáticos

---

**Status Atual:** ⏳ Aguardando execução
**Última Atualização:** 2024
**Arquivo de Migração:** `supabase-migration-phase2.sql`
