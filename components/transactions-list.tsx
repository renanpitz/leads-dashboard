"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Search, Calendar } from "lucide-react"
import type { Consulta } from "@/lib/supabase"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface TransactionsListProps {
  consultas: Consulta[]
  isLoading: boolean
}

export function TransactionsList({ consultas, isLoading }: TransactionsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedPayment, setSelectedPayment] = useState<string>("all")

  const filteredConsultas = useMemo(() => {
    return consultas.filter((consulta) => {
      const matchesSearch = consulta.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      const matchesType = selectedType === "all" || consulta.tipo === selectedType
      const matchesPayment = selectedPayment === "all" || consulta.forma_pagamento === selectedPayment
      
      return matchesSearch && matchesType && matchesPayment
    })
  }, [consultas, searchTerm, selectedType, selectedPayment])

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(consultas.map(c => c.forma_pagamento).filter(Boolean))
    return Array.from(methods)
  }, [consultas])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações ({filteredConsultas.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="Consulta">Consulta</option>
                <option value="Sessão">Sessão</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Pagamento</Label>
              <select
                id="payment"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">Todos</option>
                {uniquePaymentMethods.map((method) => (
                  <option key={method} value={method!}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredConsultas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma transação encontrada
              </div>
            ) : (
              filteredConsultas.map((consulta) => (
                <div
                  key={consulta.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{consulta.descricao || "Sem descrição"}</p>
                      <Badge variant={consulta.tipo === "Consulta" ? "default" : "secondary"}>
                        {consulta.tipo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(consulta.data_consulta), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      {consulta.forma_pagamento && (
                        <span>• {consulta.forma_pagamento}</span>
                      )}
                      {consulta.parcelas && consulta.parcelas > 1 && (
                        <span>• {consulta.parcelas}x</span>
                      )}
                      <span>• Qtd: {consulta.quantidade}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(consulta.valor_total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(consulta.valor_unitario)} / unid
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
