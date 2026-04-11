"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardMetrics } from "@/components/dashboard-metrics"
import { LeadsTable } from "@/components/leads-table"
import { TemplatesManager } from "@/components/templates-manager"
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase"

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"leads" | "templates">("leads")
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, error } = await getCurrentUser()

        if (user && !error) {
          setIsAuthenticated(true)
          setUser(user)
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("[error]", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    let subscription: any = null

    const setupAuthListener = async () => {
      try {
        const { data } = await onAuthStateChange((user) => {
          if (user) {
            setIsAuthenticated(true)
            setUser(user)
          } else {
            setIsAuthenticated(false)
            setUser(null)
            router.push("/")
          }
        })
        subscription = data.subscription
      } catch (error) {
        console.error("[v0] Auth listener setup failed:", error)
      }
    }

    setupAuthListener()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="flex border-b border-border mb-8">
            <button 
                onClick={() => setActiveTab('leads')}
                className={`px-4 py-3 font-medium text-sm transition-colors outline-none relative ${activeTab === 'leads' ? 'text-[var(--whatsapp-green)]' : 'text-muted-foreground hover:text-foreground'}`}
            >
                Leads
                {activeTab === 'leads' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--whatsapp-green)] rounded-t-full" />}
            </button>
            <button 
                onClick={() => setActiveTab('templates')}
                className={`px-4 py-3 font-medium text-sm transition-colors outline-none relative ${activeTab === 'templates' ? 'text-[var(--whatsapp-green)]' : 'text-muted-foreground hover:text-foreground'}`}
            >
                Templates (Mensagens)
                {activeTab === 'templates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--whatsapp-green)] rounded-t-full" />}
            </button>
        </div>

        {activeTab === 'leads' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
                <DashboardMetrics />
                <LeadsTable />
            </div>
        ) : (
            <div className="animate-in fade-in duration-500">
                <TemplatesManager />
            </div>
        )}
      </main>
    </div>
  )
}
