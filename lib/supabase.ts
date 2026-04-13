import { createBrowserClient } from "@supabase/ssr"

export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}

export async function onAuthStateChange(callback: (user: any) => void) {
  const supabase = createClient()
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
  return { data }
}

export interface User {
  id: string
  email: string
  created_at: string
  last_login?: string
}

export interface Cliente {
  id: number
  created_at: string
  nome: string | null
  telefone: string | null
  trava: boolean
  follow_up: number
  interessado: boolean
  /** Preenchido quando o lead passa a ser "interessado" (true). */
  interessado_timestamp?: string | null
  last_followup: string | null
  servico_interesse: string | null
  followup_status: string
  mensagem_para_humano: string | null
  tag_status: string | null
  tag_timestamp?: string | null
}

export interface Consulta {
  id: number
  cliente_id: number
  tipo: 'Consulta' | 'Sessão'
  descricao: string | null
  /** Produtos relacionados a este atendimento (ex: "VPPB, Zumbido"). */
  produtos?: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number
  data_consulta: string
  forma_pagamento: 'Dinheiro' | 'PIX' | 'Cartão' | null
  parcelas: number | null
  created_at: string
}

export interface Parcela {
  id: number
  consulta_id: number
  numero_parcela: number
  valor_parcela: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'Pendente' | 'Pago' | 'Atrasado'
  metodo_pagamento: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface TabelaPreco {
  id: number
  nome: string
  descricao: string | null
  ativa: boolean
  padrao: boolean
  created_at: string
  updated_at: string
}

export interface ItemTabelaPreco {
  id: number
  tabela_preco_id: number
  tipo_servico: 'Consulta' | 'Sessão'
  descricao: string
  valor: number
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

// ============ PHASE 3 INTERFACES ============

export interface CategoriaDespesa {
  id: number
  nome: string
  descricao: string | null
  cor: string
  icone: string | null
  ativa: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface Despesa {
  id: number
  data: string
  categoria_id: number
  descricao: string
  valor: number
  forma_pagamento: string | null
  anexo_url: string | null
  recorrente: boolean
  frequencia_recorrencia: 'mensal' | 'trimestral' | 'anual' | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Meta {
  id: number
  tipo: 'receita' | 'despesa' | 'lucro'
  nome: string
  descricao: string | null
  valor_alvo: number
  periodo: 'mensal' | 'trimestral' | 'anual'
  data_inicio: string
  data_fim: string
  status: 'ativa' | 'pausada' | 'concluida'
  created_at: string
  updated_at: string
}

export interface Recibo {
  id: number
  consulta_id: number | null
  cliente_id: number
  numero_recibo: string
  data_emissao: string
  valor: number
  servico_descricao: string
  observacoes: string | null
  pdf_url: string | null
  enviado_email: boolean
  created_at: string
}

export interface IntegracaoPagamento {
  id: number
  provedor: 'mercadopago' | 'stripe' | 'pagseguro'
  nome_configuracao: string
  api_key_encrypted: string | null
  webhook_url: string | null
  webhook_secret_encrypted: string | null
  ativa: boolean
  ambiente: 'sandbox' | 'production'
  ultimo_teste: string | null
  teste_status: 'sucesso' | 'falha' | null
  created_at: string
  updated_at: string
}

const TABLE_NAME = process.env.NEXT_PUBLIC_TABLE_NAME!;

export async function getClientes(): Promise<Cliente[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar clientes:", error)
    return []
  }

  return data || []
}

export async function updateClienteStatus(id: number, trava: boolean, clearMensagem: boolean = false): Promise<boolean> {
  const supabase = createClient()
  const updateData: any = { trava }
  if (clearMensagem) {
    updateData.mensagem_para_humano = null
  }
  const { error } = await supabase.from(TABLE_NAME).update(updateData).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar status do cliente:", error)
    return false
  }

  return true
}

export async function updateClienteTag(id: number, tag_status: string | null): Promise<boolean> {
  const supabase = createClient()
  
  const updatePayload: any = { tag_status }
  if (tag_status) {
    updatePayload.tag_timestamp = new Date().toISOString()
  } else {
    updatePayload.tag_timestamp = null
  }

  const { error } = await supabase.from(TABLE_NAME).update(updatePayload).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar tag do cliente:", error)
    return false
  }

