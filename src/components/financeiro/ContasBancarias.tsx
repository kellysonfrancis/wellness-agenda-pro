import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BankAccountType } from "@/types/clinic";
import { Building2, Wallet, Smartphone, CreditCard, Plus, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Pencil, Power, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface DBAccount {
  id: string;
  nome: string;
  tipo: string;
  banco: string | null;
  saldo_inicial: number;
  saldo_atual: number;
  ativo: boolean;
}

interface DBTransaction {
  id: string;
  conta_origem_id: string | null;
  conta_destino_id: string | null;
  tipo: string;
  valor: number;
  descricao: string;
  created_at: string;
}

const typeIcons: Record<BankAccountType, React.ElementType> = {
  corrente: Building2, caixa: Wallet, digital: Smartphone, maquininha: CreditCard,
};

const typeLabels: Record<BankAccountType, string> = {
  corrente: "Conta Corrente", caixa: "Caixa Físico", digital: "Conta Digital", maquininha: "Maquininha",
};

const txTypeLabels: Record<string, string> = { entrada: "Entrada", saida: "Saída", transferencia: "Transferência" };

export default function ContasBancarias() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<DBAccount[]>([]);
  const [transactions, setTransactions] = useState<DBTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<DBAccount | null>(null);
  const [saving, setSaving] = useState(false);

  const [newAccount, setNewAccount] = useState({ nome: "", tipo: "corrente" as BankAccountType, banco: "", saldoInicial: 0 });
  const [editForm, setEditForm] = useState({ nome: "", tipo: "corrente" as BankAccountType, banco: "" });
  const [transfer, setTransfer] = useState({ origemId: "", destinoId: "", valor: 0, descricao: "" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [accRes, txRes] = await Promise.all([
      supabase.from("bank_accounts").select("*").order("nome"),
      supabase.from("account_transactions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (accRes.data) setAccounts(accRes.data as DBAccount[]);
    if (txRes.data) setTransactions(txRes.data as DBTransaction[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.nome ?? "—";
  const totalBalance = accounts.filter(a => a.ativo).reduce((s, a) => s + Number(a.saldo_atual), 0);

  const handleAddAccount = async () => {
    if (!newAccount.nome.trim()) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("bank_accounts").insert({
      nome: newAccount.nome.trim(),
      tipo: newAccount.tipo,
      banco: newAccount.banco.trim() || null,
      saldo_inicial: newAccount.saldoInicial,
      saldo_atual: newAccount.saldoInicial,
    } as any);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Conta adicionada!" }); setNewAccount({ nome: "", tipo: "corrente", banco: "", saldoInicial: 0 }); setDialogOpen(false); fetchAll(); }
    setSaving(false);
  };

  const handleOpenEdit = (account: DBAccount) => {
    setEditingAccount(account);
    setEditForm({ nome: account.nome, tipo: account.tipo as BankAccountType, banco: account.banco || "" });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount || !editForm.nome.trim()) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("bank_accounts").update({
      nome: editForm.nome.trim(),
      tipo: editForm.tipo,
      banco: editForm.banco.trim() || null,
    } as any).eq("id", editingAccount.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Conta atualizada!" }); setEditOpen(false); setEditingAccount(null); fetchAll(); }
    setSaving(false);
  };

  const handleToggleActive = async (account: DBAccount) => {
    const { error } = await supabase.from("bank_accounts").update({ ativo: !account.ativo } as any).eq("id", account.id);
    if (!error) { toast({ title: account.ativo ? "Conta desativada" : "Conta reativada" }); fetchAll(); }
  };

  const handleTransfer = async () => {
    if (!transfer.origemId || !transfer.destinoId) { toast({ title: "Selecione origem e destino", variant: "destructive" }); return; }
    if (transfer.origemId === transfer.destinoId) { toast({ title: "Origem e destino devem ser diferentes", variant: "destructive" }); return; }
    if (transfer.valor <= 0) { toast({ title: "Valor deve ser maior que zero", variant: "destructive" }); return; }

    setSaving(true);
    const descricao = transfer.descricao || `Transferência ${getAccountName(transfer.origemId)} → ${getAccountName(transfer.destinoId)}`;
    const { error } = await supabase.rpc("transfer_funds" as any, {
      p_origem: transfer.origemId,
      p_destino: transfer.destinoId,
      p_valor: transfer.valor,
      p_descricao: descricao,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Transferência realizada!" });
      setTransfer({ origemId: "", destinoId: "", valor: 0, descricao: "" });
      setTransferOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Saldo Total</p>
          <p className="text-3xl font-bold">R$ {totalBalance.toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
                <ArrowRightLeft className="h-4 w-4" /> Transferir
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Conta de Origem</Label>
                  <Select value={transfer.origemId} onValueChange={(v) => setTransfer({ ...transfer, origemId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.ativo).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.nome} (R$ {Number(a.saldo_atual).toLocaleString("pt-BR")})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conta de Destino</Label>
                  <Select value={transfer.destinoId} onValueChange={(v) => setTransfer({ ...transfer, destinoId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.ativo).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Valor (R$)</Label><Input type="number" min={0} step={0.01} value={transfer.valor || ""} onChange={(e) => setTransfer({ ...transfer, valor: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Descrição (opcional)</Label><Input value={transfer.descricao} onChange={(e) => setTransfer({ ...transfer, descricao: e.target.value })} placeholder="Ex: Transferência mensal" maxLength={200} /></div>
                <button onClick={handleTransfer} disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Processando..." : "Confirmar Transferência"}
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4" /> Nova Conta
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Nome da Conta</Label><Input value={newAccount.nome} onChange={(e) => setNewAccount({ ...newAccount, nome: e.target.value })} placeholder="Ex: Nubank PJ" maxLength={100} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={newAccount.tipo} onValueChange={(v) => setNewAccount({ ...newAccount, tipo: v as BankAccountType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(typeLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Banco (opcional)</Label><Input value={newAccount.banco} onChange={(e) => setNewAccount({ ...newAccount, banco: e.target.value })} placeholder="Ex: Itaú" maxLength={50} /></div>
                </div>
                <div><Label>Saldo Inicial (R$)</Label><Input type="number" min={0} step={0.01} value={newAccount.saldoInicial || ""} onChange={(e) => setNewAccount({ ...newAccount, saldoInicial: parseFloat(e.target.value) || 0 })} /></div>
                <button onClick={handleAddAccount} disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar Conta"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account cards - Active */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.filter(a => a.ativo).map((account) => {
          const Icon = typeIcons[account.tipo as BankAccountType] || Building2;
          return (
            <div key={account.id} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{account.nome}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[account.tipo as BankAccountType] || account.tipo}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenEdit(account)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Desativar">
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desativar "{account.nome}"?</AlertDialogTitle>
                        <AlertDialogDescription>A conta não aparecerá mais nas opções de pagamento e transferência.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleToggleActive(account)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desativar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="text-2xl font-bold">R$ {Number(account.saldo_atual).toLocaleString("pt-BR")}</p>
              {account.banco && <p className="text-xs text-muted-foreground mt-1">{account.banco}</p>}
            </div>
          );
        })}
      </div>

      {/* Inactive accounts */}
      {accounts.some(a => !a.ativo) && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Contas Desativadas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.filter(a => !a.ativo).map((account) => {
              const Icon = typeIcons[account.tipo as BankAccountType] || Building2;
              return (
                <div key={account.id} className="stat-card opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{account.nome}</p>
                        <p className="text-xs text-muted-foreground">{typeLabels[account.tipo as BankAccountType]} · Inativa</p>
                      </div>
                    </div>
                    <button onClick={() => handleToggleActive(account)} className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors">Reativar</button>
                  </div>
                  <p className="text-xl font-bold text-muted-foreground">R$ {Number(account.saldo_atual).toLocaleString("pt-BR")}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border"><h2 className="text-lg font-semibold">Extrato / Movimentações</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Conta Origem</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Conta Destino</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma movimentação</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30">
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                      tx.tipo === "entrada" ? "bg-success/10 text-success" :
                      tx.tipo === "saida" ? "bg-destructive/10 text-destructive" :
                      "bg-info/10 text-info"
                    }`}>
                      {tx.tipo === "entrada" && <ArrowDownLeft className="h-3 w-3" />}
                      {tx.tipo === "saida" && <ArrowUpRight className="h-3 w-3" />}
                      {tx.tipo === "transferencia" && <ArrowRightLeft className="h-3 w-3" />}
                      {txTypeLabels[tx.tipo] || tx.tipo}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{tx.descricao}</td>
                  <td className="p-4">{tx.conta_origem_id ? getAccountName(tx.conta_origem_id) : "—"}</td>
                  <td className="p-4">{tx.conta_destino_id ? getAccountName(tx.conta_destino_id) : "—"}</td>
                  <td className={`p-4 font-medium ${tx.tipo === "entrada" ? "text-success" : tx.tipo === "saida" ? "text-destructive" : ""}`}>
                    {tx.tipo === "saida" ? "−" : tx.tipo === "entrada" ? "+" : ""}R$ {Number(tx.valor).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-4">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Conta</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Nome da Conta</Label><Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} maxLength={100} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={editForm.tipo} onValueChange={(v) => setEditForm({ ...editForm, tipo: v as BankAccountType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Banco (opcional)</Label><Input value={editForm.banco} onChange={(e) => setEditForm({ ...editForm, banco: e.target.value })} maxLength={50} /></div>
            </div>
            <button onClick={handleSaveEdit} disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
