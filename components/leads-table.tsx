"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { ChevronLeft, ChevronRight, Lock, Unlock, Filter, MessageCircle, Phone, MessageSquareText, Pencil, ArrowUpDown } from "lucide-react"
import { getClientes, updateClienteStatus, updateClienteTag, updateClienteProduto, type Cliente } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const getTagColor = (tag: string | null) => {
  if (!tag) return ""
  const t = tag.toLowerCase().trim()
  if (t === "em atendimento") return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
  if (t === "agendado") return "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
  if (t === "cancelado") return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
  if (t === "paciente") return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100"
  if (t === "paciente_tratamento") return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100"
  if (t === "lead") return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100"
  return ""
}

const PRODUTOS_OPTIONS = ["VPPB", "Labirintite", "Dor Facial", "Zumbido", "Outros"]

export function LeadsTable() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(25)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showFollowUpFilter, setShowFollowUpFilter] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [isProdutoDialogOpen, setIsProdutoDialogOpen] = useState(false)
  const [currentEditClienteId, setCurrentEditClienteId] = useState<number | null>(null)
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([])

  const [sortConfig, setSortConfig] = useState<{ key: keyof Cliente | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" })

  const [filterProduto, setFilterProduto] = useState<string>("all")
  const [filterTag, setFilterTag] = useState<string>("all")
  const [filterInteressado, setFilterInteressado] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const loadClientes = async () => {
    setLoading(true)
    try {
      const data = await getClientes()
      if (data.length > 0) {
        setClientes(data)
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClientes()
  }, [])

  let filteredClientes = clientes.filter((cliente) => {
    if (showFollowUpFilter && cliente.follow_up < 1) return false
    
    if (filterProduto !== "all") {
      if (!cliente.servico_interesse || !cliente.servico_interesse.includes(filterProduto)) return false
    }

    if (filterTag !== "all") {
      if (filterTag === "empty") {
        if (cliente.tag_status) return false
      } else {
        const tag = cliente.tag_status?.toLowerCase().trim() || ""
        if (tag !== filterTag) return false
      }
    }

    if (filterInteressado !== "all") {
      const isInteressado = cliente.interessado ? "sim" : "nao"
      if (isInteressado !== filterInteressado) return false
    }

    if (filterStatus !== "all") {
      const isTravado = cliente.trava ? "travado" : "ativo"
      if (isTravado !== filterStatus) return false
    }

    return true
  })

  const handleSort = (key: keyof Cliente) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  if (sortConfig.key) {
    filteredClientes.sort((a, b) => {
      let aValue = a[sortConfig.key!]
      let bValue = b[sortConfig.key!]

      if (typeof aValue === "string") aValue = aValue.toLowerCase()
      if (typeof bValue === "string") bValue = bValue.toLowerCase()

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }
  const filteredItemsCount = filteredClientes.length
  const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(filteredItemsCount / itemsPerPage)
  const startIndex = (currentPage - 1) * (itemsPerPage === "all" ? filteredItemsCount : itemsPerPage)
  const endIndex = itemsPerPage === "all" ? filteredItemsCount : startIndex + (itemsPerPage as number)
  const currentClientes = filteredClientes.slice(startIndex, endIndex)

  const handleUpdateTag = async (clienteId: number, newTag: string) => {
    const valueToSave = newTag === "" ? null : newTag
    const success = await updateClienteTag(clienteId, valueToSave)

    if (success) {
      setClientes((prevClientes) =>
        prevClientes.map((c) => {
          if (c.id === clienteId) {
            return { ...c, tag_status: valueToSave }
          }
          return c
        })
      )
      toast({
        title: "Tag atualizada",
        description: "A tag foi atualizada com sucesso.",
      })
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tag.",
        variant: "destructive",
      })
    }
  }

  const handleSaveProdutos = async () => {
    if (currentEditClienteId === null) return
    
    const valueToSave = selectedProdutos.length > 0 ? selectedProdutos.join(", ") : null
    const success = await updateClienteProduto(currentEditClienteId, valueToSave)

    if (success) {
      setClientes((prevClientes) =>
        prevClientes.map((c) => {
          if (c.id === currentEditClienteId) {
            return { ...c, servico_interesse: valueToSave }
          }
          return c
        })
      )
      toast({
        title: "Produtos atualizados",
        description: "Os produtos do cliente foram atualizados com sucesso.",
      })
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os produtos.",
        variant: "destructive",
      })
    }
    
    setIsProdutoDialogOpen(false)
    setCurrentEditClienteId(null)
  }

  const handleToggleConversation = async (clienteId: number, clienteName: string | null) => {
    const cliente = clientes.find((c) => c.id === clienteId)
    if (!cliente) return

    const newTravaStatus = !cliente.trava
    const shouldClearMensagem = !newTravaStatus // "destravar" is newTravaStatus = false

    const success = await updateClienteStatus(clienteId, newTravaStatus, shouldClearMensagem)

    if (success) {
      setClientes((prevClientes) =>
        prevClientes.map((c) => {
          if (c.id === clienteId) {
            return {
              ...c,
              trava: newTravaStatus,
              ...(shouldClearMensagem ? { mensagem_para_humano: null } : {}),
            }
          }
          return c
        })
      )

      const action = newTravaStatus ? "travada" : "destravada"
      toast({
        title: `Conversa ${action}`,
        description: `A conversa com ${clienteName} foi ${action} com sucesso.`,
      })
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da conversa.",
        variant: "destructive",
      })
    }
  }

  const toggleFollowUpFilter = () => {
    setShowFollowUpFilter(!showFollowUpFilter)
    setCurrentPage(1)
  }

  const clearFilter = () => {
    setShowFollowUpFilter(false)
    setFilterProduto("all")
    setFilterTag("all")
    setFilterInteressado("all")
    setFilterStatus("all")
    setCurrentPage(1)
  }

  const renderSortableHeader = (label: string, sortKey: keyof Cliente) => (
    <TableHead className="cursor-pointer hover:bg-muted/50 select-none transition-colors" onClick={() => handleSort(sortKey)}>
      <div className="flex items-center whitespace-nowrap">
        {label}
        {sortConfig.key === sortKey ? (
          <span className="text-[10px] ml-1.5 text-foreground">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-20 ml-1.5" />
        )}
      </div>
    </TableHead>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--whatsapp-green)] text-white">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span>Clientes do WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            {!showFollowUpFilter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFollowUpFilter}
                className="flex items-center gap-2 bg-transparent"
              >
                <Filter className="h-4 w-4" />
                Follow Up
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" onClick={toggleFollowUpFilter} className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Follow Up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilter}
                  className="flex items-center gap-2 bg-transparent"
                >
                  Mostrar Todos
                </Button>
              </div>
            )}
            <Badge variant="secondary">
              {filteredClientes.length} {(filterProduto !== "all" || filterTag !== "all" || filterInteressado !== "all" || filterStatus !== "all" || showFollowUpFilter) ? "filtrados" : "clientes"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando clientes...</div>
          </div>
        ) : (
          <>
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-transparent p-4 rounded-lg border border-border">
              <span className="text-sm font-medium text-muted-foreground mr-1">Filtrar por:</span>
              
              <select
                value={filterProduto}
                onChange={(e) => { setFilterProduto(e.target.value); setCurrentPage(1) }}
                className="text-sm border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--whatsapp-green)] bg-background text-foreground min-w-[140px]"
              >
                <option value="all">Produto (Todos)</option>
                {PRODUTOS_OPTIONS.map(prod => <option key={prod} value={prod}>{prod}</option>)}
              </select>

              <select
                value={filterTag}
                onChange={(e) => { setFilterTag(e.target.value); setCurrentPage(1) }}
                className="text-sm border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--whatsapp-green)] bg-background text-foreground min-w-[140px]"
              >
                <option value="all">Tag (Todas)</option>
                <option value="em atendimento">Em Atendimento</option>
                <option value="agendado">Agendado</option>
                <option value="cancelado">Cancelado</option>
                <option value="paciente">Paciente</option>
                <option value="paciente_tratamento">Paciente Tratamento</option>
                <option value="lead">Lead</option>
                <option value="empty">Sem Tag</option>
              </select>

              <select
                value={filterInteressado}
                onChange={(e) => { setFilterInteressado(e.target.value); setCurrentPage(1) }}
                className="text-sm border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--whatsapp-green)] bg-background text-foreground min-w-[140px]"
              >
                <option value="all">Interessado (Todos)</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
                className="text-sm border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--whatsapp-green)] bg-background text-foreground min-w-[140px]"
              >
                <option value="all">Status (Todos)</option>
                <option value="ativo">Ativo</option>
                <option value="travado">Travado</option>
              </select>

              {(filterProduto !== "all" || filterTag !== "all" || filterInteressado !== "all" || filterStatus !== "all" || showFollowUpFilter) && (
                <Button variant="ghost" size="sm" onClick={clearFilter} className="text-xs h-8 ml-auto text-muted-foreground hover:text-red-500">
                  Limpar Filtros
                </Button>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader("Nome", "nome")}
                    {renderSortableHeader("Telefone", "telefone")}
                    {renderSortableHeader("Interessado", "interessado")}
                    {renderSortableHeader("Produto", "servico_interesse")}
                    {renderSortableHeader("Tag", "tag_status")}
                    {renderSortableHeader("Status", "trava")}
                    {renderSortableHeader("Msg Humana", "mensagem_para_humano")}
                    {renderSortableHeader("Follow Up", "follow_up")}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome || "Sem nome"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-[var(--whatsapp-green)]" />
                          <span className="text-sm">{cliente.telefone || "Sem telefone"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.interessado ? "default" : "secondary"}>
                          {cliente.interessado ? "Sim" : "Não"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="max-w-[150px]" title={cliente.servico_interesse || ""}>
                            {cliente.servico_interesse ? (
                              <div className="flex flex-wrap gap-1">
                                {cliente.servico_interesse.split(",").map((p) => (
                                  <Badge key={p.trim()} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">{p.trim()}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Não informado</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-30 hover:opacity-100 shrink-0"
                            onClick={() => {
                              setCurrentEditClienteId(cliente.id)
                              setSelectedProdutos(cliente.servico_interesse ? cliente.servico_interesse.split(",").map(s => s.trim()) : [])
                              setIsProdutoDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={cliente.tag_status || ""}
                          onChange={(e) => handleUpdateTag(cliente.id, e.target.value)}
                          className={`text-xs rounded-full px-2 py-1 font-medium cursor-pointer border outline-none ${
                            cliente.tag_status ? getTagColor(cliente.tag_status) : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          <option value="">Selecione...</option>
                          <option value="Em Atendimento">Em Atendimento</option>
                          <option value="Agendado">Agendado</option>
                          <option value="Cancelado">Cancelado</option>
                          <option value="Paciente">Paciente</option>
                          <option value="paciente_tratamento">Paciente Tratamento</option>
                          <option value="Lead">Lead</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={!cliente.trava ? "default" : "secondary"}
                          className={!cliente.trava ? "text-white" : "text-orange-500"}
                        >
                          {!cliente.trava ? "Ativo" : "Travado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.mensagem_para_humano ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent cursor-pointer text-blue-500 hover:bg-blue-50 hover:text-blue-600">
                                <MessageSquareText className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mensagem do Lead</AlertDialogTitle>
                                <AlertDialogDescription className="whitespace-pre-wrap">
                                  {cliente.mensagem_para_humano}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Fechar</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.follow_up > 1 ? "default" : "outline"}>{cliente.follow_up}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 bg-transparent hover:bg-[var(--whatsapp-green)] hover:text-white cursor-pointer"
                            onClick={() => {
                              const phoneNumber = cliente.telefone?.replace(/\D/g, "") // Remove non-digits
                              if (phoneNumber) {
                                const waLink = `https://wa.me/${phoneNumber}`
                                window.open(waLink, "_blank")
                              }
                            }}
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent cursor-pointer">
                                {cliente.trava ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{cliente.trava ? "Destravar" : "Travar"} conversa</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja {cliente.trava ? "destravar" : "travar"} a conversa com{" "}
                                  {cliente.nome}?
                                  {cliente.trava
                                    ? " A automação do WhatsApp voltará a funcionar normalmente."
                                    : " A automação do WhatsApp será pausada para este cliente."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleToggleConversation(cliente.id, cliente.nome)}>
                                  {cliente.trava ? "Destravar" : "Travar"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {filteredItemsCount === 0 ? 0 : startIndex + 1} a {Math.min(endIndex, filteredItemsCount)} de {filteredItemsCount}{" "}
                  {showFollowUpFilter ? "clientes com follow up > 1" : "clientes do WhatsApp"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Exibir:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const val = e.target.value
                      setItemsPerPage(val === "all" ? "all" : Number(val))
                      setCurrentPage(1)
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--whatsapp-green)] text-foreground cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                    <option value="all">Todos</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber
                    if (totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i
                    } else {
                      pageNumber = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal de Edição de Produtos */}
            <AlertDialog open={isProdutoDialogOpen} onOpenChange={setIsProdutoDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Editar Produtos de Interesse</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 mt-4 text-foreground text-sm">
                      <p className="text-muted-foreground mb-4">Selecione os produtos que este lead tem interesse:</p>
                      {PRODUTOS_OPTIONS.map((prod) => (
                        <label key={prod} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                          <input
                            type="checkbox"
                            checked={selectedProdutos.includes(prod)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedProdutos([...selectedProdutos, prod])
                              else setSelectedProdutos(selectedProdutos.filter((p) => p !== prod))
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-[var(--whatsapp-green)] focus:ring-[var(--whatsapp-green)]"
                          />
                          <span className="font-medium">{prod}</span>
                        </label>
                      ))}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel onClick={() => setIsProdutoDialogOpen(false)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSaveProdutos} className="bg-[var(--whatsapp-green)] hover:bg-[var(--whatsapp-green)]/90 text-white">Salvar Produtos</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  )
}