  return true
}

export async function updateClienteProduto(id: number, servico_interesse: string | null): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from(TABLE_NAME).update({ servico_interesse }).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar produto do cliente:", error)
    return false
  }

  return true
}

export async function updateClienteInteressado(id: number, interessado: boolean): Promise<boolean> {
  const supabase = createClient()

  const updatePayload: any = { interessado }

  // Regra: sempre que interessado for true, atualizar timestamp
  if (interessado) {
    updatePayload.interessado_timestamp = new Date().toISOString()
  }

  const { error } = await supabase.from(TABLE_NAME).update(updatePayload).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar interessado do cliente:", error)
    return false
  }

  return true
}

export async function updateClienteMensagem(id: number, mensagem_para_humano: string | null): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from(TABLE_NAME).update({ mensagem_para_humano }).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar mensagem do cliente:", error)
    return false
  }

  return true
}

export async function updateClienteFollowUp(id: number, follow_up: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from(TABLE_NAME).update({ follow_up }).eq("id", id)

  if (error) {
    console.error("Erro ao atualizar follow up do cliente:", error)
    return false
  }

  return true
}

function normalizeLeadPhoneTo55(phoneRaw: string): string {
  // Always persist as: 55 + digits only (ex: 5521988822338)
  const digitsOnly = (phoneRaw || "").replace(/\D/g, "")
  if (!digitsOnly) return ""

  return digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`
}

export async function addCliente(payload: { nome: string, telefone: string, tag_status: string | null, servico_interesse: string | null, interessado: boolean }): Promise<Cliente | null> {
  const supabase = createClient()

  const telefoneNormalized = normalizeLeadPhoneTo55(payload.telefone)

  const insertData = {
    nome: payload.nome,
    telefone: telefoneNormalized,
    tag_status: payload.tag_status || null,
    servico_interesse: payload.servico_interesse || null,
    interessado: payload.interessado,
    interessado_timestamp: payload.interessado ? new Date().toISOString() : null,
    trava: false, // AI ativo / untrapped
    follow_up: 0,
    followup_status: "active",
    mensagem_para_humano: null,
  }

  const { data, error } = await supabase.from(TABLE_NAME).insert([insertData]).select().single()

  if (error) {
    console.error("Erro ao adicionar cliente manualmente:", error)
    return null
  }

  return data as Cliente
}

export async function deleteCliente(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id)

  if (error) {
    console.error("Erro ao deletar cliente:", error)
    return false
  }

  return true
}

export interface TemplateField {
  key: string
  label: string
}

export interface Template {
  id: number
  created_at: string
  name: string
  fields: TemplateField[]
}

export async function getTemplates(): Promise<Template[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false })
  
  if (error) {
    console.error("Erro ao buscar templates:", error)
    return []
  }
  return data as Template[]
}

export async function createTemplate(name: string, fields: TemplateField[]): Promise<Template | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('templates').insert([{ name, fields }]).select().single()
  
  if (error) {
    console.error("Erro ao criar template:", error)
    return null
  }
  return data as Template
}

export async function updateTemplate(id: number, name: string, fields: TemplateField[]): Promise<Template | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('templates').update({ name, fields }).eq('id', id).select().single()
  
  if (error) {
    console.error("Erro ao atualizar template:", error)
    return null
  }
  return data as Template
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('templates').delete().eq('id', id)
  
  if (error) {
    console.error("Erro ao deletar template:", error)
    return false
  }
  return true
}

// ============ CONSULTAS ============

export async function getConsultasByClienteId(clienteId: number): Promise<Consulta[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data_consulta', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar consultas:', error)
    return []
  }

  return data || []
}

export async function addConsulta(payload: {
  cliente_id: number
  tipo: 'Consulta' | 'Sessão'
  descricao: string
  /** Produtos selecionados (ex: "VPPB, Zumbido"). */
  produtos?: string | null
  quantidade: number
  valor_unitario: number
  data_consulta: string
  forma_pagamento: 'Dinheiro' | 'PIX' | 'Cartão'
  parcelas: number
}): Promise<Consulta | null> {
  const supabase = createClient()
  
  const valor_total = payload.valor_unitario * payload.quantidade
  
  const insertData = {
    cliente_id: payload.cliente_id,
    tipo: payload.tipo,
    descricao: payload.descricao,
    produtos: payload.produtos || null,
    quantidade: payload.quantidade,
    valor_unitario: payload.valor_unitario,
    valor_total,
    data_consulta: payload.data_consulta,
    forma_pagamento: payload.forma_pagamento,
    parcelas: payload.parcelas
  }
  
  const { data, error } = await supabase
    .from('consultas')
    .insert([insertData])
    .select()
    .single()

  if (error) {
    console.error('Erro ao adicionar consulta:', error)
    return null
  }

  // Auto-gerar parcelas se parcelas > 1
  if (data && payload.parcelas > 1) {
    await generateParcelas(data.id, valor_total, payload.parcelas, payload.data_consulta)
  }

  return data as Consulta
}

export async function updateConsulta(
  id: number,
  payload: {
    tipo: 'Consulta' | 'Sessão'
    descricao: string
    /** Produtos selecionados (ex: "VPPB, Zumbido"). */
    produtos?: string | null
    quantidade: number
    valor_unitario: number
    /** Aceita ISO (timestamp) ou yyyy-mm-dd. */
    data_consulta: string
    forma_pagamento: 'Dinheiro' | 'PIX' | 'Cartão'
    parcelas: number
  }
): Promise<Consulta | null> {
  const supabase = createClient()

  const valor_total = payload.valor_unitario * payload.quantidade

  // Normaliza data para ISO quando vier no formato yyyy-mm-dd.
  // Isso evita problemas quando a coluna no Postgres é timestamp/timestamptz.
  let normalizedDataConsulta = payload.data_consulta
  if (/^\d{4}-\d{2}-\d{2}$/.test(payload.data_consulta)) {
    const iso = new Date(`${payload.data_consulta}T00:00:00`).toISOString()
    normalizedDataConsulta = iso
  }

  const updateData = {
    tipo: payload.tipo,
    descricao: payload.descricao,
    produtos: payload.produtos || null,
    quantidade: payload.quantidade,
    valor_unitario: payload.valor_unitario,
    valor_total,
    data_consulta: normalizedDataConsulta,
    forma_pagamento: payload.forma_pagamento,
    parcelas: payload.parcelas,
  }

  // IMPORTANTE:
  // Em projetos com RLS, é comum a policy permitir UPDATE mas NÃO permitir SELECT da linha.
  // Nesse caso, usar `.select().single()` faz o update parecer que falhou.
  // Aqui fazemos um update resiliente:
  // - tentamos retornar a linha atualizada;
  // - se não retornar por RLS/returning, consideramos sucesso e seguimos com um objeto mínimo.
  const { data: updatedRows, error } = await supabase
    .from('consultas')
    .update(updateData)
    .eq('id', id)
    .select()

  const data = Array.isArray(updatedRows) ? updatedRows[0] : (updatedRows as any)

  if (error) {
    // PostgrestError nem sempre aparece bem no console (pode virar "{}").
    console.error('Erro ao atualizar consulta:', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
      raw: error,
      keys: Object.getOwnPropertyNames(error as any),
    })
    return null
  }

  // Se não retornou linha, pode ser:
  // - id inexistente
  // - RLS permitindo UPDATE mas bloqueando SELECT/RETURNING
  // Como o update NÃO retornou erro, seguimos com um objeto mínimo.
  // (A UI só precisa do id; e parcelas usam o id.)
  const safeData: Consulta = (data || ({ id, ...updateData } as any)) as Consulta

  // Regerar parcelas quando necessário:
  // - Se NÃO for cartão OU parcelas <= 1: remove qualquer parcela existente
  // - Se for cartão e parcelas > 1: remove e recria
  try {
    if (safeData) {
      const shouldHaveParcelas = payload.forma_pagamento === 'Cartão' && payload.parcelas > 1

      // remove parcelas existentes
      const { error: delErr } = await supabase.from('parcelas').delete().eq('consulta_id', safeData.id)
      if (delErr) {
        // Se tabela parcelas não existir, não quebra a edição
        console.warn('Aviso ao remover parcelas na edição da consulta:', delErr)
      }

      if (shouldHaveParcelas) {
        await generateParcelas(safeData.id, valor_total, payload.parcelas, normalizedDataConsulta)
      }
    }
  } catch (e) {
    console.warn('Aviso ao sincronizar parcelas após editar consulta:', e)
  }

  return data as Consulta
}

export async function deleteConsulta(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('consultas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar consulta:', error)
    return false
  }

  return true
}

// ============ FINANCIAL QUERIES ============

export async function getAllConsultas(): Promise<Consulta[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .order('data_consulta', { ascending: false })

  if (error) {
    console.error('Erro ao buscar todas consultas:', error)
    return []
  }

  return data || []
}

export async function getConsultasByPeriod(startDate: string, endDate: string): Promise<Consulta[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .gte('data_consulta', startDate)
    .lte('data_consulta', endDate)
    .order('data_consulta', { ascending: false })

  if (error) {
    console.error('Erro ao buscar consultas por período:', error)
    return []
  }

  return data || []
}

// ============ PARCELAS (INSTALLMENTS) ============

// Gerar parcelas automaticamente ao criar consulta parcelada
async function generateParcelas(
  consultaId: number,
  valorTotal: number,
  numParcelas: number,
  dataConsulta: string
): Promise<boolean> {
  const supabase = createClient()
  
  const valorParcela = Number((valorTotal / numParcelas).toFixed(2))
  const dataBase = new Date(dataConsulta)
  
  const parcelas: Omit<Parcela, 'id' | 'created_at' | 'updated_at'>[] = []
  
  for (let i = 1; i <= numParcelas; i++) {
    const dataVencimento = new Date(dataBase)
    dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1))
    
    parcelas.push({
      consulta_id: consultaId,
      numero_parcela: i,
      valor_parcela: valorParcela,
      data_vencimento: dataVencimento.toISOString().split('T')[0],
      data_pagamento: null,
      status: 'Pendente',
      metodo_pagamento: null,
      observacoes: null
    })
  }
  
  const { error } = await supabase.from('parcelas').insert(parcelas)
  
  if (error) {
    console.error('Erro ao gerar parcelas:', error)
    return false
  }
  
  return true
}

export async function getParcelasByConsultaId(consultaId: number): Promise<Parcela[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('parcelas')
    .select('*')
    .eq('consulta_id', consultaId)
    .order('numero_parcela', { ascending: true })

  if (error) {
    console.error('Erro ao buscar parcelas:', error)
    return []
  }

  return data || []
}

// Verifica se a tabela parcelas existe no banco de dados
export async function checkParcelasTableExists(): Promise<{ exists: boolean; error?: string }> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('parcelas')
      .select('id')
      .limit(1)
    
    if (error) {
      // Código 42P01 = tabela não existe no PostgreSQL
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { 
          exists: false, 
          error: 'A tabela "parcelas" não existe no banco de dados. Execute o arquivo supabase-migration-phase2.sql no SQL Editor do Supabase.' 
        }
      }
      
      // Outro erro (ex: permissão, RLS)
      return { 
        exists: false, 
        error: `Erro ao verificar tabela: ${error.message}` 
      }
    }
    
    return { exists: true }
  } catch (err) {
    return { 
      exists: false, 
      error: `Erro desconhecido: ${err instanceof Error ? err.message : 'Erro ao verificar tabela'}` 
    }
  }
}

export async function getParcelasPendentes(): Promise<Parcela[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('parcelas')
    .select('*')
    .in('status', ['Pendente', 'Atrasado'])
    .order('data_vencimento', { ascending: true })

  if (error) {
    console.error('Erro ao buscar parcelas pendentes:', error)
    console.error('Detalhes do erro:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    
    // Re-throw error para que o componente possa capturar
    throw new Error(`Falha ao buscar parcelas: ${error.message}. Código: ${error.code || 'desconhecido'}`)
  }

  return data || []
}

export async function updateParcelaStatus(
  parcelaId: number,
  status: 'Pago' | 'Pendente' | 'Atrasado',
  dataPagamento?: string,
  metodoPagamento?: string
): Promise<boolean> {
  const supabase = createClient()
  
  const updateData: any = { status }
  
  if (status === 'Pago') {
    updateData.data_pagamento = dataPagamento || new Date().toISOString().split('T')[0]
    if (metodoPagamento) {
      updateData.metodo_pagamento = metodoPagamento
    }
  } else {
    updateData.data_pagamento = null
  }
  
  const { error } = await supabase
    .from('parcelas')
    .update(updateData)
    .eq('id', parcelaId)

  if (error) {
    console.error('Erro ao atualizar status da parcela:', error)
    return false
  }

  return true
}

export async function deleteParcela(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('parcelas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar parcela:', error)
    return false
  }

  return true
}

// ============ TABELAS DE PREÇOS ============

export async function getTabelasPrecos(): Promise<TabelaPreco[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tabelas_precos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar tabelas de preços:', error)
    return []
  }

  return data || []
}

export async function getTabelaPrecoAtiva(): Promise<TabelaPreco | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tabelas_precos')
    .select('*')
    .eq('ativa', true)
    .eq('padrao', true)
    .single()

  if (error) {
    console.error('Erro ao buscar tabela de preços padrão:', error)
    return null
  }

  return data
}

export async function createTabelaPreco(payload: {
  nome: string
  descricao: string
  ativa: boolean
  padrao: boolean
}): Promise<TabelaPreco | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tabelas_precos')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar tabela de preços:', error)
    return null
  }

  return data as TabelaPreco
}

export async function updateTabelaPreco(
  id: number,
  payload: Partial<Omit<TabelaPreco, 'id' | 'created_at' | 'updated_at'>>
): Promise<TabelaPreco | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tabelas_precos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar tabela de preços:', error)
    return null
  }

  return data as TabelaPreco
}

export async function deleteTabelaPreco(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('tabelas_precos').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar tabela de preços:', error)
    return false
  }

  return true
}

// ============ ITENS DE TABELA DE PREÇOS ============

export async function getItensTabelaPreco(tabelaId: number): Promise<ItemTabelaPreco[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('itens_tabela_precos')
    .select('*')
    .eq('tabela_preco_id', tabelaId)
    .order('ordem', { ascending: true })

  if (error) {
    console.error('Erro ao buscar itens da tabela de preços:', error)
    return []
  }

  return data || []
}

export async function createItemTabelaPreco(payload: {
  tabela_preco_id: number
  tipo_servico: 'Consulta' | 'Sessão'
  descricao: string
  valor: number
  ordem: number
  ativo: boolean
}): Promise<ItemTabelaPreco | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('itens_tabela_precos')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar item de tabela de preços:', error)
    return null
  }

  return data as ItemTabelaPreco
}

export async function updateItemTabelaPreco(
  id: number,
  payload: Partial<Omit<ItemTabelaPreco, 'id' | 'created_at' | 'updated_at'>>
): Promise<ItemTabelaPreco | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('itens_tabela_precos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar item de tabela de preços:', error)
    return null
  }

  return data as ItemTabelaPreco
}

export async function deleteItemTabelaPreco(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('itens_tabela_precos').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar item de tabela de preços:', error)
    return false
  }

  return true
}

// ============ RELATÓRIOS E ANÁLISES ============

export interface RevenueByService {
  tipo: string
  total_receita: number
  quantidade: number
  ticket_medio: number
}

export async function getRevenueByService(startDate?: string, endDate?: string): Promise<RevenueByService[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('consultas')
    .select('tipo, valor_total, quantidade')
  
  if (startDate) {
    query = query.gte('data_consulta', startDate)
  }
  if (endDate) {
    query = query.lte('data_consulta', endDate)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Erro ao buscar receita por serviço:', error)
    return []
  }
  
  // Agrupar e calcular totais
  const grouped: Record<string, { total: number; quantidade: number }> = {}
  
  data?.forEach((item) => {
    if (!grouped[item.tipo]) {
      grouped[item.tipo] = { total: 0, quantidade: 0 }
    }
    grouped[item.tipo].total += item.valor_total
    grouped[item.tipo].quantidade += item.quantidade
  })
  
  return Object.entries(grouped).map(([tipo, values]) => ({
    tipo,
    total_receita: values.total,
    quantidade: values.quantidade,
    ticket_medio: values.quantidade > 0 ? values.total / values.quantidade : 0
  }))
}

// ============ PHASE 3: CATEGORIAS DE DESPESAS ============

export async function getCategoriasDespesas(): Promise<CategoriaDespesa[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categorias_despesas')
    .select('*')
    .eq('ativa', true)
    .order('ordem', { ascending: true })

  if (error) {
    console.error('Erro ao buscar categorias de despesas:', error)
    return []
  }

  return data || []
}

export async function createCategoriaDespesa(payload: Omit<CategoriaDespesa, 'id' | 'created_at' | 'updated_at'>): Promise<CategoriaDespesa | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categorias_despesas')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar categoria de despesa:', error)
    return null
  }

  return data as CategoriaDespesa
}

export async function updateCategoriaDespesa(id: number, payload: Partial<Omit<CategoriaDespesa, 'id' | 'created_at' | 'updated_at'>>): Promise<CategoriaDespesa | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categorias_despesas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar categoria de despesa:', error)
    return null
  }

  return data as CategoriaDespesa
}

export async function deleteCategoriaDespesa(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('categorias_despesas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar categoria de despesa:', error)
    return false
  }

  return true
}

// ============ PHASE 3: DESPESAS ============

export async function getDespesas(): Promise<Despesa[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .order('data', { ascending: false })

  if (error) {
    console.error('Erro ao buscar despesas:', error)
    return []
  }

  return data || []
}

export async function getDespesasByPeriod(startDate: string, endDate: string): Promise<Despesa[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .gte('data', startDate)
    .lte('data', endDate)
    .order('data', { ascending: false })

  if (error) {
    console.error('Erro ao buscar despesas por período:', error)
    return []
  }

  return data || []
}

export async function getDespesasByCategoria(categoriaId: number, startDate?: string, endDate?: string): Promise<Despesa[]> {
  const supabase = createClient()
  let query = supabase
    .from('despesas')
    .select('*')
    .eq('categoria_id', categoriaId)

  if (startDate) {
    query = query.gte('data', startDate)
  }
  if (endDate) {
    query = query.lte('data', endDate)
  }

  const { data, error } = await query.order('data', { ascending: false })

  if (error) {
    console.error('Erro ao buscar despesas por categoria:', error)
    return []
  }

  return data || []
}

export async function createDespesa(payload: Omit<Despesa, 'id' | 'created_at' | 'updated_at'>): Promise<Despesa | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('despesas')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar despesa:', error)
    return null
  }

  return data as Despesa
}

export async function updateDespesa(id: number, payload: Partial<Omit<Despesa, 'id' | 'created_at' | 'updated_at'>>): Promise<Despesa | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('despesas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar despesa:', error)
    return null
  }

  return data as Despesa
}

export async function deleteDespesa(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('despesas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar despesa:', error)
    return false
  }

  return true
}

// ============ PHASE 3: METAS ============

export async function getMetas(): Promise<Meta[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .order('data_inicio', { ascending: false })

  if (error) {
    console.error('Erro ao buscar metas:', error)
    return []
  }

  return data || []
}

export async function getMetasAtivas(): Promise<Meta[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('status', 'ativa')
    .order('data_inicio', { ascending: false })

  if (error) {
    console.error('Erro ao buscar metas ativas:', error)
    return []
  }

  return data || []
}

export async function createMeta(payload: Omit<Meta, 'id' | 'created_at' | 'updated_at'>): Promise<Meta | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('metas')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar meta:', error)
    return null
  }

  return data as Meta
}

export async function updateMeta(id: number, payload: Partial<Omit<Meta, 'id' | 'created_at' | 'updated_at'>>): Promise<Meta | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('metas')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar meta:', error)
    return null
  }

  return data as Meta
}

export async function deleteMeta(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('metas').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar meta:', error)
    return false
  }

  return true
}

// Helper: Calculate meta progress
export async function calculateMetaProgress(metaId: number): Promise<{ current: number; target: number; percentage: number; status: 'on_track' | 'at_risk' | 'behind' }> {
  const supabase = createClient()
  
  // Get meta details
  const { data: meta, error: metaError } = await supabase
    .from('metas')
    .select('*')
    .eq('id', metaId)
    .single()

  if (metaError || !meta) {
    return { current: 0, target: 0, percentage: 0, status: 'behind' }
  }

  let current = 0

  // Calculate current value based on tipo
  if (meta.tipo === 'receita') {
    const { data: consultas } = await supabase
      .from('consultas')
      .select('valor_total')
      .gte('data_consulta', meta.data_inicio)
      .lte('data_consulta', meta.data_fim)

    current = consultas?.reduce((sum, c) => sum + c.valor_total, 0) || 0
  } else if (meta.tipo === 'despesa') {
    const { data: despesas } = await supabase
      .from('despesas')
      .select('valor')
      .gte('data', meta.data_inicio)
      .lte('data', meta.data_fim)

    current = despesas?.reduce((sum, d) => sum + d.valor, 0) || 0
  } else if (meta.tipo === 'lucro') {
    const { data: consultas } = await supabase
      .from('consultas')
      .select('valor_total')
      .gte('data_consulta', meta.data_inicio)
      .lte('data_consulta', meta.data_fim)

    const { data: despesas } = await supabase
      .from('despesas')
      .select('valor')
      .gte('data', meta.data_inicio)
      .lte('data', meta.data_fim)

    const receita = consultas?.reduce((sum, c) => sum + c.valor_total, 0) || 0
    const despesa = despesas?.reduce((sum, d) => sum + d.valor, 0) || 0
    current = receita - despesa
  }

  const percentage = meta.valor_alvo > 0 ? (current / meta.valor_alvo) * 100 : 0
  
  let status: 'on_track' | 'at_risk' | 'behind' = 'on_track'
  if (percentage < 50) {
    status = 'behind'
  } else if (percentage < 80) {
    status = 'at_risk'
  }

  return {
    current,
    target: meta.valor_alvo,
    percentage,
    status
  }
}

// ============ PHASE 3: RECIBOS ============

export async function getRecibos(): Promise<Recibo[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recibos')
    .select('*')
    .order('data_emissao', { ascending: false })

  if (error) {
    console.error('Erro ao buscar recibos:', error)
    return []
  }

  return data || []
}

export async function getRecibosPorCliente(clienteId: number): Promise<Recibo[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recibos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data_emissao', { ascending: false })

  if (error) {
    console.error('Erro ao buscar recibos do cliente:', error)
    return []
  }

  return data || []
}

export async function generateNumeroRecibo(): Promise<string> {
  const supabase = createClient()
  
  // Get last receipt number
  const { data, error } = await supabase
    .from('recibos')
    .select('numero_recibo')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Erro ao gerar número de recibo:', error)
  }

  let nextNumber = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].numero_recibo
    const match = lastNumber.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0]) + 1
    }
  }

  const year = new Date().getFullYear()
  return `REC${year}-${nextNumber.toString().padStart(6, '0')}`
}

export async function createRecibo(payload: Omit<Recibo, 'id' | 'created_at'>): Promise<Recibo | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recibos')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar recibo:', error)
    return null
  }

  return data as Recibo
}

export async function updateRecibo(id: number, payload: Partial<Omit<Recibo, 'id' | 'created_at'>>): Promise<Recibo | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recibos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar recibo:', error)
    return null
  }

  return data as Recibo
}

export async function deleteRecibo(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('recibos').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar recibo:', error)
    return false
  }

  return true
}

// ============ PHASE 3: INTEGRACOES PAGAMENTO ============

export async function getIntegracoesPagamento(): Promise<IntegracaoPagamento[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integracoes_pagamento')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar integrações de pagamento:', error)
    return []
  }

  return data || []
}

export async function getIntegracaoAtiva(provedor: 'mercadopago' | 'stripe' | 'pagseguro'): Promise<IntegracaoPagamento | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integracoes_pagamento')
    .select('*')
    .eq('provedor', provedor)
    .eq('ativa', true)
    .eq('ambiente', 'production')
    .single()

  if (error) {
    console.error('Erro ao buscar integração ativa:', error)
    return null
  }

  return data as IntegracaoPagamento
}

export async function createIntegracaoPagamento(payload: Omit<IntegracaoPagamento, 'id' | 'created_at' | 'updated_at'>): Promise<IntegracaoPagamento | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integracoes_pagamento')
    .insert([payload])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar integração de pagamento:', error)
    return null
  }

  return data as IntegracaoPagamento
}

export async function updateIntegracaoPagamento(id: number, payload: Partial<Omit<IntegracaoPagamento, 'id' | 'created_at' | 'updated_at'>>): Promise<IntegracaoPagamento | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('integracoes_pagamento')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar integração de pagamento:', error)
    return null
  }

  return data as IntegracaoPagamento
}

export async function deleteIntegracaoPagamento(id: number): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('integracoes_pagamento').delete().eq('id', id)

  if (error) {
    console.error('Erro ao deletar integração de pagamento:', error)
    return false
  }

  return true
}
