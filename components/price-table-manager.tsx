"use client"

import { useState, useEffect } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  getTabelasPrecos,
  getItensTabelaPreco,
  createTabelaPreco,
  updateTabelaPreco,
  deleteTabelaPreco,
  createItemTabelaPreco,
  updateItemTabelaPreco,
  deleteItemTabelaPreco,
  type TabelaPreco,
  type ItemTabelaPreco
} from "@/lib/supabase"
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Table as TableIcon,
  Eye,
  Star
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

export function PriceTableManager() {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([])
  const [selectedTabela, setSelectedTabela] = useState<TabelaPreco | null>(null)
  const [itens, setItens] = useState<ItemTabelaPreco[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialogs
  const [isTabelaDialogOpen, setIsTabelaDialogOpen] = useState(false)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  // Forms
  const [tabelaForm, setTabelaForm] = useState({
    id: 0,
    nome: '',
    descricao: '',
    ativa: true,
    padrao: false
  })
  const [itemForm, setItemForm] = useState({
    id: 0,
    tipo_servico: 'Consulta' as 'Consulta' | 'Sessão',
    descricao: '',
    valor: '',
    ordem: 0,
    ativo: true
  })
  const [itemToDelete, setItemToDelete] = useState<ItemTabelaPreco | null>(null)
  
  const { toast } = useToast()

  useEffect(() => {
    loadTabelas()
  }, [])

  async function loadTabelas() {
    setIsLoading(true)
    try {
      const data = await getTabelasPrecos()
      setTabelas(data)
      
      // Selecionar primeira tabela por padrão
      if (data.length > 0 && !selectedTabela) {
        handleSelectTabela(data[0])
      }
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error)
      toast({
        title: "Erro ao carregar tabelas",
        description: "Não foi possível carregar as tabelas de preços.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSelectTabela(tabela: TabelaPreco) {
    setSelectedTabela(tabela)
    const itensData = await getItensTabelaPreco(tabela.id)
    setItens(itensData)
  }

  function openNewTabelaDialog() {
    setTabelaForm({
      id: 0,
      nome: '',
      descricao: '',
      ativa: true,
      padrao: false
    })
    setIsTabelaDialogOpen(true)
  }

  function openEditTabelaDialog(tabela: TabelaPreco) {
    setTabelaForm({
      id: tabela.id,
      nome: tabela.nome,
      descricao: tabela.descricao || '',
      ativa: tabela.ativa,
      padrao: tabela.padrao
    })
    setIsTabelaDialogOpen(true)
  }

  async function saveTabelaPreco() {
    if (!tabelaForm.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da tabela de preços.",
        variant: "destructive"
      })
      return
    }

    const payload = {
      nome: tabelaForm.nome,
      descricao: tabelaForm.descricao,
      ativa: tabelaForm.ativa,
      padrao: tabelaForm.padrao
    }

    let success = false
    if (tabelaForm.id === 0) {
      // Criar nova
      const result = await createTabelaPreco(payload)
      success = result !== null
    } else {
      // Atualizar existente
      const result = await updateTabelaPreco(tabelaForm.id, payload)
      success = result !== null
    }

    if (success) {
      toast({
        title: tabelaForm.id === 0 ? "Tabela criada" : "Tabela atualizada",
        description: "Tabela de preços salva com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setIsTabelaDialogOpen(false)
      loadTabelas()
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a tabela de preços.",
        variant: "destructive"
      })
    }
  }

  async function handleDeleteTabela(id: number) {
    const success = await deleteTabelaPreco(id)
    
    if (success) {
      toast({
        title: "Tabela excluída",
        description: "Tabela de preços removida com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setSelectedTabela(null)
      setItens([])
      loadTabelas()
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a tabela de preços.",
        variant: "destructive"
      })
    }
  }

  function openNewItemDialog() {
    if (!selectedTabela) {
      toast({
        title: "Selecione uma tabela",
        description: "Selecione uma tabela de preços antes de adicionar itens.",
        variant: "destructive"
      })
      return
    }

    setItemForm({
      id: 0,
      tipo_servico: 'Consulta',
      descricao: '',
      valor: '',
      ordem: itens.length + 1,
      ativo: true
    })
    setIsItemDialogOpen(true)
  }

  function openEditItemDialog(item: ItemTabelaPreco) {
    setItemForm({
      id: item.id,
      tipo_servico: item.tipo_servico,
      descricao: item.descricao,
      valor: item.valor.toString(),
      ordem: item.ordem,
      ativo: item.ativo
    })
    setIsItemDialogOpen(true)
  }

  async function saveItemTabelaPreco() {
    if (!selectedTabela) return

    if (!itemForm.descricao.trim() || !itemForm.valor) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha descrição e valor.",
        variant: "destructive"
      })
      return
    }

    const payload = {
      tabela_preco_id: selectedTabela.id,
      tipo_servico: itemForm.tipo_servico,
      descricao: itemForm.descricao,
      valor: parseFloat(itemForm.valor),
      ordem: itemForm.ordem,
      ativo: itemForm.ativo
    }

    let success = false
    if (itemForm.id === 0) {
      const result = await createItemTabelaPreco(payload)
      success = result !== null
    } else {
      const result = await updateItemTabelaPreco(itemForm.id, payload)
      success = result !== null
    }

    if (success) {
      toast({
        title: itemForm.id === 0 ? "Item adicionado" : "Item atualizado",
        description: "Item salvo com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setIsItemDialogOpen(false)
      handleSelectTabela(selectedTabela)
    } else {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o item.",
        variant: "destructive"
      })
    }
  }

  function confirmDeleteItem(item: ItemTabelaPreco) {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  async function handleDeleteItem() {
    if (!itemToDelete || !selectedTabela) return

    const success = await deleteItemTabelaPreco(itemToDelete.id)
    
    if (success) {
      toast({
        title: "Item excluído",
        description: "Item removido com sucesso.",
        className: "bg-green-50 border-green-200"
      })
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
      handleSelectTabela(selectedTabela)
    } else {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o item.",
        variant: "destructive"
      })
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tabelas de Preços</h2>
          <p className="text-muted-foreground">Gerencie suas tabelas de preços e serviços</p>
        </div>
        <Button onClick={openNewTabelaDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Tabela
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Tabelas */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Tabelas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tabelas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma tabela cadastrada
              </p>
            ) : (
              tabelas.map((tabela) => (
                <div
                  key={tabela.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTabela?.id === tabela.id
                      ? 'border-green-600 bg-green-50'
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => handleSelectTabela(tabela)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{tabela.nome}</h4>
                      {tabela.padrao && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditTabelaDialog(tabela)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTabela(tabela.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={tabela.ativa ? "default" : "secondary"} className="text-xs">
                      {tabela.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  {tabela.descricao && (
                    <p className="text-xs text-muted-foreground mt-2">{tabela.descricao}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Itens da Tabela Selecionada */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedTabela ? `Itens - ${selectedTabela.nome}` : 'Selecione uma tabela'}
                </CardTitle>
                <CardDescription>
                  {selectedTabela && `${itens.length} item(ns) cadastrado(s)`}
                </CardDescription>
              </div>
              {selectedTabela && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTabela(selectedTabela)
                      setIsViewDialogOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    onClick={openNewItemDialog}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Item
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTabela ? (
              <div className="text-center py-12 text-muted-foreground">
                <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione uma tabela de preços para visualizar os itens</p>
              </div>
            ) : itens.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item cadastrado nesta tabela</p>
                <Button
                  className="mt-4 bg-green-600 hover:bg-green-700"
                  onClick={openNewItemDialog}
                >
                  Adicionar primeiro item
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">{item.tipo_servico}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell className="font-semibold text-green-600">{formatCurrency(item.valor)}</TableCell>
                        <TableCell>
                          <Badge variant={item.ativo ? "default" : "secondary"}>
                            {item.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditItemDialog(item)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmDeleteItem(item)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog - Nova/Editar Tabela */}
      <Dialog open={isTabelaDialogOpen} onOpenChange={setIsTabelaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tabelaForm.id === 0 ? 'Nova Tabela de Preços' : 'Editar Tabela de Preços'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da tabela de preços
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={tabelaForm.nome}
                onChange={(e) => setTabelaForm({ ...tabelaForm, nome: e.target.value })}
                placeholder="Ex: Particular, Convênio X, Promoção"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={tabelaForm.descricao}
                onChange={(e) => setTabelaForm({ ...tabelaForm, descricao: e.target.value })}
                placeholder="Descrição opcional da tabela"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Tabela Ativa</Label>
              <Switch
                checked={tabelaForm.ativa}
                onCheckedChange={(checked) => setTabelaForm({ ...tabelaForm, ativa: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Tabela Padrão</Label>
                <p className="text-xs text-muted-foreground">Será usada por padrão</p>
              </div>
              <Switch
                checked={tabelaForm.padrao}
                onCheckedChange={(checked) => setTabelaForm({ ...tabelaForm, padrao: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTabelaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveTabelaPreco} className="bg-green-600 hover:bg-green-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Novo/Editar Item */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemForm.id === 0 ? 'Novo Item' : 'Editar Item'}
            </DialogTitle>
            <DialogDescription>
              Adicione um serviço à tabela de preços
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Serviço *</Label>
              <Select
                value={itemForm.tipo_servico}
                onValueChange={(value) =>
                  setItemForm({ ...itemForm, tipo_servico: value as 'Consulta' | 'Sessão' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consulta">Consulta</SelectItem>
                  <SelectItem value="Sessão">Sessão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={itemForm.descricao}
                onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })}
                placeholder="Ex: Consulta Inicial, Sessão de Fisioterapia"
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.valor}
                onChange={(e) => setItemForm({ ...itemForm, valor: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Ordem de Exibição</Label>
              <Input
                type="number"
                value={itemForm.ordem}
                onChange={(e) => setItemForm({ ...itemForm, ordem: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Item Ativo</Label>
              <Switch
                checked={itemForm.ativo}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveItemTabelaPreco} className="bg-green-600 hover:bg-green-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Visualizar Tabela */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTabela?.nome}</DialogTitle>
            <DialogDescription>{selectedTabela?.descricao}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge className="ml-2" variant={selectedTabela?.ativa ? "default" : "secondary"}>
                  {selectedTabela?.ativa ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Padrão:</span>
                <Badge className="ml-2" variant={selectedTabela?.padrao ? "default" : "outline"}>
                  {selectedTabela?.padrao ? "Sim" : "Não"}
                </Badge>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.filter(i => i.ativo).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">{item.tipo_servico}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Confirmar Exclusão de Item */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o item "{itemToDelete?.descricao}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
