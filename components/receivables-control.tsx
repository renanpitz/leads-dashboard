"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  getParcelasPendentes, 
  getAllConsultas, 
  updateParcelaStatus,
  checkParcelasTableExists,
  type Parcela,
  type Consulta
} from "@/lib/supabase"
import { format, parseISO, differenceInDays, addDays, addMonths, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign,
  TrendingUp,
  Filter
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

type StatusFilter = 'Todos' | 'Pendente' | 'Pago' | 'Atrasado'

interface ParcelaWithConsulta extends Parcela {
  consulta?: Consulta
}

export function ReceivablesControl() {
  const [parcelas, setParcelas] = useState<ParcelaWithConsulta[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedParcela, setSelectedParcela] = useState<Parcela | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX')
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [tableMissingError, setTableMissingError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    setTableMissingError(null)
    
    try {
      // Primeiro, verificar se a tabela parcelas existe
      const tableCheck = await checkParcelasTableExists()
      
      if (!tableCheck.exists) {
        setTableMissingError(tableCheck.error || 'Tabela parcelas não encontrada')
        setIsLoading(false)
        return
      }
      
      // Se a tabela existe, buscar os dados
      const [parcelasData, consultasData] = await Promise.all([
        getParcelasPendentes(),
        getAllConsultas()
      ])
      
      // Enriquecer parcelas com dados da consulta
      const enrichedParcelas = parcelasData.map(parcela => ({
        ...parcela,
        consulta: consultasData.find(c => c.id === parcela.consulta_id)
      }))
      
      setParcelas(enrichedParcelas)
      setConsultas(consultasData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      // Verificar se é erro de tabela não existente
      if (errorMessage.includes('does not exist') || errorMessage.includes('42P01')) {
        setTableMissingError(
          'A tabela "parcelas" não existe no banco de dados. Execute a migração SQL primeiro.'
        )
      } else {
        toast({
          title: "Erro ao carregar parcelas",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsPaid = (parcela: Parcela) => {
    setSelectedParcela(parcela)
    setIsPaymentDialogOpen(true)
  }

  const confirmPayment = async () => {
    if (!selectedParcela) return

    const success = await updateParcelaStatus(
      selectedParcela.id,
      'Pago',
      new Date().toISOString().split('T')[0],
      paymentMethod
    )

    if (success) {
      toast({
        title: "Pagamento registrado",
        description: `Parcela ${selectedParcela.numero_parcela} marcada como paga.`,
        className: "bg-green-50 border-green-200"
      })
      loadData()
      setIsPaymentDialogOpen(false)
      setSelectedParcela(null)
    } else {
      toast({
        title: "Erro ao registrar pagamento",
        description: "Não foi possível atualizar o status da parcela.",
        variant: "destructive"
      })
    }
  }

  // Filtrar parcelas
  const filteredParcelas = useMemo(() => {
    return parcelas.filter(parcela => {
      // Filtro de status
      if (statusFilter !== 'Todos' && parcela.status !== statusFilter) {
        return false
      }

      // Filtro de data
      if (dateFrom && parcela.data_vencimento < dateFrom) return false
      if (dateTo && parcela.data_vencimento > dateTo) return false

      // Filtro de busca (procura no ID ou descrição da consulta)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const consultaDesc = parcela.consulta?.descricao?.toLowerCase() || ''
        const consultaId = parcela.consulta_id.toString()
        
        if (!consultaDesc.includes(searchLower) && !consultaId.includes(searchLower)) {
          return false
        }
      }

      return true
    })
  }, [parcelas, statusFilter, dateFrom, dateTo, searchTerm])

  // Análise de vencimento (aging)
  const agingAnalysis = useMemo(() => {
    const hoje = new Date()
    const today = hoje.toISOString().split('T')[0]
    const nextWeek = addDays(hoje, 7).toISOString().split('T')[0]
    const nextMonth = addMonths(hoje, 1).toISOString().split('T')[0]

    const overdue = parcelas.filter(p => p.status === 'Atrasado')
    const dueThisWeek = parcelas.filter(p => 
      p.status === 'Pendente' && 
      p.data_vencimento >= today && 
      p.data_vencimento <= nextWeek
    )
    const dueNextMonth = parcelas.filter(p => 
      p.status === 'Pendente' && 
      p.data_vencimento > nextWeek && 
      p.data_vencimento <= nextMonth
    )

    return {
      overdue: {
        count: overdue.length,
        total: overdue.reduce((sum, p) => sum + p.valor_parcela, 0)
      },
      dueThisWeek: {
        count: dueThisWeek.length,
        total: dueThisWeek.reduce((sum, p) => sum + p.valor_parcela, 0)
      },
      dueNextMonth: {
        count: dueNextMonth.length,
        total: dueNextMonth.reduce((sum, p) => sum + p.valor_parcela, 0)
      }
    }
  }, [parcelas])

  // Total de recebíveis
  const totalReceivables = useMemo(() => {
    const pending = parcelas.filter(p => p.status !== 'Pago')
    return pending.reduce((sum, p) => sum + p.valor_parcela, 0)
  }, [parcelas])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>
      case 'Pendente':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>
      case 'Atrasado':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Atrasado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getDaysInfo = (dataVencimento: string) => {
    const hoje = new Date()
    const vencimento = parseISO(dataVencimento)
    const dias = differenceInDays(vencimento, hoje)

    if (dias < 0) {
      return <span className="text-red-600 text-sm font-medium">{Math.abs(dias)} dias em atraso</span>
    } else if (dias === 0) {
      return <span className="text-orange-600 text-sm font-medium">Vence hoje</span>
    } else if (dias <= 7) {
      return <span className="text-yellow-600 text-sm font-medium">Vence em {dias} dias</span>
    } else {
      return <span className="text-muted-foreground text-sm">Vence em {dias} dias</span>
    }
  }

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

  // Se a tabela parcelas não existe, mostrar instruções de migração
  if (tableMissingError) {
    return (
      <div className="space-y-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-orange-600 mt-1" />
              <div className="flex-1">
                <CardTitle className="text-orange-900">Migração de Banco de Dados Necessária</CardTitle>
                <CardDescription className="text-orange-700 mt-2">
                  {tableMissingError}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <h3 className="font-semibold text-sm mb-3 text-gray-900">Como executar a migração:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-600">1.</span>
                  <span>Acesse o <strong>Supabase Dashboard</strong> do seu projeto</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-600">2.</span>
                  <span>Vá em <strong>SQL Editor</strong> no menu lateral</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-600">3.</span>
                  <span>Abra o arquivo <code className="bg-gray-100 px-2 py-1 rounded text-xs">supabase-migration-phase2.sql</code> do projeto</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-600">4.</span>
                  <span>Copie todo o conteúdo do arquivo e cole no SQL Editor</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-600">5.</span>
                  <span>Clique em <strong>Run</strong> para executar a migração</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-600">6.</span>
                  <span>Aguarde a confirmação de sucesso e <strong>recarregue esta página</strong></span>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-sm mb-2 text-blue-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                O que será criado:
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Tabela <strong>parcelas</strong> - para controle de parcelas e recebíveis</li>
                <li>• Tabela <strong>tabelas_precos</strong> - para gestão de preços</li>
                <li>• Tabela <strong>itens_tabela_precos</strong> - para itens de cada tabela de preços</li>
                <li>• Funções automáticas para atualizar status de parcelas atrasadas</li>
                <li>• Políticas de segurança (RLS) para proteger os dados</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={loadData} 
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Verificar Novamente
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              >
                Abrir Supabase Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{formatCurrency(totalReceivables)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {parcelas.filter(p => p.status !== 'Pago').length} parcelas pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(agingAnalysis.overdue.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agingAnalysis.overdue.count} parcela(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Esta Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(agingAnalysis.dueThisWeek.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agingAnalysis.dueThisWeek.count} parcela(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Próximo Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(agingAnalysis.dueNextMonth.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agingAnalysis.dueNextMonth.count} parcela(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Buscar por ID ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Vencimento De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Vencimento Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Parcelas */}
      <Card>
        <CardHeader>
          <CardTitle>Parcelas a Receber</CardTitle>
          <CardDescription>
            {filteredParcelas.length} parcela(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParcelas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParcelas.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                      <TableCell className="font-medium">
                        {parcela.numero_parcela}/{parcela.consulta?.parcelas || '?'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{parcela.consulta?.tipo || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {parcela.consulta?.descricao || 'Sem descrição'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(parcela.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(parcela.valor_parcela)}</TableCell>
                      <TableCell>{getDaysInfo(parcela.data_vencimento)}</TableCell>
                      <TableCell className="text-right">
                        {parcela.status !== 'Pago' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(parcela)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Marcar como Pago
                          </Button>
                        )}
                        {parcela.status === 'Pago' && parcela.data_pagamento && (
                          <span className="text-sm text-muted-foreground">
                            Pago em {format(parseISO(parcela.data_pagamento), "dd/MM/yy")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Registre o pagamento da parcela {selectedParcela?.numero_parcela}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor da Parcela</Label>
              <Input value={selectedParcela ? formatCurrency(selectedParcela.valor_parcela) : formatCurrency(0)} disabled />
            </div>

            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmPayment} className="bg-green-600 hover:bg-green-700">
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
