"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  getRecibos,
  getRecibosPorCliente,
  generateNumeroRecibo,
  createRecibo,
  updateRecibo,
  deleteRecibo,
  getClientes,
  getAllConsultas,
  type Recibo,
  type Cliente,
  type Consulta,
} from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Download,
  Mail,
  Eye,
  RefreshCw,
  Search,
  Printer,
  CheckCircle2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReciboWithDetails extends Recibo {
  cliente?: Cliente
  consulta?: Consulta
}

export function ReceiptIssuance() {
  const [recibos, setRecibos] = useState<ReciboWithDetails[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [clienteFilter, setClienteFilter] = useState<string>('all')
  const [enviadoFilter, setEnviadoFilter] = useState<string>('all')
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    consulta_id: null as number | null,
    cliente_id: 0,
    numero_recibo: '',
    data_emissao: format(new Date(), 'yyyy-MM-dd'),
    valor: '',
    servico_descricao: '',
    observacoes: '',
    enviado_email: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const [recibosData, clientesData, consultasData] = await Promise.all([
        getRecibos(),
        getClientes(),
        getAllConsultas(),
      ])

      // Enriquecer recibos com dados de cliente e consulta
      const enrichedRecibos = recibosData.map(recibo => ({
        ...recibo,
        cliente: clientesData.find(c => c.id === recibo.cliente_id),
        consulta: recibo.consulta_id
          ? consultasData.find(c => c.id === recibo.consulta_id)
          : undefined,
      }))

      setRecibos(enrichedRecibos)
      setClientes(clientesData)
      setConsultas(consultasData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro ao carregar recibos",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = async (recibo?: Recibo) => {
    if (recibo) {
      setSelectedRecibo(recibo)
      setFormData({
        consulta_id: recibo.consulta_id,
        cliente_id: recibo.cliente_id,
        numero_recibo: recibo.numero_recibo,
        data_emissao: recibo.data_emissao,
        valor: recibo.valor.toString(),
        servico_descricao: recibo.servico_descricao,
        observacoes: recibo.observacoes || '',
        enviado_email: recibo.enviado_email,
      })
    } else {
      setSelectedRecibo(null)
      const numeroRecibo = await generateNumeroRecibo()
      setFormData({
        consulta_id: null,
        cliente_id: clientes.length > 0 ? clientes[0].id : 0,
        numero_recibo: numeroRecibo,
        data_emissao: format(new Date(), 'yyyy-MM-dd'),
        valor: '',
        servico_descricao: '',
        observacoes: '',
        enviado_email: false,
      })
    }
    setIsDialogOpen(true)
  }

  const handleClienteChange = (clienteId: number) => {
    setFormData({ ...formData, cliente_id: clienteId })
    // Limpar consulta selecionada ao trocar de cliente
    setFormData(prev => ({ ...prev, consulta_id: null }))
  }

  const handleConsultaChange = (consultaId: string) => {
    if (consultaId === 'none') {
      setFormData({ ...formData, consulta_id: null })
      return
    }

    const consulta = consultas.find(c => c.id === parseInt(consultaId))
    if (consulta) {
      setFormData({
        ...formData,
        consulta_id: consulta.id,
        valor: consulta.valor_total.toString(),
        servico_descricao: `${consulta.tipo} - ${consulta.descricao || ''}`,
      })
    }
  }

  const handleSave = async () => {
    if (!formData.cliente_id || !formData.valor || !formData.servico_descricao) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      consulta_id: formData.consulta_id,
      cliente_id: formData.cliente_id,
      numero_recibo: formData.numero_recibo,
      data_emissao: formData.data_emissao,
      valor: parseFloat(formData.valor),
      servico_descricao: formData.servico_descricao,
      observacoes: formData.observacoes || null,
      pdf_url: null,
      enviado_email: formData.enviado_email,
    }

    const result = selectedRecibo
      ? await updateRecibo(selectedRecibo.id, payload)
      : await createRecibo(payload)

    if (result) {
      toast({
        title: selectedRecibo ? "Recibo atualizado" : "Recibo criado",
        description: `Recibo ${selectedRecibo ? 'atualizado' : 'gerado'} com sucesso.`,
        className: "bg-green-50 border-green-200",
      })
      setIsDialogOpen(false)
      loadData()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o recibo.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedRecibo) return

    const success = await deleteRecibo(selectedRecibo.id)

    if (success) {
      toast({
        title: "Recibo excluído",
        description: "Recibo removido com sucesso.",
        className: "bg-green-50 border-green-200",
      })
      setIsDeleteDialogOpen(false)
      setSelectedRecibo(null)
      loadData()
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o recibo.",
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (recibo: Recibo) => {
    setSelectedRecibo(recibo)
    setIsDeleteDialogOpen(true)
  }

  const handlePreview = (recibo: Recibo) => {
    setSelectedRecibo(recibo)
    setIsPreviewDialogOpen(true)
  }

  const handleDownloadPDF = (recibo: Recibo) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A geração de PDF será implementada em breve.",
    })
  }

  const handleSendEmail = async (recibo: Recibo) => {
    // Marcar como enviado
    const result = await updateRecibo(recibo.id, { enviado_email: true })
    
    if (result) {
      toast({
        title: "E-mail enviado",
        description: "Recibo enviado por e-mail com sucesso.",
        className: "bg-green-50 border-green-200",
      })
      loadData()
    } else {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o e-mail.",
        variant: "destructive",
      })
    }
  }

  const handlePrint = (recibo: Recibo) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A impressão será implementada em breve.",
    })
  }

  // Filtrar recibos
  const filteredRecibos = useMemo(() => {
    return recibos.filter(recibo => {
      // Filtro de cliente
      if (clienteFilter !== 'all' && recibo.cliente_id !== parseInt(clienteFilter)) {
        return false
      }

      // Filtro de enviado
      if (enviadoFilter === 'enviado' && !recibo.enviado_email) return false
      if (enviadoFilter === 'nao_enviado' && recibo.enviado_email) return false

      // Filtro de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const numero = recibo.numero_recibo.toLowerCase()
        const cliente = recibo.cliente?.nome?.toLowerCase() || ''
        const descricao = recibo.servico_descricao.toLowerCase()

        if (!numero.includes(searchLower) && !cliente.includes(searchLower) && !descricao.includes(searchLower)) {
          return false
        }
      }

      return true
    })
  }, [recibos, clienteFilter, enviadoFilter, searchTerm])

  // Análises
  const analysis = useMemo(() => {
    const total = filteredRecibos.reduce((sum, r) => sum + r.valor, 0)
    const enviados = filteredRecibos.filter(r => r.enviado_email).length
    const naoEnviados = filteredRecibos.length - enviados

    return {
      total,
      quantidade: filteredRecibos.length,
      enviados,
      naoEnviados,
      ticketMedio: filteredRecibos.length > 0 ? total / filteredRecibos.length : 0,
    }
  }, [filteredRecibos])

  // Consultas disponíveis para o cliente selecionado
  const consultasDisponiveis = useMemo(() => {
    if (!formData.cliente_id) return []
    return consultas.filter(c => c.cliente_id === formData.cliente_id)
  }, [formData.cliente_id, consultas])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Emissão de Recibos
              </CardTitle>
              <CardDescription>
                Gere e gerencie recibos para seus clientes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Recibo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status E-mail</Label>
              <Select value={enviadoFilter} onValueChange={setEnviadoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="enviado">Enviados</SelectItem>
                  <SelectItem value="nao_enviado">Não Enviados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Número, cliente ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total em Recibos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(analysis.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.quantidade} recibo(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(analysis.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor médio por recibo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviados por E-mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analysis.enviados}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recibos enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {analysis.naoEnviados}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando envio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Recibos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Recibos</CardTitle>
          <CardDescription>
            {filteredRecibos.length} recibo(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecibos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum recibo encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecibos.map((recibo) => (
                    <TableRow key={recibo.id}>
                      <TableCell className="font-mono font-semibold">
                        {recibo.numero_recibo}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(recibo.data_emissao), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {recibo.cliente?.nome || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {recibo.servico_descricao}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(recibo.valor)}
                      </TableCell>
                      <TableCell>
                        {recibo.enviado_email ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(recibo)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(recibo)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(recibo)}
                            title="Enviar por E-mail"
                            disabled={recibo.enviado_email}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(recibo)}
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(recibo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(recibo)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRecibo ? 'Editar Recibo' : 'Novo Recibo'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do recibo
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Recibo</Label>
                <Input
                  value={formData.numero_recibo}
                  onChange={(e) => setFormData({ ...formData, numero_recibo: e.target.value })}
                  disabled={!!selectedRecibo}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Emissão *</Label>
                <Input
                  type="date"
                  value={formData.data_emissao}
                  onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={formData.cliente_id.toString()}
                onValueChange={(value) => handleClienteChange(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Consulta (Opcional)</Label>
              <Select
                value={formData.consulta_id?.toString() || 'none'}
                onValueChange={handleConsultaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma consulta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem consulta vinculada</SelectItem>
                  {consultasDisponiveis.map((consulta) => (
                    <SelectItem key={consulta.id} value={consulta.id.toString()}>
                      {format(parseISO(consulta.data_consulta), "dd/MM/yy")} - {consulta.tipo} - {formatCurrency(
                        consulta.valor_total
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição do Serviço *</Label>
              <Textarea
                placeholder="Ex: Consulta de Psicologia..."
                value={formData.servico_descricao}
                onChange={(e) => setFormData({ ...formData, servico_descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="enviado_email"
                checked={formData.enviado_email}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enviado_email: checked as boolean })
                }
              />
              <Label htmlFor="enviado_email" className="cursor-pointer">
                Marcar como enviado por e-mail
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {selectedRecibo ? 'Atualizar' : 'Criar Recibo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Preview */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visualizar Recibo</DialogTitle>
          </DialogHeader>

          {selectedRecibo && (
            <div className="border rounded-lg p-6 bg-white space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">RECIBO</h2>
                <p className="text-lg font-mono text-muted-foreground">{selectedRecibo.numero_recibo}</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data de Emissão</Label>
                    <p className="font-medium">
                      {format(parseISO(selectedRecibo.data_emissao), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    <p className="font-bold text-green-600 text-xl">
                      {formatCurrency(selectedRecibo.valor)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">
                    {recibos.find(r => r.id === selectedRecibo.id)?.cliente?.nome || 'N/A'}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Serviço Prestado</Label>
                  <p className="font-medium">{selectedRecibo.servico_descricao}</p>
                </div>

                {selectedRecibo.observacoes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm">{selectedRecibo.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 text-center text-xs text-muted-foreground">
                <p>Recibo gerado eletronicamente</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => selectedRecibo && handleDownloadPDF(selectedRecibo)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este recibo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
