"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  getIntegracoesPagamento,
  getIntegracaoAtiva,
  createIntegracaoPagamento,
  updateIntegracaoPagamento,
  deleteIntegracaoPagamento,
  type IntegracaoPagamento,
} from "@/lib/supabase"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Key,
  Webhook,
  TestTube,
  Shield,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function PaymentIntegrations() {
  const [integracoes, setIntegracoes] = useState<IntegracaoPagamento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedIntegracao, setSelectedIntegracao] = useState<IntegracaoPagamento | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    provedor: 'mercadopago' as 'mercadopago' | 'stripe' | 'pagseguro',
    nome_configuracao: '',
    api_key_encrypted: '',
    webhook_url: '',
    webhook_secret_encrypted: '',
    ativa: true,
    ambiente: 'sandbox' as 'sandbox' | 'production',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const integracoesData = await getIntegracoesPagamento()
      setIntegracoes(integracoesData)
    } catch (error) {
      console.error("Erro ao carregar integrações:", error)
      toast({
        title: "Erro ao carregar integrações",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (integracao?: IntegracaoPagamento) => {
    if (integracao) {
      setSelectedIntegracao(integracao)
      setFormData({
        provedor: integracao.provedor,
        nome_configuracao: integracao.nome_configuracao,
        api_key_encrypted: '', // Não mostrar chave por segurança
        webhook_url: integracao.webhook_url || '',
        webhook_secret_encrypted: '', // Não mostrar secret por segurança
        ativa: integracao.ativa,
        ambiente: integracao.ambiente,
      })
    } else {
      setSelectedIntegracao(null)
      setFormData({
        provedor: 'mercadopago',
        nome_configuracao: '',
        api_key_encrypted: '',
        webhook_url: '',
        webhook_secret_encrypted: '',
        ativa: true,
        ambiente: 'sandbox',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome_configuracao || !formData.api_key_encrypted) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome da configuração e a chave API.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      provedor: formData.provedor,
      nome_configuracao: formData.nome_configuracao,
      api_key_encrypted: formData.api_key_encrypted || null,
      webhook_url: formData.webhook_url || null,
      webhook_secret_encrypted: formData.webhook_secret_encrypted || null,
      ativa: formData.ativa,
      ambiente: formData.ambiente,
      ultimo_teste: null,
      teste_status: null,
    }

    const result = selectedIntegracao
      ? await updateIntegracaoPagamento(selectedIntegracao.id, payload)
      : await createIntegracaoPagamento(payload)

    if (result) {
      toast({
        title: selectedIntegracao ? "Integração atualizada" : "Integração criada",
        description: `Configuração ${selectedIntegracao ? 'atualizada' : 'cadastrada'} com sucesso.`,
        className: "bg-green-50 border-green-200",
      })
      setIsDialogOpen(false)
      loadData()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a integração.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedIntegracao) return

    const success = await deleteIntegracaoPagamento(selectedIntegracao.id)

    if (success) {
      toast({
        title: "Integração excluída",
        description: "Configuração removida com sucesso.",
        className: "bg-green-50 border-green-200",
      })
      setIsDeleteDialogOpen(false)
      setSelectedIntegracao(null)
      loadData()
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a integração.",
        variant: "destructive",
      })
    }
  }

  const openDeleteDialog = (integracao: IntegracaoPagamento) => {
    setSelectedIntegracao(integracao)
    setIsDeleteDialogOpen(true)
  }

  const handleTestConnection = async (integracao: IntegracaoPagamento) => {
    // Simular teste de conexão
    const sucesso = Math.random() > 0.3 // 70% de chance de sucesso

    const result = await updateIntegracaoPagamento(integracao.id, {
      ultimo_teste: new Date().toISOString(),
      teste_status: sucesso ? 'sucesso' : 'falha',
    })

    if (result) {
      toast({
        title: sucesso ? "Teste bem-sucedido" : "Teste falhou",
        description: sucesso
          ? "A conexão com o provedor foi estabelecida com sucesso."
          : "Não foi possível conectar ao provedor. Verifique as credenciais.",
        variant: sucesso ? undefined : "destructive",
      })
      loadData()
    }
  }

  const handleToggleActive = async (integracao: IntegracaoPagamento) => {
    const result = await updateIntegracaoPagamento(integracao.id, {
      ativa: !integracao.ativa,
    })

    if (result) {
      toast({
        title: !integracao.ativa ? "Integração ativada" : "Integração desativada",
        description: `A integração foi ${!integracao.ativa ? 'ativada' : 'desativada'}.`,
        className: "bg-green-50 border-green-200",
      })
      loadData()
    }
  }

  // Filtrar integrações
  const filteredIntegracoes = useMemo(() => {
    if (activeTab === 'all') return integracoes
    return integracoes.filter(i => i.provedor === activeTab)
  }, [integracoes, activeTab])

  // Análises
  const analysis = useMemo(() => {
    const ativas = integracoes.filter(i => i.ativa)
    const producao = integracoes.filter(i => i.ambiente === 'production')
    const testadas = integracoes.filter(i => i.ultimo_teste !== null)
    const sucesso = integracoes.filter(i => i.teste_status === 'sucesso')

    return {
      total: integracoes.length,
      ativas: ativas.length,
      producao: producao.length,
      testadas: testadas.length,
      sucesso: sucesso.length,
    }
  }, [integracoes])

  const getProvedorIcon = (provedor: string) => {
    // Retornar ícone baseado no provedor
    return <CreditCard className="h-5 w-5" />
  }

  const getProvedorColor = (provedor: string) => {
    switch (provedor) {
      case 'mercadopago':
        return 'text-blue-600'
      case 'stripe':
        return 'text-purple-600'
      case 'pagseguro':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (ativa: boolean) => {
    return ativa ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Ativa
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        <XCircle className="h-3 w-3 mr-1" />
        Inativa
      </Badge>
    )
  }

  const getTesteStatusBadge = (status: 'sucesso' | 'falha' | null) => {
    if (status === 'sucesso') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Sucesso
        </Badge>
      )
    } else if (status === 'falha') {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
          Falha
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline">
          <AlertCircle className="h-3 w-3 mr-1" />
          Não testado
        </Badge>
      )
    }
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
      {/* Header com Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                Integrações de Pagamento
              </CardTitle>
              <CardDescription>
                Configure e gerencie suas integrações com gateways de pagamento
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Integrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {analysis.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configurações cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Integrações Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analysis.ativas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Em uso atualmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {analysis.producao}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ambiente de produção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Testes Bem-sucedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {analysis.sucesso}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conexões validadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Guias de Ajuda Rápida */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              Mercado Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-blue-900">
              Gateway brasileiro com ampla aceitação. Ideal para PIX e cartões nacionais.
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-blue-700"
              onClick={() => window.open('https://www.mercadopago.com.br/developers', '_blank')}
            >
              Ver documentação →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-2 bg-purple-600 rounded-lg">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-purple-900">
              Solução global para pagamentos online. Excelente para pagamentos internacionais.
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-purple-700"
              onClick={() => window.open('https://stripe.com/docs', '_blank')}
            >
              Ver documentação →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-2 bg-orange-600 rounded-lg">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              PagSeguro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-orange-900">
              Plataforma brasileira com diversas opções de pagamento e parcelamento.
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-orange-700"
              onClick={() => window.open('https://dev.pagseguro.uol.com.br/', '_blank')}
            >
              Ver documentação →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Filtro */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="mercadopago">Mercado Pago</TabsTrigger>
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
              <TabsTrigger value="pagseguro">PagSeguro</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Tabela de Integrações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Integração</CardTitle>
          <CardDescription>
            {filteredIntegracoes.length} integração(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Teste</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntegracoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma integração encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIntegracoes.map((integracao) => (
                    <TableRow key={integracao.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={getProvedorColor(integracao.provedor)}>
                            {getProvedorIcon(integracao.provedor)}
                          </div>
                          <span className="font-medium capitalize">{integracao.provedor}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {integracao.nome_configuracao}
                      </TableCell>
                      <TableCell>
                        <Badge variant={integracao.ambiente === 'production' ? 'default' : 'outline'}>
                          {integracao.ambiente === 'production' ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Produção
                            </>
                          ) : (
                            <>
                              <TestTube className="h-3 w-3 mr-1" />
                              Sandbox
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(integracao.ativa)}</TableCell>
                      <TableCell>
                        {integracao.ultimo_teste ? (
                          <span className="text-sm">
                            {format(parseISO(integracao.ultimo_teste), "dd/MM/yy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca testado</span>
                        )}
                      </TableCell>
                      <TableCell>{getTesteStatusBadge(integracao.teste_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestConnection(integracao)}
                            title="Testar Conexão"
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(integracao)}
                            title={integracao.ativa ? 'Desativar' : 'Ativar'}
                          >
                            {integracao.ativa ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(integracao)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(integracao)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegracao ? 'Editar Integração' : 'Nova Integração'}
            </DialogTitle>
            <DialogDescription>
              Configure a conexão com o gateway de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provedor *</Label>
                <Select
                  value={formData.provedor}
                  onValueChange={(value) =>
                    setFormData({ ...formData, provedor: value as 'mercadopago' | 'stripe' | 'pagseguro' })
                  }
                  disabled={!!selectedIntegracao}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="pagseguro">PagSeguro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ambiente *</Label>
                <Select
                  value={formData.ambiente}
                  onValueChange={(value) =>
                    setFormData({ ...formData, ambiente: value as 'sandbox' | 'production' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome da Configuração *</Label>
              <Input
                placeholder="Ex: Mercado Pago Principal, Stripe Internacional..."
                value={formData.nome_configuracao}
                onChange={(e) => setFormData({ ...formData, nome_configuracao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Chave API / Access Token *
              </Label>
              <Input
                type="password"
                placeholder="Sua chave API secreta..."
                value={formData.api_key_encrypted}
                onChange={(e) => setFormData({ ...formData, api_key_encrypted: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Esta chave será criptografada antes de ser salva
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                URL do Webhook (Opcional)
              </Label>
              <Input
                placeholder="https://seu-dominio.com/api/webhook"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Webhook Secret (Opcional)</Label>
              <Input
                type="password"
                placeholder="Secret para validação do webhook..."
                value={formData.webhook_secret_encrypted}
                onChange={(e) =>
                  setFormData({ ...formData, webhook_secret_encrypted: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="ativa"
                checked={formData.ativa}
                onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked as boolean })}
              />
              <Label htmlFor="ativa" className="cursor-pointer">
                Ativar esta integração
              </Label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-semibold mb-1">Dica de Segurança</p>
                  <p>
                    Nunca compartilhe suas chaves API. Elas são criptografadas no banco de dados, mas
                    mantenha-as em segredo. Use o ambiente Sandbox para testes antes de ativar em
                    Produção.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Shield className="h-4 w-4 mr-2" />
              {selectedIntegracao ? 'Atualizar' : 'Criar Integração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta integração? Esta ação não pode ser desfeita e pode
              afetar o processamento de pagamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
