"use client"

/**
 * EXPENSE MANAGEMENT WITH PAYMENT TRACKING
 */

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getDespesasByPeriod,
  createDespesa,
  updateDespesa,
  deleteDespesa,
  getCategoriasDespesas,
  createCategoriaDespesa,
  updateCategoriaDespesa,
  deleteCategoriaDespesa,
  type Despesa,
  type CategoriaDespesa
} from "@/lib/supabase"
import { format, subMonths, parseISO, startOfMonth, endOfMonth, isPast } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingDown,
  Filter,
  Settings,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

// Extended Despesa interface with payment tracking fields
interface DespesaWithPayment extends Despesa {
  pago?: boolean
  data_pagamento?: string | null
  valor_pago?: number | null
}

export function ExpenseManagement({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [despesas, setDespesas] = useState<DespesaWithPayment[]>([])
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialogs
  const [isDespesaDialogOpen, setIsDespesaDialogOpen] = useState(false)
  const [isCategoriaDialogOpen, setIsCategoriaDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  
  // Forms
  const [despesaForm, setDespesaForm] = useState({
    id: 0,
    data: format(new Date(), 'yyyy-MM-dd'),
    categoria_id: 0,
    descricao: '',
    valor: '',
    forma_pagamento: 'PIX' as string,
    recorrente: false,
    frequencia_recorrencia: null as 'mensal' | 'trimestral' | 'anual' | null,
    observacoes: '',
    pago: false,
    data_pagamento: '',
    valor_pago: ''
  })
  
  const [categoriaForm, setCategoriaForm] = useState({
    id: 0,
    nome: '',
    descricao: '',
    cor: '#ef4444',
    icone: '💸',
    ativa: true,
    ordem: 0
  })
  
  const [paymentForm, setPaymentForm] = useState({
    despesa_id: 0,
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    valor_pago: '',
    forma_pagamento: 'PIX'
  })
  
  const [despesaToDelete, setDespesaToDelete] = useState<DespesaWithPayment | null>(null)
  
  // Filters
  // Date range is controlled by FinancialDashboard (global filter)
  const [categoriaFilter, setCategoriaFilter] = useState<number | 'all'>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all')
  
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  async function loadData() {
    setIsLoading(true)
    try {
      const [despesasData, categoriasData] = await Promise.all([
        getDespesasByPeriod(dateFrom, dateTo),
        getCategoriasDespesas()
      ])
      
      setDespesas(despesasData)
      setCategorias(categoriasData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro ao carregar despesas",
        description: "Não foi possível carregar as despesas.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get payment status
  const getPaymentStatus = (despesa: DespesaWithPayment): 'paid' | 'unpaid' | 'overdue' => {
    if (despesa.pago) return 'paid'
    if (isPast(new Date(despesa.data))) return 'overdue'
    return 'unpaid'
  }

  // Filtrar despesas
  const filteredDespesas = useMemo(() => {
    return despesas.filter(d => {
      // Status filter
      if (statusFilter !== 'all') {
        const status = getPaymentStatus(d)
        if (status !== statusFilter) return false
      }
      
      // Other filters
      if (categoriaFilter !== 'all' && d.categoria_id !== categoriaFilter) return false
      if (paymentMethodFilter !== 'all' && d.forma_pagamento !== paymentMethodFilter) return false
      if (searchTerm && !d.descricao.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }, [despesas, categoriaFilter, paymentMethodFilter, searchTerm, statusFilter])

  // Calcular totais com rastreamento de pagamento
  const summary = useMemo(() => {
    const total = filteredDespesas.reduce((sum, d) => sum + d.valor, 0)
    const pago = filteredDespesas.filter(d => d.pago).reduce((sum, d) => sum + (d.valor_pago || d.valor), 0)
    const pendente = filteredDespesas.filter(d => !d.pago && !isPast(new Date(d.data))).reduce((sum, d) => sum + d.valor, 0)
    const atrasado = filteredDespesas.filter(d => !d.pago && isPast(new Date(d.data))).reduce((sum, d) => sum + d.valor, 0)
    
    // Por categoria
    const porCategoria = categorias.map(cat => {
      const despesasCat = filteredDespesas.filter(d => d.categoria_id === cat.id)
      return {
        categoria: cat.nome,
        cor: cat.cor,
        total: despesasCat.reduce((sum, d) => sum + d.valor, 0),
        pago: despesasCat.filter(d => d.pago).reduce((sum, d) => sum + (d.valor_pago || d.valor), 0),
        pendente: despesasCat.filter(d => !d.pago).reduce((sum, d) => sum + d.valor, 0)
      }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
    
    const maisCaraCategoria = porCategoria[0] || { categoria: 'N/A', total: 0 }
    
    return {
      total,
      pago,
      pendente,
      atrasado,
      porCategoria,
      maisCaraCategoria
    }
  }, [filteredDespesas, categorias])

  // Dados para gráfico de pizza com status de pagamento
  const pieChartData = useMemo(() => {
    return summary.porCategoria.map(c => ({
      name: c.categoria,
      value: c.total,
      pago: c.pago,
      pendente: c.pendente,
      cor: c.cor
    }))
  }, [summary])

  // Dados para gráfico de barras (últimos 6 meses)
  const barChartData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthStart = format(startOfMonth(date), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(date), 'yyyy-MM-dd')
      const monthName = format(date, 'MMM/yy', { locale: ptBR })
      
      // Buscar despesas do mês (do array completo, não filtrado)
      const despesasMes = despesas.filter(d => d.data >= monthStart && d.data <= monthEnd)
      const total = despesasMes.reduce((sum, d) => sum + d.valor, 0)
      const pago = despesasMes.filter(d => d.pago).reduce((sum, d) => sum + (d.valor_pago || d.valor), 0)
      const pendente = total - pago
      
      months.push({ month: monthName, total, pago, pendente })
    }
    return months
  }, [despesas])

  function openNewDespesaDialog() {
    setDespesaForm({
      id: 0,
      data: format(new Date(), 'yyyy-MM-dd'),
      categoria_id: categorias[0]?.id || 0,
      descricao: '',
      valor: '',
      forma_pagamento: 'PIX',
      recorrente: false,
      frequencia_recorrencia: null,
      observacoes: '',
      pago: false,
      data_pagamento: '',
      valor_pago: ''
    })
    setIsDespesaDialogOpen(true)
  }

  function openEditDespesaDialog(despesa: DespesaWithPayment) {
    setDespesaForm({
      id: despesa.id,
      data: despesa.data,
      categoria_id: despesa.categoria_id,
      descricao: despesa.descricao,
      valor: despesa.valor.toString(),
      forma_pagamento: despesa.forma_pagamento || 'PIX',
      recorrente: despesa.recorrente,
      frequencia_recorrencia: despesa.frequencia_recorrencia,
      observacoes: despesa.observacoes || '',
      pago: despesa.pago || false,
      data_pagamento: despesa.data_pagamento || '',
      valor_pago: despesa.valor_pago?.toString() || ''
    })
    setIsDespesaDialogOpen(true)
  }

  async function saveDespesa() {
    if (!despesaForm.descricao.trim() || !despesaForm.valor || despesaForm.categoria_id === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    const payload = {
      data: despesaForm.data,
      categoria_id: despesaForm.categoria_id,
      descricao: despesaForm.descricao,
      valor: parseFloat(despesaForm.valor),
      forma_pagamento: despesaForm.forma_pagamento,
      recorrente: despesaForm.recorrente,
      frequencia_recorrencia: despesaForm.recorrente ? despesaForm.frequencia_recorrencia : null,
      observacoes: despesaForm.observacoes || null,
      anexo_url: null,
      // Payment tracking fields (will be ignored if columns don't exist)
      pago: despesaForm.pago,
      data_pagamento: despesaForm.pago && despesaForm.data_pagamento ? despesaForm.data_pagamento : null,
      valor_pago: despesaForm.valor_pago ? parseFloat(despesaForm.valor_pago) : null
    }

    let success = false
    if (despesaForm.id === 0) {
      const result = await createDespesa(payload)
      success = result !== null
    } else {
      const result = await updateDespesa(despesaForm.id, payload)
      success = result !== null
    }

    if (success) {
      toast({
        title: despesaForm.id === 0 ? "Despesa criada" : "Despesa atualizada",
        description: "Despesa salva com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setIsDespesaDialogOpen(false)
      loadData()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a despesa.",
        variant: "destructive"
      })
    }
  }

  function openMarkAsPaidDialog(despesa: DespesaWithPayment) {
    setPaymentForm({
      despesa_id: despesa.id,
      data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      valor_pago: despesa.valor.toString(),
      forma_pagamento: despesa.forma_pagamento || 'PIX'
    })
    setIsPaymentDialogOpen(true)
  }

  async function handleMarkAsPaid() {
    if (!paymentForm.valor_pago) {
      toast({
        title: "Valor obrigatório",
        description: "Informe o valor pago.",
        variant: "destructive"
      })
      return
    }

    const result = await updateDespesa(paymentForm.despesa_id, {
      pago: true,
      data_pagamento: paymentForm.data_pagamento,
      valor_pago: parseFloat(paymentForm.valor_pago),
      forma_pagamento: paymentForm.forma_pagamento
    })

    if (result) {
      toast({
        title: "Pagamento registrado",
        description: "Despesa marcada como paga.",
        className: "bg-green-50 border-green-200"
      })
      setIsPaymentDialogOpen(false)
      loadData()
    } else {
      toast({
        title: "Erro ao registrar pagamento",
        description: "Não foi possível atualizar a despesa.",
        variant: "destructive"
      })
    }
  }

  function confirmDeleteDespesa(despesa: DespesaWithPayment) {
    setDespesaToDelete(despesa)
    setIsDeleteDialogOpen(true)
  }

  async function handleDeleteDespesa() {
    if (!despesaToDelete) return

    const success = await deleteDespesa(despesaToDelete.id)
    
    if (success) {
      toast({
        title: "Despesa excluída",
        description: "Despesa removida com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setIsDeleteDialogOpen(false)
      setDespesaToDelete(null)
      loadData()
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a despesa.",
        variant: "destructive"
      })
    }
  }

  function openNewCategoriaDialog() {
    setCategoriaForm({
      id: 0,
      nome: '',
      descricao: '',
      cor: '#ef4444',
      icone: '💸',
      ativa: true,
      ordem: categorias.length + 1
    })
    setIsCategoriaDialogOpen(true)
  }

  function openEditCategoriaDialog(categoria: CategoriaDespesa) {
    setCategoriaForm({
      id: categoria.id,
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor,
      icone: categoria.icone || '💸',
      ativa: categoria.ativa,
      ordem: categoria.ordem
    })
    setIsCategoriaDialogOpen(true)
  }

  async function saveCategoria() {
    if (!categoriaForm.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da categoria.",
        variant: "destructive"
      })
      return
    }

    const payload = {
      nome: categoriaForm.nome,
      descricao: categoriaForm.descricao || null,
      cor: categoriaForm.cor,
      icone: categoriaForm.icone || null,
      ativa: categoriaForm.ativa,
      ordem: categoriaForm.ordem
    }

    let success = false
    if (categoriaForm.id === 0) {
      const result = await createCategoriaDespesa(payload)
      success = result !== null
    } else {
      const result = await updateCategoriaDespesa(categoriaForm.id, payload)
      success = result !== null
    }

    if (success) {
      toast({
        title: categoriaForm.id === 0 ? "Categoria criada" : "Categoria atualizada",
        description: "Categoria salva com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setIsCategoriaDialogOpen(false)
      loadData()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a categoria.",
        variant: "destructive"
      })
    }
  }

  async function handleDeleteCategoria(id: number) {
    // Verificar se há despesas usando esta categoria
    const despesasComCategoria = despesas.filter(d => d.categoria_id === id)
    if (despesasComCategoria.length > 0) {
      toast({
        title: "Categoria em uso",
        description: `Não é possível excluir. Existem ${despesasComCategoria.length} despesa(s) usando esta categoria.`,
        variant: "destructive"
      })
      return
    }

    const success = await deleteCategoriaDespesa(id)
    
    if (success) {
      toast({
        title: "Categoria excluída",
        description: "Categoria removida com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      loadData()
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a categoria.",
        variant: "destructive"
      })
    }
  }

  const getCategoriaNome = (categoriaId: number) => {
    return categorias.find(c => c.id === categoriaId)?.nome || 'Sem categoria'
  }

  const getCategoriaCor = (categoriaId: number) => {
    return categorias.find(c => c.id === categoriaId)?.cor || '#6b7280'
  }

  const getStatusBadge = (despesa: DespesaWithPayment) => {
    const status = getPaymentStatus(despesa)
    
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300">
            🟢 Pago
          </Badge>
        )
      case 'unpaid':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300">
            🟡 Pendente
          </Badge>
        )
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-300">
            🔴 Atrasado
          </Badge>
        )
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Despesas com Controle de Pagamentos</h2>
          <p className="text-muted-foreground">Controle completo de gastos, categorias e pagamentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoriaDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Categorias
          </Button>
          <Button onClick={openNewDespesaDialog} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Summary Cards com Status de Pagamento */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.total)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredDespesas.length} despesa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Despesas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.pago)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredDespesas.filter(d => d.pago).length} despesa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.pendente)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredDespesas.filter(d => !d.pago && !isPast(new Date(d.data))).length} despesa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.atrasado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredDespesas.filter(d => !d.pago && isPast(new Date(d.data))).length} despesa(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição dos gastos (pago vs pendente)</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name, props: any) => {
                      const pago = props.payload.pago || 0
                      const pendente = props.payload.pendente || 0
                      return [
                        `Total: ${formatCurrency(value)} | Pago: ${formatCurrency(pago)} | Pendente: ${formatCurrency(pendente)}`,
                        name
                      ]
                    }} 
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal - Pago vs Pendente</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {barChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="pago" stackId="a" fill="#10b981" name="Pago" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pendente" stackId="a" fill="#eab308" name="Pendente" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              <Label>Status de Pagamento</Label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="unpaid">Pendente</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoriaFilter.toString()} onValueChange={(v) => setCategoriaFilter(v === 'all' ? 'all' : parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense List with Payment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
          <CardDescription>
            {filteredDespesas.length} despesa(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDespesas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma despesa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDespesas.map((despesa) => {
                    const valorPago = despesa.valor_pago || 0
                    const saldo = despesa.valor - valorPago
                    
                    return (
                      <TableRow key={despesa.id}>
                        <TableCell>{getStatusBadge(despesa)}</TableCell>
                        <TableCell>
                          {format(parseISO(despesa.data), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            style={{ 
                              backgroundColor: `${getCategoriaCor(despesa.categoria_id)}20`,
                              color: getCategoriaCor(despesa.categoria_id),
                              borderColor: getCategoriaCor(despesa.categoria_id)
                            }}
                            className="border"
                          >
                            {getCategoriaNome(despesa.categoria_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{despesa.descricao}</p>
                            {despesa.recorrente && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Recorrente - {despesa.frequencia_recorrencia}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatCurrency(despesa.valor)}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {despesa.pago ? formatCurrency(valorPago) : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-orange-600">
                          {despesa.pago && saldo > 0 ? formatCurrency(saldo) : '-'}
                        </TableCell>
                        <TableCell>
                          {despesa.pago && despesa.data_pagamento ? (
                            <div className="text-xs">
                              <p className="text-muted-foreground">Pago em:</p>
                              <p className="font-medium">{format(parseISO(despesa.data_pagamento), "dd/MM/yyyy")}</p>
                            </div>
                          ) : (
                            <Badge variant="secondary">{despesa.forma_pagamento || 'N/A'}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!despesa.pago && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMarkAsPaidDialog(despesa)}
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Marcar Pago
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDespesaDialog(despesa)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmDeleteDespesa(despesa)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog - Nova/Editar Despesa */}
      <Dialog open={isDespesaDialogOpen} onOpenChange={setIsDespesaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {despesaForm.id === 0 ? 'Nova Despesa' : 'Editar Despesa'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da despesa e status de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={despesaForm.data}
                  onChange={(e) => setDespesaForm({ ...despesaForm, data: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={despesaForm.categoria_id.toString()}
                  onValueChange={(v) => setDespesaForm({ ...despesaForm, categoria_id: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.ativa).map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.icone} {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={despesaForm.descricao}
                onChange={(e) => setDespesaForm({ ...despesaForm, descricao: e.target.value })}
                placeholder="Ex: Aluguel, Energia, Material de escritório"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={despesaForm.valor}
                  onChange={(e) => setDespesaForm({ ...despesaForm, valor: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={despesaForm.forma_pagamento}
                  onValueChange={(v) => setDespesaForm({ ...despesaForm, forma_pagamento: v })}
                >
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

            {/* Payment Tracking Section */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Status de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div>
                    <Label>Despesa Paga</Label>
                    <p className="text-xs text-muted-foreground">Marque se já foi pago</p>
                  </div>
                  <Switch
                    checked={despesaForm.pago}
                    onCheckedChange={(checked) => setDespesaForm({ 
                      ...despesaForm, 
                      pago: checked,
                      data_pagamento: checked ? format(new Date(), 'yyyy-MM-dd') : '',
                      valor_pago: checked ? despesaForm.valor : ''
                    })}
                  />
                </div>

                {despesaForm.pago && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data de Pagamento</Label>
                      <Input
                        type="date"
                        value={despesaForm.data_pagamento}
                        onChange={(e) => setDespesaForm({ ...despesaForm, data_pagamento: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Pago (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={despesaForm.valor_pago}
                        onChange={(e) => setDespesaForm({ ...despesaForm, valor_pago: e.target.value })}
                        placeholder={despesaForm.valor || "0.00"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para usar o valor total
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Despesa Recorrente</Label>
                <p className="text-xs text-muted-foreground">Se repete periodicamente</p>
              </div>
              <Switch
                checked={despesaForm.recorrente}
                onCheckedChange={(checked) => setDespesaForm({ 
                  ...despesaForm, 
                  recorrente: checked,
                  frequencia_recorrencia: checked ? 'mensal' : null
                })}
              />
            </div>

            {despesaForm.recorrente && (
              <div className="space-y-2">
                <Label>Frequência de Recorrência</Label>
                <Select
                  value={despesaForm.frequencia_recorrencia || 'mensal'}
                  onValueChange={(v) => setDespesaForm({ 
                    ...despesaForm, 
                    frequencia_recorrencia: v as 'mensal' | 'trimestral' | 'anual'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={despesaForm.observacoes}
                onChange={(e) => setDespesaForm({ ...despesaForm, observacoes: e.target.value })}
                placeholder="Notas adicionais sobre esta despesa"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDespesaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveDespesa} className="bg-green-600 hover:bg-green-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Marcar como Pago */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Despesa como Paga</DialogTitle>
            <DialogDescription>
              Registre o pagamento desta despesa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data de Pagamento</Label>
              <Input
                type="date"
                value={paymentForm.data_pagamento}
                onChange={(e) => setPaymentForm({ ...paymentForm, data_pagamento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.valor_pago}
                onChange={(e) => setPaymentForm({ ...paymentForm, valor_pago: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={paymentForm.forma_pagamento}
                onValueChange={(v) => setPaymentForm({ ...paymentForm, forma_pagamento: v })}
              >
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
            <Button onClick={handleMarkAsPaid} className="bg-green-600 hover:bg-green-700">
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Gerenciar Categorias */}
      <Dialog open={isCategoriaDialogOpen} onOpenChange={setIsCategoriaDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogDescription>
              Adicione, edite ou remova categorias de despesas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {categoriaForm.id === 0 || categoriaForm.id !== 0 ? (
              <div className="p-4 border rounded-lg space-y-4">
                <h4 className="font-semibold">
                  {categoriaForm.id === 0 ? 'Nova Categoria' : 'Editar Categoria'}
                </h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome *</Label>
                    <Input
                      value={categoriaForm.nome}
                      onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                      placeholder="Ex: Aluguel, Energia, Marketing"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input
                      type="color"
                      value={categoriaForm.cor}
                      onChange={(e) => setCategoriaForm({ ...categoriaForm, cor: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ícone (Emoji)</Label>
                    <Input
                      value={categoriaForm.icone}
                      onChange={(e) => setCategoriaForm({ ...categoriaForm, icone: e.target.value })}
                      placeholder="💸"
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Descrição</Label>
                    <Input
                      value={categoriaForm.descricao}
                      onChange={(e) => setCategoriaForm({ ...categoriaForm, descricao: e.target.value })}
                      placeholder="Descrição opcional"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Categoria Ativa</Label>
                  <Switch
                    checked={categoriaForm.ativa}
                    onCheckedChange={(checked) => setCategoriaForm({ ...categoriaForm, ativa: checked })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveCategoria} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    {categoriaForm.id === 0 ? 'Adicionar' : 'Salvar'}
                  </Button>
                  {categoriaForm.id !== 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setCategoriaForm({
                        id: 0, nome: '', descricao: '', cor: '#ef4444', 
                        icone: '💸', ativa: true, ordem: categorias.length + 1
                      })}
                    >
                      Cancelar Edição
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <h4 className="font-semibold">Categorias Existentes</h4>
              {categorias.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${cat.cor}30` }}
                    >
                      {cat.icone}
                    </div>
                    <div>
                      <p className="font-medium">{cat.nome}</p>
                      {cat.descricao && (
                        <p className="text-xs text-muted-foreground">{cat.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cat.ativa ? "default" : "secondary"}>
                      {cat.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditCategoriaDialog(cat)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCategoria(cat.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsCategoriaDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Confirmar Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a despesa "{despesaToDelete?.descricao}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteDespesa}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
