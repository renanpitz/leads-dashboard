"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAllConsultas, getRevenueByService, getClientes, type Consulta, type RevenueByService, type Cliente } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns"
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
  ResponsiveContainer,
} from "recharts"
import {
  FileDown,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  BarChart3
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const COLORS = {
  Consulta: '#10b981', // green
  Sessão: '#3b82f6',   // blue
  Dinheiro: '#f59e0b', // amber
  PIX: '#10b981',      // green
  Cartão: '#8b5cf6'    // purple
}

export function RevenueReports() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [revenueByService, setRevenueByService] = useState<RevenueByService[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    return format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  })
  const [endDate, setEndDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd')
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  async function loadData() {
    setIsLoading(true)
    try {
      const [consultasData, revenueData, clientesData] = await Promise.all([
        getAllConsultas(),
        getRevenueByService(startDate, endDate),
        getClientes()
      ])
      
      // Filtrar consultas pelo período
      const filtered = consultasData.filter(c => {
        return c.data_consulta >= startDate && c.data_consulta <= endDate
      })
      
      setConsultas(filtered)
      setRevenueByService(revenueData)
      setClientes(clientesData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar os dados dos relatórios.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Dados para gráfico de pizza - Receita por Serviço
  const serviceChartData = useMemo(() => {
    return revenueByService.map(item => ({
      name: item.tipo,
      value: item.total_receita
    }))
  }, [revenueByService])

  // Dados para gráfico de barras - Receita por Forma de Pagamento
  const paymentMethodData = useMemo(() => {
    const grouped: Record<string, number> = {}
    
    consultas.forEach(c => {
      const method = c.forma_pagamento || 'Não informado'
      grouped[method] = (grouped[method] || 0) + c.valor_total
    })
    
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value
    }))
  }, [consultas])

  // Top 10 clientes por receita
  const topClients = useMemo(() => {
    const grouped: Record<number, { total: number; count: number }> = {}
    
    consultas.forEach(c => {
      if (!grouped[c.cliente_id]) {
        grouped[c.cliente_id] = { total: 0, count: 0 }
      }
      grouped[c.cliente_id].total += c.valor_total
      grouped[c.cliente_id].count += 1
    })
    
    return Object.entries(grouped)
      .map(([id, data]) => {
        const clienteId = parseInt(id)
        const cliente = clientes.find(c => c.id === clienteId)
        return {
          cliente_id: clienteId,
          cliente_nome: cliente?.nome || `Cliente #${clienteId}`,
          total_gasto: data.total,
          num_consultas: data.count
        }
      })
      .sort((a, b) => b.total_gasto - a.total_gasto)
      .slice(0, 10)
  }, [consultas, clientes])

  // Comparação mês a mês
  const monthComparison = useMemo(() => {
    const currentMonth = consultas.filter(c => {
      const consultaDate = parseISO(c.data_consulta)
      return consultaDate >= parseISO(startDate) && consultaDate <= parseISO(endDate)
    })
    
    const previousMonthStart = format(
      subMonths(parseISO(startDate), 1),
      'yyyy-MM-dd'
    )
    const previousMonthEnd = format(
      subMonths(parseISO(endDate), 1),
      'yyyy-MM-dd'
    )

    // Aqui seria necessário buscar dados do mês anterior
    // Por simplicidade, calculando apenas mês atual
    const currentTotal = currentMonth.reduce((sum, c) => sum + c.valor_total, 0)
    const currentCount = currentMonth.length

    return {
      currentMonth: {
        total: currentTotal,
        count: currentCount,
        average: currentCount > 0 ? currentTotal / currentCount : 0
      },
      // previousMonth seria calculado de forma similar
      growth: 0 // Placeholder
    }
  }, [consultas, startDate, endDate])

  // Totais gerais
  const totals = useMemo(() => {
    return {
      revenue: consultas.reduce((sum, c) => sum + c.valor_total, 0),
      transactions: consultas.length,
      averageTicket: consultas.length > 0 
        ? consultas.reduce((sum, c) => sum + c.valor_total, 0) / consultas.length 
        : 0
    }
  }, [consultas])

  const handleExportCSV = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exportação para CSV será implementada em breve.",
    })
  }

  const handleExportPDF = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exportação para PDF será implementada em breve.",
    })
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
      {/* Header com Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Relatórios de Receita
              </CardTitle>
              <CardDescription>
                Análises detalhadas de receita e performance
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm">
                <p className="text-muted-foreground">Período Selecionado</p>
                <p className="text-lg font-semibold text-green-600">
                  {format(parseISO(startDate), "dd/MM/yy")} - {format(parseISO(endDate), "dd/MM/yy")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totals.revenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totals.transactions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consultas realizadas
            </p>
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
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(totals.averageTicket)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por transação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Pizza - Receita por Tipo de Serviço */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Tipo de Serviço</CardTitle>
            <CardDescription>Distribuição da receita entre consultas e sessões</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#999'} 
                      />
                    ))}
                  </Pie>                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Receita por Forma de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Forma de Pagamento</CardTitle>
            <CardDescription>Distribuição de receita por método de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentMethodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#10b981" 
                    name="Receita"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance por Tipo de Serviço */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Tipo de Serviço</CardTitle>
          <CardDescription>Análise detalhada de cada tipo de serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByService.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                ) : (
                  revenueByService.map((item) => {
                    const percentage = (item.total_receita / totals.revenue) * 100
                    return (
                      <TableRow key={item.tipo}>
                        <TableCell>
                          <Badge variant="outline">{item.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantidade}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(item.total_receita)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.ticket_medio)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {percentage.toFixed(1)}%
                          </Badge>
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

      {/* Top 10 Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top 10 Clientes por Receita
          </CardTitle>
          <CardDescription>Clientes que mais geraram receita no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-right">Média por Consulta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  topClients.map((client, index) => (
                    <TableRow key={client.cliente_id}>
                      <TableCell className="font-bold">
                        {index + 1}º
                      </TableCell>
                      <TableCell className="font-medium">
                        {client.cliente_nome}
                      </TableCell>
                      <TableCell className="text-right">
                        {client.num_consultas}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(client.total_gasto)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(client.total_gasto / client.num_consultas)}
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
