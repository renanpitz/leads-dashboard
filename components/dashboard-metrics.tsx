"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, MessageSquareCode as MessageSquareCheck, Clock, MessageSquareX, Phone } from "lucide-react"
import { getClientes, type Cliente } from "@/lib/supabase"

const calculateMetrics = (clientes: Cliente[], startDate?: Date, endDate?: Date) => {
  const totalLeads = clientes.length
  const interestedLeads = clientes.filter((cliente) => cliente.interessado).length
  
  // Filtro de data range para "Novos"
  const leadsInRange = clientes.filter((cliente) => {
    const clienteDate = new Date(cliente.created_at)
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (clienteDate < start) return false
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (clienteDate > end) return false
    }
    return true
  }).length
  
  const conversasTravadas = clientes.filter((cliente) => cliente.trava).length

  return {
    totalLeads,
    interestedLeads,
    leadsInRange,
    conversasTravadas,
  }
}

export function DashboardMetrics() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estado do filtro de data com padrão de 7 dias
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const getDefaultStartDate = () => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  }

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

  const startDateObj = startDate ? new Date(startDate) : undefined
  const endDateObj = endDate ? new Date(endDate) : undefined
  const metrics = calculateMetrics(clientes, startDateObj, endDateObj)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--whatsapp-green)] text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Dashboard WhatsApp</h2>
          <p className="text-muted-foreground">Acompanhe o atendimento</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[var(--whatsapp-green)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Phone className="h-4 w-4 text-[var(--whatsapp-green)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : metrics.totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Contatos no WhatsApp</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Interessados</CardTitle>
            <MessageSquareCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{loading ? "..." : metrics.interestedLeads}</div>
            <p className="text-xs text-muted-foreground">Responderam positivamente</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-col items-start justify-between space-y-3 pb-3">
            <div className="flex w-full items-center justify-between">
              <CardTitle className="text-sm font-medium">Novos</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
              <button
                onClick={() => {
                  setStartDate(getDefaultStartDate())
                  setEndDate(new Date().toISOString().split('T')[0])
                }}
                className="w-full rounded bg-blue-100 py-1 text-xs text-blue-600 hover:bg-blue-200"
              >
                Últimos 7 dias
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{loading ? "..." : metrics.leadsInRange}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Travadas</CardTitle>
            <MessageSquareX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{loading ? "..." : metrics.conversasTravadas}</div>
            <p className="text-xs text-muted-foreground">Conversas pausadas/travadas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
