"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Consulta } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  TrendingUp,
  Activity,
  DollarSign,
  Award,
  Target
} from "lucide-react"

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

interface ServiceStats {
  tipo_produto: string
  descricao: string
  quantidade: number
  receita_total: number
  ticket_medio: number
  percentual_quantidade: number
  percentual_receita: number
}

export function ServiceAnalysis({ consultas }: { consultas: Consulta[] }) {
  // componente agora recebe as consultas filtradas pelo dashboard (fonte única de verdade)

  const PRODUTOS_VALIDOS = useMemo(
    () => new Set(["VPPB", "Labirintite", "Dor Orofacial", "Zumbido", "Outros"]),
    []
  )

  const getProdutoCanonico = (raw: string | null | undefined) => {
    const cleaned = (raw || "").trim()
    if (!cleaned) return null

    // Se vier "VPPB, Zumbido" (ou similar), pega apenas o primeiro válido
    const parts = cleaned
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    for (const p of parts) {
      if (PRODUTOS_VALIDOS.has(p)) return p
    }

    // Também considera o campo inteiro, caso seja um único valor
    if (PRODUTOS_VALIDOS.has(cleaned)) return cleaned

    return null
  }

  const consultasComProdutoValido = useMemo(() => {
    return consultas
      .map((c) => {
        const produtoCanonico = getProdutoCanonico(c.produtos ?? c.descricao)
        if (!produtoCanonico) return null
        return { ...c, __produtoCanonico: produtoCanonico }
      })
      .filter(Boolean) as Array<Consulta & { __produtoCanonico: string }>
  }, [consultas])

  // Análise por tipo e descrição de serviço (SOMENTE produtos válidos)
  const serviceStats: ServiceStats[] = useMemo(() => {
    const grouped: Record<string, ServiceStats> = {}

    consultasComProdutoValido.forEach((c) => {
      const produto = c.__produtoCanonico
      const key = produto

      if (!grouped[key]) {
        grouped[key] = {
          tipo_produto: produto,
          descricao: produto,
          quantidade: 0,
          receita_total: 0,
          ticket_medio: 0,
          percentual_quantidade: 0,
          percentual_receita: 0,
        }
      }

      grouped[key].quantidade += c.quantidade
      grouped[key].receita_total += c.valor_total
    })

    // Calcular ticket médio e percentuais
    const totalQuantidade = consultasComProdutoValido.reduce((sum, c) => sum + c.quantidade, 0)
    const totalReceita = consultasComProdutoValido.reduce((sum, c) => sum + c.valor_total, 0)

    Object.values(grouped).forEach((stat) => {
      stat.ticket_medio = stat.quantidade > 0 ? stat.receita_total / stat.quantidade : 0
      stat.percentual_quantidade = totalQuantidade > 0 ? (stat.quantidade / totalQuantidade) * 100 : 0
      stat.percentual_receita = totalReceita > 0 ? (stat.receita_total / totalReceita) * 100 : 0
    })

    return Object.values(grouped).sort((a, b) => b.receita_total - a.receita_total)
  }, [consultasComProdutoValido])

  // Top 5 serviços mais lucrativos
  const topProfitableServices = useMemo(() => {
    return serviceStats.slice(0, 5).map(s => ({
      name: s.descricao,
      value: s.receita_total
    }))
  }, [serviceStats])

  // Mix de serviços (distribuição por tipo)
  const serviceMix = useMemo(() => {
    const byProduct: Record<string, number> = {}

    consultasComProdutoValido.forEach((c) => {
      const produto = c.__produtoCanonico
      byProduct[produto] = (byProduct[produto] || 0) + c.quantidade
    })

    return Object.entries(byProduct)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [consultasComProdutoValido])

  // Tendência de crescimento (últimos meses)
  const growthTrend = useMemo(() => {
    // Agrupar por mês e por produto (top 2 produtos no período)
    const byMonthAndProduct: Record<string, Record<string, number>> = {}
    const totalsByProduct: Record<string, number> = {}

    consultasComProdutoValido.forEach((c) => {
      const month = format(parseISO(c.data_consulta), "MMM/yy", { locale: ptBR })
      const produto = c.__produtoCanonico

      if (!byMonthAndProduct[month]) byMonthAndProduct[month] = {}
      byMonthAndProduct[month][produto] = (byMonthAndProduct[month][produto] || 0) + c.quantidade
      totalsByProduct[produto] = (totalsByProduct[produto] || 0) + c.quantidade
    })

    const topProducts = Object.entries(totalsByProduct)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([p]) => p)

    return Object.entries(byMonthAndProduct)
      .map(([month, data]) => {
        const row: any = { month }
        for (const p of topProducts) row[p] = data[p] || 0
        return row
      })
      .sort((a, b) => {
        // Ordenar por data
        const dateA = parseISO(`01-${a.month}`)
        const dateB = parseISO(`01-${b.month}`)
        return dateA.getTime() - dateB.getTime()
      })
  }, [consultasComProdutoValido])

  const growthTrendKeys = useMemo(() => {
    if (growthTrend.length === 0) return []
    return Object.keys(growthTrend[0]).filter((k) => k !== 'month')
  }, [growthTrend])

  // Métricas gerais
  const metrics = useMemo(() => {
    const totalReceita = consultasComProdutoValido.reduce((sum, c) => sum + c.valor_total, 0)
    const totalQuantidade = consultasComProdutoValido.reduce((sum, c) => sum + c.quantidade, 0)
    const servicosUnicos = new Set(consultasComProdutoValido.map((c) => c.__produtoCanonico)).size

    return {
      receita_total: totalReceita,
      quantidade_total: totalQuantidade,
      servicos_unicos: servicosUnicos,
      ticket_medio: totalQuantidade > 0 ? totalReceita / totalQuantidade : 0,
    }
  }, [consultasComProdutoValido])


  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Análise de Serviços
          </CardTitle>
          <CardDescription>Performance e tendências dos serviços prestados</CardDescription>
        </CardHeader>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.receita_total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Quantidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.quantidade_total}
            </div>
            <p className="text-xs text-muted-foreground">Serviços prestados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(metrics.ticket_medio)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-600" />
              Serviços Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.servicos_unicos}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 Produtos Mais Lucrativos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produtos Mais Lucrativos</CardTitle>
            <CardDescription>Produtos que geram mais receita</CardDescription>
          </CardHeader>
          <CardContent>
            {topProfitableServices.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProfitableServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Mix de Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Mix de Produtos</CardTitle>
            <CardDescription>Distribuição de quantidade por produto</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceMix.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceMix}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendência de Crescimento */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Crescimento (Top Produtos)</CardTitle>
          <CardDescription>Evolução mensal da quantidade por produto</CardDescription>
        </CardHeader>
        <CardContent>
          {growthTrend.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {growthTrendKeys.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabela Detalhada de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Detalhada por Produto</CardTitle>
          <CardDescription>Análise completa de todos os produtos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">% Qtd</TableHead>
                  <TableHead className="text-right">% Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum serviço encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  serviceStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{stat.descricao}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{stat.descricao}</TableCell>
                      <TableCell className="text-right">{stat.quantidade}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(stat.receita_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(stat.ticket_medio)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {stat.percentual_quantidade.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          {stat.percentual_receita.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
