"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center border rounded-md overflow-hidden bg-muted/50 p-0.5 opacity-50">
        <div className="p-1.5"><Sun className="h-4 w-4 text-muted-foreground" /></div>
        <div className="p-1.5"><Moon className="h-4 w-4 text-muted-foreground" /></div>
        <div className="p-1.5"><Monitor className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    )
  }

  return (
    <div className="flex flex-row items-center border border-border rounded-md bg-muted/30 p-0.5">
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center justify-center p-1.5 rounded-sm transition-all cursor-pointer ${theme === "light" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}
        title="Tema Claro"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center justify-center p-1.5 rounded-sm transition-all cursor-pointer ${theme === "dark" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}
        title="Tema Escuro"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`flex items-center justify-center p-1.5 rounded-sm transition-all cursor-pointer ${theme === "system" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}
        title="Padrão do Sistema"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  )
}
