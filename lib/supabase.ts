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
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
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
  last_followup: string | null
  servico_interesse: string | null
  followup_status: string
  mensagem_para_humano: string | null
  tag_status: string | null
  tag_timestamp?: string | null
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

export async function addCliente(payload: { nome: string, telefone: string, tag_status: string | null, servico_interesse: string | null, interessado: boolean }): Promise<Cliente | null> {
  const supabase = createClient()
  
  const insertData = {
    nome: payload.nome,
    telefone: payload.telefone,
    tag_status: payload.tag_status || null,
    servico_interesse: payload.servico_interesse || null,
    interessado: payload.interessado,
    trava: false, // AI ativo / untrapped
    follow_up: 0,
    followup_status: "iniciado",
    mensagem_para_humano: null
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
