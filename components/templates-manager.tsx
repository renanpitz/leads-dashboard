"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash, Play, Copy, ArrowLeft, TerminalSquare, Pencil, Users, Send } from "lucide-react"
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, getClientes, type Template, type TemplateField, type Cliente } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const TAG_OPTIONS = [
  { value: "em atendimento", label: "Em Atendimento" },
  { value: "agendado", label: "Agendado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "paciente", label: "Paciente" },
  { value: "paciente_tratamento", label: "Paciente Trat" },
  { value: "lead", label: "Lead" },
  { value: "empty", label: "Sem Tag" }
]

const PRODUTOS_OPTIONS = ["VPPB", "Labirintite", "Dor Facial", "Zumbido", "Outros", "Sem Produto"]

export function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [viewState, setViewState] = useState<"list" | "create" | "use">("list")
  const { toast } = useToast()

  // Create / Edit State
  const [newName, setNewName] = useState("")
  const [newFields, setNewFields] = useState<TemplateField[]>([{ key: "", label: "" }])
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null)

  // Use (Execute) State
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [jsonOutput, setJsonOutput] = useState<string>("")
  const [isCopied, setIsCopied] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [lastFocus, setLastFocus] = useState<{key: string, start: number, end: number} | null>(null)
  const [targetEnv, setTargetEnv] = useState<"dev" | "prod">("dev")
  
  // Filter States
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tData, cData] = await Promise.all([getTemplates(), getClientes()])
      setTemplates(tData)
      setClientes(cData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // CRUD Templates
  const handleAddField = () => {
    setNewFields([...newFields, { key: "", label: "" }])
  }

  const handleRemoveField = (index: number) => {
    setNewFields(newFields.filter((_, i) => i !== index))
  }

  const handleUpdateField = (index: number, field: "key" | "label", value: string) => {
    const updated = [...newFields]
    updated[index][field] = value
    setNewFields(updated)
  }

  const handleSaveTemplate = async () => {
    if (!newName.trim()) {
      toast({ title: "Erro", description: "O nome do template é obrigatório", variant: "destructive" })
      return
    }

    const validFields = newFields.filter((f) => f.key.trim() && f.label.trim())
    if (validFields.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos um campo válido", variant: "destructive" })
      return
    }

    let savedTemplate;
    if (editTemplateId) {
      savedTemplate = await updateTemplate(editTemplateId, newName, validFields)
    } else {
      savedTemplate = await createTemplate(newName, validFields)
    }

    if (savedTemplate) {
      toast({ title: "Sucesso", description: editTemplateId ? "Template atualizado com sucesso!" : "Template criado com sucesso!" })
      setViewState("list")
      setNewName("")
      setNewFields([{ key: "", label: "" }])
      setEditTemplateId(null)
      loadData()
    } else {
      toast({ title: "Erro", description: "Falha ao salvar template no banco", variant: "destructive" })
    }
  }

  const handleEditTemplate = (template: Template) => {
    setNewName(template.name)
    setNewFields([...template.fields])
    setEditTemplateId(template.id)
    setViewState("create")
  }

  const handleDeleteTemplate = async (id: number) => {
    const success = await deleteTemplate(id)
    if (success) {
      toast({ title: "Removido", description: "Template excluído com sucesso." })
      setTemplates(templates.filter((t) => t.id !== id))
    }
  }

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({})
    setJsonOutput("")
    setIsCopied(false)
    setSelectedTags([])
    setSelectedProdutos([])
    setViewState("use")
  }

  const insertVariable = (variable: string) => {
    if (!lastFocus) {
      toast({ title: "Aviso", description: "Clique em um campo da mensagem abaixo primeiro para inserir." })
      return;
    }
    const { key, start, end } = lastFocus;
    const currentVal = formData[key] || "";
    const newVal = currentVal.substring(0, start) + variable + currentVal.substring(end);
    
    setFormData({ ...formData, [key]: newVal });
    setLastFocus({ key, start: start + variable.length, end: start + variable.length });
  }

  // Filter Logic
  const filteredClientes = clientes.filter(c => {
    // Tag Filter
    if (selectedTags.length > 0) {
      const cTag = (c.tag_status || "empty").toLowerCase().trim()
      if (!selectedTags.includes(cTag)) return false
    }

    // Produto Filter
    if (selectedProdutos.length > 0) {
      if (!c.servico_interesse) {
        if (!selectedProdutos.includes("Sem Produto")) return false
      } else {
        const leadProds = c.servico_interesse.split(",").map(s => s.trim())
        const hasMatch = leadProds.some(lp => selectedProdutos.includes(lp))
        if (!hasMatch) return false
      }
    }

    // Only include clients with a valid phone number.
    if (!c.telefone) return false

    return true
  })

  const handleGenerateJson = () => {
    if (!selectedTemplate) return
    
    if (filteredClientes.length === 0) {
      toast({ title: "Atenção", description: "Nenhum lead (com telefone) atende aos filtros definidos. Mude os filtros.", variant: "destructive" })
      return
    }

    // Build disparos array
    const disparos = filteredClientes.map(c => {
      const phoneOnly = c.telefone?.replace(/\D/g, '') || ""
      const firstName = c.nome ? c.nome.trim().split(" ")[0] : ""
      const produto = c.servico_interesse || ""
      
      const safeFormData = { ...formData }
      delete safeFormData.telefone
      delete safeFormData.nome

      // Replace variables in safeFormData
      Object.keys(safeFormData).forEach(key => {
        if (typeof safeFormData[key] === 'string') {
          safeFormData[key] = safeFormData[key]
            .replace(/\{\{Nome\}\}/gi, firstName)
            .replace(/\{\{Produto\}\}/gi, produto);
        }
      });

      return {
        nome: firstName,
        telefone: phoneOnly,
        ...safeFormData
      }
    })

    const outputString = JSON.stringify({ disparos }, null, 2)
    setJsonOutput(outputString)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonOutput)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast({ title: "Copiado", description: "JSON copiado para a área de transferência!" })
  }

  const executeDisparo = async () => {
    if (!jsonOutput) return;

    const webhookUrls = {
      dev: "https://workflow.renanmlops.online/webhook-test/receber-leads",
      prod: "https://webhookworkflow.renanmlops.online/webhook/receber-leads"
    }

    try {
      setIsSending(true);
      const response = await fetch(webhookUrls[targetEnv], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonOutput
      });

      if (response.ok) {
        toast({ title: "Sucesso", description: "Disparo enviado para o n8n com sucesso!" });
      } else {
        toast({ title: "Erro", description: "O n8n retornou um erro.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao conectar com o webhook do n8n.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Carregando dados...</div>
      </div>
    )
  }

  return (
    <Card className="min-h-[500px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--whatsapp-green)] text-white">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <span>Templates de Mensagens</span>
          </div>
          {viewState === "list" && (
            <Button onClick={() => {
                setViewState("create")
                setEditTemplateId(null)
                setNewName("")
                setNewFields([{ key: "", label: "" }])
            }} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          )}
          {viewState !== "list" && (
            <Button variant="outline" onClick={() => setViewState("list")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* LIST VIEW */}
        {viewState === "list" && (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhum template criado ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border border-border rounded-lg p-5 flex flex-col justify-between bg-card hover:border-[var(--whatsapp-green)] transition-colors">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{template.fields.length} campos dinâmicos</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <Button variant="default" size="sm" onClick={() => handleUseTemplate(template)} className="flex items-center gap-2 bg-[var(--whatsapp-green)] hover:bg-[var(--whatsapp-green)]/90 text-white flex-1 sm:flex-none justify-center">
                        <Play className="h-3 w-3" />
                        Usar
                      </Button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)} className="text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREATE VIEW */}
        {viewState === "create" && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Template</Label>
                <Input
                  id="template-name"
                  placeholder="Ex: Lembrete de Consulta"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="max-w-md"
                />
              </div>

              <div className="pt-4 space-y-4">
                <Label>Campos Dinâmicos (Sua Carga Variável)</Label>
                
                {newFields.map((field, index) => (
                  <div key={index} className="flex items-start gap-4 bg-muted/30 p-4 rounded-lg border">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Nome para Exibição (Visual)</Label>
                      <Input
                        placeholder="Ex: Nome do Cliente"
                        value={field.label}
                        onChange={(e) => handleUpdateField(index, "label", e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-muted-foreground">Chave JSON (Sem espaços)</Label>
                      <Input
                        placeholder="Ex: cliente_nome"
                        value={field.key}
                        onChange={(e) => handleUpdateField(index, "key", e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    {newFields.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)} className="mt-6 text-muted-foreground hover:text-red-500">
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={handleAddField} className="mt-2 border-dashed w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Campo Extra
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-border">
              <Button onClick={handleSaveTemplate} className="bg-[var(--whatsapp-green)] hover:bg-[var(--whatsapp-green)]/90 text-white">
                {editTemplateId ? "Salvar Alterações" : "Gravar Template"}
              </Button>
            </div>
          </div>
        )}

        {/* USE (EXECUTE) VIEW */}
        {viewState === "use" && selectedTemplate && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Form Left Side */}
            <div className="space-y-8">
              
              {/* SECTION 1: Filtros de Leads */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> 1. Público Alvo
                  </h3>
                  <Badge variant={filteredClientes.length > 0 ? "default" : "destructive"}>
                    {filteredClientes.length} Encontrado(s)
                  </Badge>
                </div>
                
                <div className="bg-muted/20 p-4 rounded-lg border space-y-5">
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold mb-3 block">Filtrar por Tags:</Label>
                    <div className="flex flex-wrap gap-2">
                      {TAG_OPTIONS.map(tag => (
                        <label key={tag.value} className="flex items-center space-x-2 cursor-pointer bg-background border rounded-md px-2 py-1 hover:border-[var(--whatsapp-green)] transition-all">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.value)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTags([...selectedTags, tag.value])
                              else setSelectedTags(selectedTags.filter(t => t !== tag.value))
                            }}
                            className="rounded border-input text-[var(--whatsapp-green)] focus:ring-[var(--whatsapp-green)]"
                          />
                          <span className="text-xs">{tag.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold mb-3 block">Filtrar por Produtos:</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRODUTOS_OPTIONS.map(prod => (
                        <label key={prod} className="flex items-center space-x-2 cursor-pointer bg-background border rounded-md px-2 py-1 hover:border-[var(--whatsapp-green)] transition-all">
                          <input
                            type="checkbox"
                            checked={selectedProdutos.includes(prod)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedProdutos([...selectedProdutos, prod])
                              else setSelectedProdutos(selectedProdutos.filter(p => p !== prod))
                            }}
                            className="rounded border-input text-[var(--whatsapp-green)] focus:ring-[var(--whatsapp-green)]"
                          />
                          <span className="text-xs">{prod}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500">
                    * É obrigatório selecionar pelo menos um filtro (Tag ou Produto) para realizar disparos.
                  </p>
                </div>
              </div>

              {/* SECTION 2: Payload Dinâmico */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-muted-foreground">
                  2. Conteúdo da Mensagem
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900/50">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Variáveis Dinâmicas</p>
                  <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mb-3 block">
                    Você pode digitar estas chaves nos campos abaixo. O sistema vai substituí-las automaticamente pelos dados associados a cada lead. (Clique para copiar)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="font-mono bg-white dark:bg-black/50 text-blue-700 dark:text-blue-300 cursor-pointer hover:border-blue-500 hover:bg-blue-100 transition-colors" onPointerDown={(e) => { e.preventDefault(); insertVariable("{{Nome}}"); }}>{"{{Nome}}"}</Badge>
                    <Badge variant="outline" className="font-mono bg-white dark:bg-black/50 text-blue-700 dark:text-blue-300 cursor-pointer hover:border-blue-500 hover:bg-blue-100 transition-colors" onPointerDown={(e) => { e.preventDefault(); insertVariable("{{Produto}}"); }}>{"{{Produto}}"}</Badge>
                  </div>
                </div>
                <div className="bg-muted/20 p-4 rounded-lg border space-y-4">
                  {selectedTemplate.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        placeholder="..."
                        value={formData[field.key] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        onBlur={(e) => setLastFocus({ key: field.key, start: e.target.selectionStart || 0, end: e.target.selectionEnd || 0 })}
                        onSelect={(e) => setLastFocus({ key: field.key, start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 })}
                        className="bg-background"
                      />
                    </div>
                  ))}
                  {selectedTemplate.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Este template não possui campos dinâmicos além do telefone.</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleGenerateJson} 
                disabled={filteredClientes.length === 0 || (selectedTags.length === 0 && selectedProdutos.length === 0)} 
                className="w-full bg-[var(--whatsapp-green)] hover:bg-[var(--whatsapp-green)]/90 text-white shadow-lg disabled:opacity-50 disabled:bg-muted-foreground"
              >
                {(selectedTags.length === 0 && selectedProdutos.length === 0) ? "Selecione um Filtro Acima Obrigatório" : `Gerar Lote (${filteredClientes.length} disparos)`}
              </Button>
            </div>

            {/* Output Right Side */}
            <div className="space-y-4 bg-muted/10 rounded-lg border flex flex-col sm:h-[calc(100vh-250px)] min-h-[400px] h-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b bg-muted/30 gap-4">
                <span className="font-mono text-sm font-semibold">Webook Payload (Final)</span>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopyJson} 
                    disabled={!jsonOutput || isSending}
                    className="h-8"
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    {isCopied ? "Copiado!" : "Copiar Payload"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        disabled={!jsonOutput || isSending}
                        className="h-8 bg-[var(--whatsapp-green)] hover:bg-[var(--whatsapp-green)]/90 text-white"
                      >
                        <Send className="h-3 w-3 mr-2" />
                        {isSending ? "Enviando..." : "Disparar Webhook"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Disparo em Lote</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="space-y-4 mt-2">
                            <p>Você está prestes a disparar no WhatsApp via n8n. Selecione o ambiente:</p>
                            
                            <div className="grid grid-cols-2 gap-2 my-2">
                              <div 
                                onClick={() => setTargetEnv("dev")}
                                className={`p-3 rounded-md border cursor-pointer text-center transition-all ${targetEnv === "dev" ? "bg-[var(--whatsapp-green)] text-white border-transparent" : "bg-muted/50 hover:bg-muted"}`}
                              >
                                <div className="font-bold">Desenvolvimento</div>
                                <div className="text-xs opacity-90 font-medium">Test / Listening Node</div>
                              </div>
                              <div 
                                onClick={() => setTargetEnv("prod")}
                                className={`p-3 rounded-md border cursor-pointer text-center transition-all ${targetEnv === "prod" ? "bg-[var(--whatsapp-green)] text-white border-transparent" : "bg-muted/50 hover:bg-muted"}`}
                              >
                                <div className="font-bold">Produção</div>
                                <div className="text-xs opacity-90 font-medium">Disparo Real (Ativo)</div>
                              </div>
                            </div>

                            <div className="bg-muted p-4 rounded-md text-sm text-foreground space-y-2 border">
                              <p><strong>Total de Leads (Disparos):</strong> <span className="font-bold text-[var(--whatsapp-green)]">{jsonOutput ? (JSON.parse(jsonOutput).disparos?.length || 0) : 0}</span></p>
                              <p><strong>Tags Selecionadas:</strong> {selectedTags.length > 0 ? selectedTags.join(", ") : "Nenhuma (Todos)"}</p>
                              <p><strong>Produtos Selecionados:</strong> {selectedProdutos.length > 0 ? selectedProdutos.join(", ") : "Nenhum (Todos)"}</p>
                            </div>
                            <p className="text-red-500 font-semibold text-sm">Esta ação não pode ser desfeita. Deseja prosseguir?</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDisparo} className="bg-[var(--whatsapp-green)] hover:bg-[var(--whatsapp-green)]/90 text-white">
                          Sim, Disparar Agora
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {jsonOutput ? (
                  <textarea 
                    value={jsonOutput}
                    readOnly
                    className="w-full h-full p-4 font-mono text-sm bg-black text-green-400 rounded-md border-0 resize-none outline-none focus:ring-0"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm italic">
                    <p>Filtre seus leads, preencha os dados e gere a carga.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
