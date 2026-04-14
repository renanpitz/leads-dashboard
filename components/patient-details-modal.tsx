"use client"

import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Calendar, DollarSign, X, Lock, Unlock, MessageCircle, MessageSquareText, Package, Tag, Edit2, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { type Cliente, type Consulta, getConsultasByClienteId, addConsulta, deleteConsulta, updateConsulta, updateClienteStatus, updateClienteTag, updateClienteProduto, updateClienteFollowUp, updateClienteNome, deleteCliente } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface PatientDetailsModalProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClienteUpdate?: () => void
}

const PRODUTOS_DISPONIVEIS = [
  "VPPB",
  "Zumbido",
  "Dor Orofacial",
  "Labirintite",
  "Outros"
]

export function PatientDetailsModal({ cliente, open, onOpenChange, onClienteUpdate }: PatientDetailsModalProps) {
  const { toast } = useToast()
  const [localCliente, setLocalCliente] = useState<Cliente | null>(cliente)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estados de edição
  const [editingNome, setEditingNome] = useState(false)
  const [editingProduto, setEditingProduto] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  // Valores temporários para edição
  const [tempNome, setTempNome] = useState("")
  const [tempProdutos, setTempProdutos] = useState<string[]>([])
  const [tempFollowUp, setTempFollowUp] = useState(0)
  
  // Form state para consultas (criação)
  const [tipo, setTipo] = useState<'Consulta' | 'Sessão'>('Consulta')
  const [descricao, setDescricao] = useState('')
  const [produtosConsulta, setProdutosConsulta] = useState<string[]>([])
  const [quantidade, setQuantidade] = useState(1)
  const [valorUnitario, setValorUnitario] = useState<string>('200')
  const [dataConsulta, setDataConsulta] = useState(new Date().toISOString().split('T')[0])
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'PIX' | 'Cartão'>('PIX')
  const [parcelas, setParcelas] = useState(1)

  // Edição de consulta (modal)
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null)
  const [editTipo, setEditTipo] = useState<'Consulta' | 'Sessão'>('Consulta')
  const [editDescricao, setEditDescricao] = useState('')
  const [editProdutosConsulta, setEditProdutosConsulta] = useState<string[]>([])
  const [editQuantidade, setEditQuantidade] = useState(1)
  const [editValorUnitario, setEditValorUnitario] = useState<string>('200')
  const [editDataConsulta, setEditDataConsulta] = useState(new Date().toISOString().split('T')[0])
  const [editFormaPagamento, setEditFormaPagamento] = useState<'Dinheiro' | 'PIX' | 'Cartão'>('PIX')
  const [editParcelas, setEditParcelas] = useState(1)

  // Estados de validação (criação)
  const [erroDescricao, setErroDescricao] = useState(false)
  const [erroValor, setErroValor] = useState(false)
  const [erroData, setErroData] = useState(false)
  const [mensagemErro, setMensagemErro] = useState('')

  // Estados de validação (edição)
  const [editErroDescricao, setEditErroDescricao] = useState(false)
  const [editErroValor, setEditErroValor] = useState(false)
  const [editErroData, setEditErroData] = useState(false)
  const [editMensagemErro, setEditMensagemErro] = useState('')

  const loadConsultas = async () => {
    if (!cliente) return
    setLoading(true)
    const data = await getConsultasByClienteId(cliente.id)
    setConsultas(data)
    setLoading(false)
  }

  useEffect(() => {
    if (open && cliente) {
      setLocalCliente(cliente)
      loadConsultas()
      // Reset estados de edição
      setEditingNome(false)
      setEditingProduto(false)
      setEditingFollowUp(false)
      setTempNome(cliente.nome || "")
    }
  }, [open, cliente])

  useEffect(() => {
    // Resetar quantidade e valor quando mudar o tipo
    if (tipo === 'Consulta') {
      setQuantidade(1)
      setValorUnitario('200')
    } else {
      setValorUnitario('150')
    }
  }, [tipo])

  useEffect(() => {
    // Resetar parcelas quando mudar forma de pagamento
    if (formaPagamento !== 'Cartão') {
      setParcelas(1)
    }
  }, [formaPagamento])

  useEffect(() => {
    // Resetar parcelas na edição quando mudar forma de pagamento
    if (editFormaPagamento !== 'Cartão') {
      setEditParcelas(1)
    }
  }, [editFormaPagamento])

  const handleUpdateNome = async () => {
    if (!localCliente) return

    const nomeToSave = tempNome.trim() ? tempNome.trim() : null
    const success = await updateClienteNome(localCliente.id, nomeToSave)

    if (success) {
      setLocalCliente({ ...localCliente, nome: nomeToSave })
      setEditingNome(false)
      toast({ title: "Nome atualizado", description: "O nome foi atualizado com sucesso." })
    } else {
      toast({ title: "Erro", description: "Não foi possível atualizar o nome.", variant: "destructive" })
    }
  }

  const handleUpdateProduto = async () => {
    if (!localCliente) return
    const valueToSave = tempProdutos.length > 0 ? tempProdutos.join(", ") : null
    const success = await updateClienteProduto(localCliente.id, valueToSave)

    if (success) {
      setLocalCliente({ ...localCliente, servico_interesse: valueToSave })
      setEditingProduto(false)
      toast({ title: "Produto atualizado", description: "Os produtos foram atualizados com sucesso." })
    } else {
      toast({ title: "Erro", description: "Não foi possível atualizar os produtos.", variant: "destructive" })
    }
  }

  const handleAddConsulta = async () => {
    // Resetar erros
    setErroDescricao(false)
    setErroValor(false)
    setErroData(false)
    setMensagemErro('')
    
    if (!cliente) return
    
    // Validação de descrição
    if (!descricao.trim()) {
      setErroDescricao(true)
      setMensagemErro('A descrição da consulta é obrigatória')
      return
    }

    // Validação de data
    if (!dataConsulta) {
      setErroData(true)
      setMensagemErro('A data da consulta é obrigatória')
      return
    }

    // Validação de quantidade
    if (quantidade < 1) {
      setMensagemErro('Quantidade deve ser maior que 0')
      return
    }

    // Validação de valor
    const valorNumerico = parseFloat(valorUnitario)
    if (!valorUnitario || isNaN(valorNumerico) || valorNumerico <= 0) {
      setErroValor(true)
      setMensagemErro('Valor unitário deve ser maior que 0')
      return
    }

    const result = await addConsulta({
      cliente_id: cliente.id,
      tipo,
      descricao: descricao.trim(),
      produtos: produtosConsulta.length > 0 ? produtosConsulta.join(", ") : null,
      quantidade,
      valor_unitario: parseFloat(valorUnitario),
      data_consulta: dataConsulta,
      forma_pagamento: formaPagamento,
      parcelas: parcelas
    })

    if (result) {
      // Limpar form
      setDescricao('')
      setQuantidade(1)
      setTipo('Consulta')
      setProdutosConsulta([])
      setValorUnitario('200')
      setDataConsulta(new Date().toISOString().split('T')[0])
      setFormaPagamento('PIX')
      setParcelas(1)
      
      // Resetar erros
      setErroDescricao(false)
      setErroValor(false)
      setErroData(false)
      setMensagemErro('')
      
      // Recarregar consultas
      loadConsultas()
    }
  }

  const handleDeleteConsulta = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta consulta?')) return
    
    const success = await deleteConsulta(id)
    if (success) {
      loadConsultas()
    }
  }

  const calcularValorTotal = () => {
    const valor = parseFloat(valorUnitario) || 0
    return valor * quantidade
  }

  const calcularValorTotalEdicao = () => {
    const valor = parseFloat(editValorUnitario) || 0
    return valor * editQuantidade
  }

  const calcularTotalPago = () => {
    return consultas.reduce((acc, c) => acc + c.valor_total, 0)
  }

  const openEditConsulta = (consulta: Consulta) => {
    setEditingConsulta(consulta)
    setEditTipo(consulta.tipo)
    setEditDescricao(consulta.descricao || '')
    setEditProdutosConsulta(
      consulta.produtos ? consulta.produtos.split(',').map((s) => s.trim()).filter(Boolean) : []
    )
    setEditQuantidade(consulta.quantidade)
    setEditValorUnitario(String(consulta.valor_unitario))
    setEditDataConsulta(consulta.data_consulta.split('T')[0])
    setEditFormaPagamento((consulta.forma_pagamento || 'PIX') as 'Dinheiro' | 'PIX' | 'Cartão')
    setEditParcelas(consulta.parcelas || 1)

    setEditErroDescricao(false)
    setEditErroValor(false)
    setEditErroData(false)
    setEditMensagemErro('')
  }

  const handleUpdateConsulta = async () => {
    setEditErroDescricao(false)
    setEditErroValor(false)
    setEditErroData(false)
    setEditMensagemErro('')

    if (!editingConsulta) return

    if (!editDescricao.trim()) {
      setEditErroDescricao(true)
      setEditMensagemErro('A descrição da consulta é obrigatória')
      return
    }

    if (!editDataConsulta) {
      setEditErroData(true)
      setEditMensagemErro('A data da consulta é obrigatória')
      return
    }

    if (editQuantidade < 1) {
      setEditMensagemErro('Quantidade deve ser maior que 0')
      return
    }

    const valorNumerico = parseFloat(editValorUnitario)
    if (!editValorUnitario || isNaN(valorNumerico) || valorNumerico <= 0) {
      setEditErroValor(true)
      setEditMensagemErro('Valor unitário deve ser maior que 0')
      return
    }

    const updated = await updateConsulta(editingConsulta.id, {
      tipo: editTipo,
      descricao: editDescricao.trim(),
      produtos: editProdutosConsulta.length > 0 ? editProdutosConsulta.join(', ') : null,
      quantidade: editQuantidade,
      valor_unitario: valorNumerico,
      data_consulta: editDataConsulta,
      forma_pagamento: editFormaPagamento,
      parcelas: editParcelas,
    })

    if (updated) {
      setEditingConsulta(null)
      await loadConsultas()
      toast({ title: 'Consulta atualizada', description: 'Alterações salvas com sucesso.' })
    } else {
      toast({ title: 'Erro', description: 'Não foi possível atualizar a consulta.', variant: 'destructive' })
    }
  }

  const handleUpdateFollowUp = async () => {
    if (!localCliente) return
    const success = await updateClienteFollowUp(localCliente.id, tempFollowUp)

    if (success) {
      setLocalCliente({ ...localCliente, follow_up: tempFollowUp })
      setEditingFollowUp(false)
      toast({ title: "Follow Up atualizado", description: "O follow up foi atualizado com sucesso." })
    } else {
      toast({ title: "Erro", description: "Não foi possível atualizar o follow up.", variant: "destructive" })
    }
  }

  const handleUpdateTag = async (newTag: string) => {
    if (!localCliente) return
    const valueToSave = newTag === "" ? null : newTag
    const success = await updateClienteTag(localCliente.id, valueToSave)

    if (success) {
      setLocalCliente({ ...localCliente, tag_status: valueToSave })
      toast({ title: "Tag atualizada", description: "A tag foi atualizada com sucesso." })
    } else {
      toast({ title: "Erro", description: "Não foi possível atualizar a tag.", variant: "destructive" })
    }
  }

  const handleToggleStatus = async () => {
    if (!localCliente) return
    
    const newTravaStatus = !localCliente.trava
    const shouldClearMensagem = !newTravaStatus

    const success = await updateClienteStatus(localCliente.id, newTravaStatus, shouldClearMensagem)

    if (success) {
      const updatedCliente = {
        ...localCliente,
        trava: newTravaStatus,
        ...(shouldClearMensagem ? { mensagem_para_humano: null } : {}),
      }
      setLocalCliente(updatedCliente)
      setShowStatusDialog(false)
      // NÃO chamar onClienteUpdate() aqui - causa reload e piscar do modal
      // O reload será feito quando o modal fechar completamente
      const action = newTravaStatus ? "travada" : "destravada"
      toast({ title: `Conversa ${action}`, description: `A conversa foi ${action} com sucesso.` })
    } else {
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" })
    }
  }

  const handleDeleteCliente = async () => {
    if (!localCliente) return
    
    console.log('[DEBUG] Iniciando remoção do lead:', localCliente.nome)
    
    const clienteId = localCliente.id
    const success = await deleteCliente(clienteId)
    
    if (success) {
      console.log('[DEBUG] Lead removido com sucesso do banco')
      
      // Mostra o toast
      toast({ title: "Sucesso", description: "Lead removido com sucesso." })
      
      // Fecha o dialog de confirmação primeiro
      console.log('[DEBUG] Fechando dialog de confirmação')
      setShowRemoveDialog(false)
      
      // Pequeno delay para garantir que o dialog fecha antes do modal principal
      setTimeout(() => {
        console.log('[DEBUG] Fechando modal principal')
        // Fecha o modal principal - isso dispara o onOpenChange que reseta selectedCliente
        onOpenChange(false)
        
        // Recarrega a lista após fechar
        setTimeout(() => {
          console.log('[DEBUG] Recarregando lista de clientes')
          onClienteUpdate?.()
        }, 100)
      }, 100)
    } else {
      console.log('[DEBUG] Erro ao remover lead')
      toast({ title: "Erro", description: "Não foi possível remover o lead.", variant: "destructive" })
    }
  }

  if (!cliente || !localCliente) return null

  const handleModalOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    // Se o modal está fechando, atualiza os dados da tabela principal
    if (!isOpen) {
      onClienteUpdate?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="pr-8">
            {!editingNome ? (
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl">{localCliente.nome || "Sem nome"}</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => {
                    setTempNome(localCliente.nome || "")
                    setEditingNome(true)
                  }}
                  title="Editar nome"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={tempNome}
                    onChange={(e) => setTempNome(e.target.value)}
                    className="h-9"
                    placeholder="Nome do lead"
                  />
                  <Button size="sm" className="h-9" onClick={handleUpdateNome} title="Salvar">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-9"
                    variant="outline"
                    onClick={() => {
                      setEditingNome(false)
                      setTempNome(localCliente.nome || "")
                    }}
                    title="Cancelar"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <DialogDescription className="flex gap-4 text-sm">
                  <span>📱 {localCliente.telefone}</span>
                </DialogDescription>
              </div>
            )}
          </div>

          {!editingNome && (
            <DialogDescription className="flex gap-4 text-sm mt-2">
              <span>📱 {localCliente.telefone}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Campos compactos no topo */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Produto */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Produto / Serviço</Label>
                {!editingProduto ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      {localCliente.servico_interesse ? (
                        <div className="flex flex-wrap gap-1">
                          {localCliente.servico_interesse.split(",").map((p) => (
                            <Badge key={p.trim()} variant="secondary" className="text-xs">{p.trim()}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        setTempProdutos(localCliente.servico_interesse ? localCliente.servico_interesse.split(",").map(s => s.trim()) : [])
                        setEditingProduto(true)
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-1.5">
                      {PRODUTOS_DISPONIVEIS.map((prod) => (
                        <label key={prod} className="flex items-center space-x-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempProdutos.includes(prod)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempProdutos([...tempProdutos, prod])
                              } else {
                                setTempProdutos(tempProdutos.filter(p => p !== prod))
                              }
                            }}
                            className="h-3 w-3 rounded"
                          />
                          <span className="text-xs">{prod}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-xs" onClick={handleUpdateProduto}>
                        <Check className="h-3 w-3 mr-1" />
                        Salvar
                      </Button>
                      <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => setEditingProduto(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tag */}
              <div className="space-y-2">
                <Label htmlFor="modal-tag" className="text-xs font-medium text-muted-foreground">Tag</Label>
                <select
                  id="modal-tag"
                  value={localCliente.tag_status || ""}
                  onChange={(e) => handleUpdateTag(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="">— Sem Tag —</option>
                  <option value="Em Atendimento">Em Atendimento</option>
                  <option value="Agendado">Agendado</option>
                  <option value="Cancelado">Cancelado</option>
                  <option value="Paciente">Paciente</option>
                  <option value="paciente_tratamento">Paciente Tratamento</option>
                  <option value="Lead">Lead</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={!localCliente.trava ? "default" : "secondary"} className={!localCliente.trava ? "text-white" : "text-orange-500"}>
                    {!localCliente.trava ? "Ativo" : "Travado"}
                  </Badge>
                  <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                      >
                        {localCliente.trava ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{localCliente.trava ? "Destravar" : "Travar"} conversa</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja {localCliente.trava ? "destravar" : "travar"} a conversa com{" "}
                          {localCliente.nome}?
                          {localCliente.trava
                            ? " A automação do WhatsApp voltará a funcionar normalmente."
                            : " A automação do WhatsApp será pausada para este cliente."}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancelar</Button>
                        <Button onClick={handleToggleStatus}>
                          {localCliente.trava ? "Destravar" : "Travar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Follow Up */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Follow Up</Label>
                {!editingFollowUp ? (
                  <div className="flex items-center gap-2">
                    <Badge variant={localCliente.follow_up > 1 ? "default" : "outline"}>
                      {localCliente.follow_up} interações
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        setTempFollowUp(localCliente.follow_up)
                        setEditingFollowUp(true)
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      min={0}
                      className="h-9"
                      value={tempFollowUp}
                      onChange={(e) => setTempFollowUp(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <Button size="sm" className="h-9" onClick={handleUpdateFollowUp}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" className="h-9" variant="outline" onClick={() => setEditingFollowUp(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Mensagem para Humano - Só exibe se tiver valor */}
              {localCliente.mensagem_para_humano && (
                <div className="space-y-2 lg:col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MessageSquareText className="h-3 w-3" />
                    Mensagem para Humano
                  </Label>
                  <div className="p-2 bg-blue-50 rounded-md text-xs whitespace-pre-wrap">
                    {localCliente.mensagem_para_humano}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Ações</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      const phoneNumber = localCliente.telefone?.replace(/\D/g, "")
                      if (phoneNumber) {
                        window.open(`https://wa.me/${phoneNumber}`, "_blank")
                      }
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                  
                  <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-9"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Remover Lead</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja remover o lead {localCliente.nome}? Esta ação é irreversível e o contato será excluído permanentemente da tabela.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteCliente}>Remover</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Consultas e Histórico */}
        <div className="space-y-6 mt-4">
          {/* Resumo */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Total de Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{consultas.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(calcularTotalPago())}</div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário Nova Consulta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Nova Consulta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <select
                    id="tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'Consulta' | 'Sessão')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="Consulta">Consulta (R$ 200,00)</option>
                    <option value="Sessão">Sessão (R$ 150,00)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data" className={erroData ? "text-red-600" : ""}>Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataConsulta}
                    onChange={(e) => {
                      setDataConsulta(e.target.value)
                      if (erroData) setErroData(false)
                      if (mensagemErro) setMensagemErro('')
                    }}
                    className={erroData ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className={erroDescricao ? "text-red-600" : ""}>Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Primeira consulta, Sessão de acompanhamento..."
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value)
                    if (erroDescricao) setErroDescricao(false)
                    if (mensagemErro) setMensagemErro('')
                  }}
                  className={erroDescricao ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produto(s)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 bg-muted/10">
                  {PRODUTOS_DISPONIVEIS.map((prod) => (
                    <label key={prod} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={produtosConsulta.includes(prod)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProdutosConsulta((prev) => Array.from(new Set([...prev, prod])))
                          } else {
                            setProdutosConsulta((prev) => prev.filter((p) => p !== prod))
                          }
                        }}
                        className="h-4 w-4 rounded"
                      />
                      <span>{prod}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  (Opcional) Selecione os produtos relacionados a esta consulta.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={tipo === 'Consulta'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorUnitario" className={erroValor ? "text-red-600" : ""}>Valor Unitário</Label>
                  <Input
                    id="valorUnitario"
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorUnitario}
                    onChange={(e) => {
                      setValorUnitario(e.target.value)
                      if (erroValor) setErroValor(false)
                      if (mensagemErro) setMensagemErro('')
                    }}
                    className={erroValor ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <div className="h-10 px-3 flex items-center border rounded-md bg-green-50 text-green-700 font-semibold">
                    {formatCurrency(calcularValorTotal())}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                  <select
                    id="formaPagamento"
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value as 'Dinheiro' | 'PIX' | 'Cartão')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão">Cartão</option>
                  </select>
                </div>

                {formaPagamento === 'Cartão' && (
                  <div className="space-y-2">
                    <Label htmlFor="parcelas">Parcelas</Label>
                    <select
                      id="parcelas"
                      value={parcelas}
                      onChange={(e) => setParcelas(parseInt(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}x
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {mensagemErro && (
                <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {mensagemErro}
                </div>
              )}
              
              <Button onClick={handleAddConsulta} className="w-full">
                Adicionar Consulta
              </Button>
            </CardContent>
          </Card>

          {/* Editar Consulta (Dialog) */}
          <Dialog open={!!editingConsulta} onOpenChange={(isOpen) => !isOpen && setEditingConsulta(null)}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Consulta</DialogTitle>
                <DialogDescription>Altere os campos e salve para atualizar o histórico.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-tipo">Tipo</Label>
                    <select
                      id="edit-tipo"
                      value={editTipo}
                      onChange={(e) => setEditTipo(e.target.value as 'Consulta' | 'Sessão')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="Consulta">Consulta</option>
                      <option value="Sessão">Sessão</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-data" className={editErroData ? 'text-red-600' : ''}>Data</Label>
                    <Input
                      id="edit-data"
                      type="date"
                      value={editDataConsulta}
                      onChange={(e) => {
                        setEditDataConsulta(e.target.value)
                        if (editErroData) setEditErroData(false)
                        if (editMensagemErro) setEditMensagemErro('')
                      }}
                      className={editErroData ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-descricao" className={editErroDescricao ? 'text-red-600' : ''}>Descrição</Label>
                  <Input
                    id="edit-descricao"
                    placeholder="Ex: Primeira consulta, Sessão de acompanhamento..."
                    value={editDescricao}
                    onChange={(e) => {
                      setEditDescricao(e.target.value)
                      if (editErroDescricao) setEditErroDescricao(false)
                      if (editMensagemErro) setEditMensagemErro('')
                    }}
                    className={editErroDescricao ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produto(s)
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 bg-muted/10">
                    {PRODUTOS_DISPONIVEIS.map((prod) => (
                      <label key={prod} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editProdutosConsulta.includes(prod)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditProdutosConsulta((prev) => Array.from(new Set([...prev, prod])))
                            } else {
                              setEditProdutosConsulta((prev) => prev.filter((p) => p !== prod))
                            }
                          }}
                          className="h-4 w-4 rounded"
                        />
                        <span>{prod}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">(Opcional) Selecione os produtos relacionados a esta consulta.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-quantidade">Quantidade</Label>
                    <Input
                      id="edit-quantidade"
                      type="number"
                      min={1}
                      value={editQuantidade}
                      onChange={(e) => setEditQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={editTipo === 'Consulta'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-valorUnitario" className={editErroValor ? 'text-red-600' : ''}>Valor Unitário</Label>
                    <Input
                      id="edit-valorUnitario"
                      type="number"
                      min={0}
                      step="0.01"
                      value={editValorUnitario}
                      onChange={(e) => {
                        setEditValorUnitario(e.target.value)
                        if (editErroValor) setEditErroValor(false)
                        if (editMensagemErro) setEditMensagemErro('')
                      }}
                      className={editErroValor ? 'border-red-500 focus-visible:ring-red-500' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valor Total</Label>
                    <div className="h-10 px-3 flex items-center border rounded-md bg-green-50 text-green-700 font-semibold">
                      {formatCurrency(calcularValorTotalEdicao())}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-formaPagamento">Forma de Pagamento</Label>
                    <select
                      id="edit-formaPagamento"
                      value={editFormaPagamento}
                      onChange={(e) => setEditFormaPagamento(e.target.value as 'Dinheiro' | 'PIX' | 'Cartão')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Cartão">Cartão</option>
                    </select>
                  </div>

                  {editFormaPagamento === 'Cartão' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-parcelas">Parcelas</Label>
                      <select
                        id="edit-parcelas"
                        value={editParcelas}
                        onChange={(e) => setEditParcelas(parseInt(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num}x
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {editMensagemErro && (
                  <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {editMensagemErro}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingConsulta(null)}>Cancelar</Button>
                <Button onClick={handleUpdateConsulta}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Histórico de Consultas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">Carregando...</p>
              ) : consultas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma consulta registrada ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {consultas.map((consulta) => (
                    <div
                      key={consulta.id}
                      className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/40 dark:hover:bg-muted/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            consulta.tipo === 'Consulta' 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200' 
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200'
                          }`}>
                            {consulta.tipo}
                          </span>
                          <span className="font-medium">{consulta.descricao}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {consulta.data_consulta.split('T')[0].split('-').reverse().join('/')} • 
                          Quantidade: {consulta.quantidade} • 
                          Unitário: {formatCurrency(consulta.valor_unitario)}
                        </div>
                        {consulta.produtos && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="font-medium">Produtos:</span>
                            <div className="flex flex-wrap gap-1">
                              {consulta.produtos.split(",").map((p) => (
                                <Badge key={p.trim()} variant="secondary" className="text-[10px] h-5">
                                  {p.trim()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {consulta.forma_pagamento && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="font-medium">Pagamento:</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {consulta.forma_pagamento}
                              {consulta.forma_pagamento === 'Cartão' && consulta.parcelas && consulta.parcelas > 1 && (
                                <span className="ml-1">({consulta.parcelas}x)</span>
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600 mr-2">{formatCurrency(consulta.valor_total)}</span>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditConsulta(consulta)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteConsulta(consulta.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
