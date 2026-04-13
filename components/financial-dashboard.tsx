"use client"

import { useState, useEffect, useMemo } from "react"
import { FinancialMetrics } from "./financial-metrics"
import { TransactionsList } from "./transactions-list"
import { RevenueChart } from "./revenue-chart"
import { ReceivablesControl } from "./receivables-control"
import { PriceTableManager } from "./price-table-manager"
import { RevenueReports } from "./revenue-reports"
import { ServiceAnalysis } from "./service-analysis"
import { ExpenseManagement } from "./expense-management"
import { GoalsProjections } from "./goals-projections"
import { ReceiptIssuance } from "./receipt-issuance"
import { PaymentIntegrations } from "./payment-integrations"
import { getAllConsultas, type Consulta } from "@/lib/supabase"
import { PeriodFilter } from "@/components/period-filter"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Wallet, Table as TableIcon, BarChart3, Activity, TrendingDown, Target, Receipt, CreditCard } from "lucide-react"
import { format, subDays } from "date-fns"

type QuickFilter = '7days' | '30days' | '90days' | 'thisMonth' | 'all'

export function FinancialDashboard() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Date filter state - default last 30 days
  const [startDate, setStartDate] = useState<string>(() => {
    return format(subDays(new Date(), 30), 'yyyy-MM-dd')
  })
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd')
  })
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('30days')

  useEffect(() => {
    loadConsultas()
  }, [])

  async function loadConsultas() {
    setIsLoading(true)
    try {
      const data = await getAllConsultas()
      setConsultas(data)
    } catch (error) {
      console.error("Erro ao carregar consultas:", error)
    } finally {
      setIsLoading(false)
    }
  }


  // Filter consultas by date range
  const filteredConsultas = useMemo(() => {
    if (!startDate && !endDate) return consultas
    
    return consultas.filter((consulta) => {
      const consultaDate = new Date(consulta.data_consulta)
      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null
      
      if (start && consultaDate < start) return false
      if (end && consultaDate > end) return false
      
      return true
    })
  }, [consultas, startDate, endDate])


  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 h-auto">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        {/* Receivables tab temporarily hidden - keeping code for future use */}
        {/* <TabsTrigger value="receivables" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Recebíveis
        </TabsTrigger> */}
        <TabsTrigger value="prices" className="flex items-center gap-2">
          <TableIcon className="h-4 w-4" />
          Tabelas de Preço
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Relatórios
        </TabsTrigger>
        <TabsTrigger value="analysis" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Análise de Serviços
        </TabsTrigger>
        <TabsTrigger value="expenses" className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Despesas
        </TabsTrigger>
        <TabsTrigger value="goals" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Metas
        </TabsTrigger>
        <TabsTrigger value="receipts" className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Recibos
        </TabsTrigger>
        <TabsTrigger value="integrations" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Integrações
        </TabsTrigger>
      </TabsList>

      {/* Tab: Visão Geral */}
      <TabsContent value="overview" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
          rightText={`${filteredConsultas.length} transações`}
          stickyTopClassName="top-0"
        />

        {/* Metrics */}
        <FinancialMetrics consultas={filteredConsultas} isLoading={isLoading} />
        
        {/* Charts and Transactions */}
        <div className="grid gap-8 lg:grid-cols-2">
          <RevenueChart consultas={filteredConsultas} isLoading={isLoading} startDate={startDate} endDate={endDate} />
          <TransactionsList consultas={filteredConsultas} isLoading={isLoading} />
        </div>
      </TabsContent>

      {/* Tab: Recebíveis */}
      <TabsContent value="receivables">
        <ReceivablesControl />
      </TabsContent>

      {/* Tab: Tabelas de Preço */}
      <TabsContent value="prices" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
        />
        <PriceTableManager />
      </TabsContent>

      {/* Tab: Relatórios */}
      <TabsContent value="reports" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
        />
        <RevenueReports />
      </TabsContent>

      {/* Tab: Análise de Serviços */}
      <TabsContent value="analysis" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
        />
        <ServiceAnalysis consultas={filteredConsultas} />
      </TabsContent>

      {/* Tab: Despesas */}
      <TabsContent value="expenses" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
          stickyTopClassName="top-0"
        />
        <ExpenseManagement
          dateFrom={startDate || "1900-01-01"}
          dateTo={endDate || format(new Date(), "yyyy-MM-dd")}
        />
      </TabsContent>

      {/* Tab: Metas */}
      <TabsContent value="goals" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
        />
        <GoalsProjections />
      </TabsContent>

      {/* Tab: Recibos */}
      <TabsContent value="receipts" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
        />
        <ReceiptIssuance />
      </TabsContent>

      {/* Tab: Integrações */}
      <TabsContent value="integrations" className="space-y-6">
        <PeriodFilter
          value={{ startDate, endDate, activeFilter }}
          onChange={(next) => {
            setStartDate(next.startDate)
            setEndDate(next.endDate)
            setActiveFilter(next.activeFilter)
          }}
        />
        <PaymentIntegrations />
      </TabsContent>
      </Tabs>
    </div>
  )
}
