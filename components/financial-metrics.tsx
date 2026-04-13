"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, TrendingUp, CreditCard, Calendar } from "lucide-react"
import type { Consulta } from "@/lib/supabase"

interface FinancialMetricsProps {
  consultas: Consulta[]
  isLoading: boolean
}

export function FinancialMetrics({ consultas, isLoading }: FinancialMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-40 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Calculate metrics
  const totalRevenue = consultas.reduce((sum, c) => sum + c.valor_total, 0)
  const totalTransactions = consultas.length
  const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  
  // Payment method breakdown
  const paymentMethods = consultas.reduce((acc, c) => {
    const method = c.forma_pagamento || 'Não informado'
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const mostUsedPayment = Object.entries(paymentMethods).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalTransactions} transações
          </p>
        </CardContent>
      </Card>

      {/* Average Ticket */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(averageTicket)}
          </div>
          <p className="text-xs text-muted-foreground">
            por transação
          </p>
        </CardContent>
      </Card>

      {/* Total Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transações</CardTitle>
          <Calendar className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">
            consultas e sessões
          </p>
        </CardContent>
      </Card>

      {/* Most Used Payment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Forma de Pagamento</CardTitle>
          <CreditCard className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mostUsedPayment}</div>
          <p className="text-xs text-muted-foreground">
            mais utilizada
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
