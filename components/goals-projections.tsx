"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
import {
  getMetas,
  getMetasAtivas,
  createMeta,
  updateMeta,
  deleteMeta,
  calculateMetaProgress,
  type Meta,
} from "@/lib/supabase"
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, addMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface MetaWithProgress extends Meta {
  progress?: {
    current: number
    target: number
    percentage: number
    status: 'on_track' | 'at_risk' | 'behind'
  }
}

export function GoalsProjections() {
  const [metas, setMetas] = useState<MetaWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMeta, setSelectedMeta] = useState<Meta | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    tipo: 'receita' as 'receita' | 'despesa' | 'lucro',
    nome: '',
    descricao: '',
    valor_alvo: '',
    periodo: 'mensal' as 'mensal' | 'trimestral' | 'anual',
    data_inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    data_fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    status: 'ativa' as 'ativa' | 'pausada' | 'concluida',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const metasData = await getMetas()

      // Calcular progresso para cada meta
      const metasWithProgress = await Promise.all(
        metasData.map(async (meta) => {
          const progress = await calculateMetaProgress(meta.id)
          return { ...meta, progress }
        })
      )

      setMetas(metasWithProgress)
    } catch (error) {
      console.error("Erro ao carregar metas:", error)
      toast({
        title: "Erro ao carregar metas",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (meta?: Meta) => {
    if (meta) {
      setSelectedMeta(meta)
      setFormData({
        tipo: meta.tipo,
        nome: meta.nome,
        descricao: meta.descricao || '',
        valor_alvo: meta.valor_alvo.toString(),
        periodo: meta.periodo,
        data_inicio: meta.data_inicio,
        data_fim: meta.data_fim,
        status: meta.status,
      })
    } else {
      setSelectedMeta(null)
      const inicio = startOfMonth(new Date())
      const fim = endOfMonth(new Date())
      setFormData({
        tipo: 'receita',
        nome: '',
        descricao: '',
        valor_alvo: '',
        periodo: 'mensal',
        data_inicio: format(inicio, 'yyyy-MM-dd'),
        data_fim: format(fim, 'yyyy-MM-dd'),
        status: 'ativa',
      })
    }
    setIsDialogOpen(true)
  }

  const handlePeriodoChange = (periodo: 'mensal' | 'trimestral' | 'anual') => {
    const inicio = startOfMonth(new Date())
    let fim: Date

    if (periodo === 'mensal') {
      fim = endOfMonth(inicio)
    } else if (periodo === 'trimestral') {
      fim = endOfMonth(addMonths(inicio, 2))
    } else {
      fim = endOfMonth(addMonths(inicio, 11))
    }

    setFormData({
      ...formData,
      periodo,
      data_inicio: format(inicio, 'yyyy-MM-dd'),
      data_fim: format(fim, 'yyyy-MM-dd'),
    })
  }

  const handleSave = async () => {
    if (!formData.nome || !formData.valor_alvo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      tipo: formData.tipo,
      nome: formData.nome,
      descricao: formData.descricao || null,
      valor_alvo: parseFloat(formData.valor_alvo),
      periodo: formData.periodo,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      status: formData.status,
    }

    const result = selectedMeta
      ? await updateMeta(selectedMeta.id, payload)
      : await createMeta(payload)

    if (result) {
      toast({
        title: selectedMeta ? "Meta atualizada" : "Meta criada",
        description: `Meta ${selectedMeta ? 'atualizada' : 'cadastrada'} com sucesso.`,
        className: "bg-green-50 border-green-200",
      })
      setIsDialogOpen(false)
      loadData()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a meta.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedMeta) return

    const success = await deleteMeta(selectedMeta.id)

    if (success) {
      toast({
        title: "Meta excluída",
        description: "Meta removida com sucesso.",
        className: "bg-green-50 border-green-200",
      })
      setIsDeleteDialogOpen(false)
      setSelectedMeta(null)
      loadData()
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a meta.",
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (meta: Meta) => {
    setSelectedMeta(meta)
    setIsDeleteDialogOpen(true)
  }

  const handleQuickStatusChange = async (meta: Meta, newStatus: 'ativa' | 'pausada' | 'concluida') => {
    const result = await updateMeta(meta.id, { status: newStatus })
    if (result) {
      toast({
        title: "Status atualizado",
        description: `Meta marcada como ${newStatus}.`,
        className: "bg-green-50 border-green-200",
      })
      loadData()
    }
  }

  // Filtrar metas
  const filteredMetas = useMemo(() => {
    return metas.filter(meta => {
      if (filterStatus !== 'all' && meta.status !== filterStatus) return false
      if (filterTipo !== 'all' && meta.tipo !== filterTipo) return false
      return true
    })
  }, [metas, filterStatus, filterTipo])

  // Análises
  const analysis = useMemo(() => {
    const ativas = filteredMetas.filter(m => m.status === 'ativa')
    const concluidas = filteredMetas.filter(m => m.status === 'concluida')
    const emRisco = ativas.filter(m => m.progress?.status === 'at_risk' || m.progress?.status === 'behind')

    const totalAlvo = ativas.reduce((sum, m) => sum + m.valor_alvo, 0)
    const totalAtual = ativas.reduce((sum, m) => sum + (m.progress?.current || 0), 0)
    const percentualGeral = totalAlvo > 0 ? (totalAtual / totalAlvo) * 100 : 0

    return {
      total: filteredMetas.length,
      ativas: ativas.length,
      concluidas: concluidas.length,
      emRisco: emRisco.length,
      totalAlvo,
      totalAtual,
      percentualGeral,
    }
  }, [filteredMetas])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativa':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Clock className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        )
      case 'pausada':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <PauseCircle className="h-3 w-3 mr-1" />
            Pausada
          </Badge>
        )
      case 'concluida':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluída
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getProgressStatusBadge = (status: 'on_track' | 'at_risk' | 'behind') => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">No Caminho</Badge>
      case 'at_risk':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Em Risco</Badge>
      case 'behind':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Atrasada</Badge>
      default:
        return null
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'receita':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'despesa':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'lucro':
        return <Target className="h-4 w-4 text-blue-600" />
      default:
        return null
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
      {/* Header com Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Metas e Projeções
              </CardTitle>
              <CardDescription>
                Defina e acompanhe suas metas financeiras
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ativa">Ativas</SelectItem>
                  <SelectItem value="pausada">Pausadas</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="lucro">Lucro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Metas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analysis.ativas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {analysis.total} metas totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {analysis.percentualGeral.toFixed(1)}%
            </div>
            <Progress value={analysis.percentualGeral} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Metas em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {analysis.emRisco}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              necessitam atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Metas Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {analysis.concluidas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              objetivos alcançados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metas Ativas com Cards Visuais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMetas
          .filter(m => m.status === 'ativa')
          .map((meta) => {
            const progress = meta.progress
            const percentage = progress?.percentage || 0
            const daysLeft = differenceInDays(parseISO(meta.data_fim), new Date())

            return (
              <Card key={meta.id} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                  {getTipoIcon(meta.tipo)}
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTipoIcon(meta.tipo)}
                        <Badge variant="outline" className="text-xs">
                          {meta.tipo}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{meta.nome}</CardTitle>
                    </div>
                    {progress && getProgressStatusBadge(progress.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Atual</p>
                      <p className="font-semibold text-green-600">{formatCurrency(progress?.current || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Meta</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(meta.valor_alvo)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Período encerrado'}
                        </span>
                      </div>
                      <span>{format(parseISO(meta.data_fim), "dd/MM/yy")}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenDialog(meta)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickStatusChange(meta, 'concluida')}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Tabela de Todas as Metas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Metas</CardTitle>
          <CardDescription>
            {filteredMetas.length} meta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma meta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetas.map((meta) => {
                    const progress = meta.progress
                    const percentage = progress?.percentage || 0

                    return (
                      <TableRow key={meta.id}>
                        <TableCell>{getStatusBadge(meta.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTipoIcon(meta.tipo)}
                            <span className="capitalize">{meta.tipo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{meta.nome}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(parseISO(meta.data_inicio), "dd/MM/yy")} -</p>
                            <p>{format(parseISO(meta.data_fim), "dd/MM/yy")}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(meta.valor_alvo)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(progress?.current || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={percentage} className="h-2 w-24" />
                            <p className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(meta)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(meta)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMeta ? 'Editar Meta' : 'Nova Meta'}
            </DialogTitle>
            <DialogDescription>
              Defina os parâmetros da meta financeira
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value as 'receita' | 'despesa' | 'lucro' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="lucro">Lucro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Período *</Label>
                <Select value={formData.periodo} onValueChange={(value) => handlePeriodoChange(value as any)}>
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
            </div>

            <div className="space-y-2">
              <Label>Nome da Meta *</Label>
              <Input
                placeholder="Ex: Receita Mensal, Redução de Custos..."
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes sobre a meta..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Alvo *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.valor_alvo}
                onChange={(e) => setFormData({ ...formData, valor_alvo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as 'ativa' | 'pausada' | 'concluida' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {selectedMeta ? 'Atualizar' : 'Criar'}
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
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
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
