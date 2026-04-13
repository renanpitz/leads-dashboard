"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"

export type QuickPeriodFilter = "7days" | "30days" | "90days" | "thisMonth" | "all" | "custom"

export interface PeriodFilterValue {
  startDate: string
  endDate: string
  activeFilter: QuickPeriodFilter
}

interface PeriodFilterProps {
  value: PeriodFilterValue
  onChange: (next: PeriodFilterValue) => void
  rightText?: string
sticky?: boolean
stickyTopClassName?: string
}

export function PeriodFilter({
  value,
  onChange,
  rightText,
  sticky = true,
  stickyTopClassName,
}: PeriodFilterProps) {
  const [draftStartDate, setDraftStartDate] = useState(value.startDate)
  const [draftEndDate, setDraftEndDate] = useState(value.endDate)
  const [draftActiveFilter, setDraftActiveFilter] = useState<QuickPeriodFilter>(value.activeFilter)

  useEffect(() => {
    setDraftStartDate(value.startDate)
    setDraftEndDate(value.endDate)
    setDraftActiveFilter(value.activeFilter)
  }, [value.startDate, value.endDate, value.activeFilter])

  const isDirty =
    draftStartDate !== value.startDate ||
    draftEndDate !== value.endDate ||
    draftActiveFilter !== value.activeFilter

  const canApply =
    (draftActiveFilter === "all" && isDirty) || (Boolean(draftStartDate) && Boolean(draftEndDate) && isDirty)

  const applyDraft = () => {
    if (draftActiveFilter === "all") {
      onChange({ startDate: "", endDate: "", activeFilter: "all" })
      return
    }

    if (!draftStartDate || !draftEndDate) return

    onChange({
      startDate: draftStartDate,
      endDate: draftEndDate,
      activeFilter: draftActiveFilter ?? "custom",
    })
  }

  const clearDraft = () => {
    setDraftStartDate(value.startDate)
    setDraftEndDate(value.endDate)
    setDraftActiveFilter(value.activeFilter)
  }
  const periodSummary = useMemo(() => {
    if (!value.startDate && !value.endDate) return "Todos os períodos"

    const start = value.startDate
      ? format(new Date(value.startDate), "dd 'de' MMM", { locale: ptBR })
      : "Início"
    const end = value.endDate
      ? format(new Date(value.endDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })
      : "Atual"

    return `${start} - ${end}`
  }, [value.endDate, value.startDate])

  const setQuickFilter = (filter: QuickPeriodFilter) => {
    const today = new Date()

    setDraftActiveFilter(filter)

    switch (filter) {
      case "7days":
        setDraftStartDate(format(subDays(today, 7), "yyyy-MM-dd"))
        setDraftEndDate(format(today, "yyyy-MM-dd"))
        return
      case "30days":
        setDraftStartDate(format(subDays(today, 30), "yyyy-MM-dd"))
        setDraftEndDate(format(today, "yyyy-MM-dd"))
        return
      case "90days":
        setDraftStartDate(format(subDays(today, 90), "yyyy-MM-dd"))
        setDraftEndDate(format(today, "yyyy-MM-dd"))
        return
      case "thisMonth":
        setDraftStartDate(format(startOfMonth(today), "yyyy-MM-dd"))
        setDraftEndDate(format(endOfMonth(today), "yyyy-MM-dd"))
        return
      case "all":
        setDraftStartDate("")
        setDraftEndDate("")
        return
      case "custom":
        return
    }
  }

  return (
    <Card
      className={
        sticky
          ? `sticky ${stickyTopClassName ?? "top-0"} z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80`
          : undefined
      }
    >
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período</span>
            <span className="text-sm text-muted-foreground truncate">{periodSummary}</span>
            {rightText ? (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{rightText}</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              <Button
                variant={value.activeFilter === "7days" ? "default" : "ghost"}
                size="sm"
                onClick={() => setQuickFilter("7days")}
                className={value.activeFilter === "7days" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                7d
              </Button>
              <Button
                variant={value.activeFilter === "30days" ? "default" : "ghost"}
                size="sm"
                onClick={() => setQuickFilter("30days")}
                className={value.activeFilter === "30days" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                30d
              </Button>
              <Button
                variant={value.activeFilter === "90days" ? "default" : "ghost"}
                size="sm"
                onClick={() => setQuickFilter("90days")}
                className={value.activeFilter === "90days" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                90d
              </Button>
              <Button
                variant={value.activeFilter === "thisMonth" ? "default" : "ghost"}
                size="sm"
                onClick={() => setQuickFilter("thisMonth")}
                className={value.activeFilter === "thisMonth" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Mês
              </Button>
              <Button
                variant={value.activeFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setQuickFilter("all")}
                className={value.activeFilter === "all" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Tudo
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                aria-label="Data inicial"
                className="h-8 w-[140px]"
                type="date"
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
                max={draftEndDate || format(new Date(), "yyyy-MM-dd")}
              />
              <Input
                aria-label="Data final"
                className="h-8 w-[140px]"
                type="date"
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
                min={draftStartDate}
                max={format(new Date(), "yyyy-MM-dd")}
              />

              <Button
                size="sm"
                variant={canApply ? "default" : "ghost"}
                disabled={!canApply}
                onClick={applyDraft}
                className={canApply ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Aplicar
              </Button>
              {isDirty ? (
                <Button size="sm" variant="ghost" onClick={clearDraft}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
