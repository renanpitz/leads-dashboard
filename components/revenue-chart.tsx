"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { Consulta } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface RevenueChartProps {
  consultas: Consulta[]
  isLoading: boolean
  startDate?: string
  endDate?: string
}

export function RevenueChart({ consultas, isLoading, startDate, endDate }: RevenueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal</CardTitle>
          <CardDescription>Evolução da receita nos últimos meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  // Group by month
  const monthlyData = consultas.reduce((acc, consulta) => {
    const monthKey = format(new Date(consulta.data_consulta), "MMM yyyy", { locale: ptBR })
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        consultas: 0,
        sessoes: 0,
        total: 0
      }
    }
    
    acc[monthKey].total += consulta.valor_total
    
    if (consulta.tipo === "Consulta") {
      acc[monthKey].consultas += consulta.valor_total
    } else {
      acc[monthKey].sessoes += consulta.valor_total
    }
    
    return acc
  }, {} as Record<string, { month: string; consultas: number; sessoes: number; total: number }>)

  // Convert to array and sort by date
  let chartData = Object.values(monthlyData).sort((a, b) => {
    // Simple sort by month string - works for same year
    return a.month.localeCompare(b.month)
  })
  
  // If no date filter, show last 6 months. Otherwise show all months in range
  if (!startDate && !endDate) {
    chartData = chartData.slice(-6)
  }

  // Uses global currency formatter
  const formatCurrencyTick = (value: number) => formatCurrency(value)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover text-popover-foreground p-3 shadow-lg">
          <p className="font-medium mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600 dark:text-green-500">
              Consultas: {formatCurrency(payload[0].value)}
            </p>
            <p className="text-blue-600 dark:text-blue-500">
              Sessões: {formatCurrency(payload[1].value)}
            </p>
            <p className="font-semibold border-t pt-1 mt-1">
              Total: {formatCurrency(payload[0].value + payload[1].value)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Receita Mensal</CardTitle>
        <CardDescription className="text-muted-foreground">Evolução da receita nos últimos meses</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para o gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={formatCurrencyTick}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "transparent" }}
              />
              <Legend />
              <Bar 
                dataKey="consultas" 
                name="Consultas"
                fill="hsl(142, 76%, 36%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="sessoes" 
                name="Sessões"
                fill="hsl(221, 83%, 53%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
