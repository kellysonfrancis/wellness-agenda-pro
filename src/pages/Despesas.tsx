import { useState } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Receipt, Plus, Filter } from "lucide-react";
import { mockExpenses, mockBankAccounts, getAccountName } from "@/data/mockData";
import type { Expense, ExpenseType, ExpenseCategory } from "@/types/clinic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const categoryLabels: Record<ExpenseCategory, string> = {
  aluguel: "Aluguel",
  salarios: "Salários",
  materiais: "Materiais",
  equipamentos: "Equipamentos",
  marketing: "Marketing",
  manutencao: "Manutenção",
  impostos: "Impostos",
  outros: "Outros",
};

const typeLabels: Record<ExpenseType, string> = {
  fixa: "Fixa",
  variavel: "Variável",
};

const emptyExpense: Omit<Expense, "id" | "criadoEm"> = {
  tipo: "fixa",
  categoria: "outros",
  descricao: "",
  valor: 0,
  dataVencimento: new Date().toISOString().split("T")[0],
  pago: false,
  contaOrigemId: null,
  recorrente: false,
};

export default function Despesas() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [filterType, setFilterType] = useState<"all" | ExpenseType>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | ExpenseCategory>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);

  const filtered = expenses.filter((e) => {
    if (filterType !== "all" && e.tipo !== filterType) return false;
    if (filterCategory !== "all" && e.categoria !== filterCategory) return false;
    return true;
  });

  const totalFixas = expenses.filter((e) => e.tipo === "fixa").reduce((s, e) => s + e.valor, 0);
  const totalVariaveis = expenses.filter((e) => e.tipo === "variavel").reduce((s, e) => s + e.valor, 0);
  const totalPendente = expenses.filter((e) => !e.pago).reduce((s, e) => s + e.valor, 0);

  const handleSave = () => {
    if (!form.descricao.trim()) {
      toast({ title: "Preencha a descrição", variant: "destructive" });
      return;
    }
    if (form.valor <= 0) {
      toast({ title: "Valor deve ser maior que zero", variant: "destructive" });
      return;
    }
    const newExpense: Expense = {
      ...form,
      id: `exp-${Date.now()}`,
      criadoEm: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);
    setForm(emptyExpense);
    setDialogOpen(false);
    toast({ title: "Despesa adicionada com sucesso!" });
  };

  const togglePago = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, pago: !e.pago, pagoEm: !e.pago ? new Date().toISOString() : null }
          : e
      )
    );
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Despesa removida" });
  };

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Despesas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de despesas fixas e variáveis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Nova Despesa
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as ExpenseType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixa">Fixa</SelectItem>
                      <SelectItem value="variavel">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as ExpenseCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Aluguel da sala"
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.valor || ""}
                    onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={form.dataVencimento}
                    onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Conta de Saída</Label>
                <Select value={form.contaOrigemId || "none"} onValueChange={(v) => setForm({ ...form, contaOrigemId: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (definir depois)</SelectItem>
                    {mockBankAccounts.filter((a) => a.ativo).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={form.recorrente} onCheckedChange={(v) => setForm({ ...form, recorrente: v })} />
                  <Label className="cursor-pointer">Recorrente (mensal)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.pago} onCheckedChange={(v) => setForm({ ...form, pago: v })} />
                  <Label className="cursor-pointer">Já pago</Label>
                </div>
              </div>
              <button
                onClick={handleSave}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Salvar Despesa
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Despesas Fixas</p>
          <p className="text-2xl font-bold mt-1">R$ {totalFixas.toLocaleString("pt-BR")}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Despesas Variáveis</p>
          <p className="text-2xl font-bold mt-1">R$ {totalVariaveis.toLocaleString("pt-BR")}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Pendente de Pagamento</p>
          <p className="text-2xl font-bold mt-1 text-destructive">R$ {totalPendente.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | ExpenseType)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="fixa">Fixas</SelectItem>
            <SelectItem value="variavel">Variáveis</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as "all" | ExpenseCategory)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-4 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Categoria</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Conta Origem</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Vencimento</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma despesa encontrada</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="p-4 font-medium">
                    {e.descricao}
                    {e.recorrente && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">Recorrente</span>}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      e.tipo === "fixa" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"
                    }`}>
                      {typeLabels[e.tipo]}
                    </span>
                  </td>
                  <td className="p-4">{categoryLabels[e.categoria]}</td>
                  <td className="p-4 font-medium">R$ {e.valor.toLocaleString("pt-BR")}</td>
                  <td className="p-4">{e.contaOrigemId ? getAccountName(e.contaOrigemId) : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4">{new Date(e.dataVencimento).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      e.pago ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {e.pago ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePago(e.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-90 ${
                          e.pago
                            ? "bg-muted text-muted-foreground"
                            : "bg-success text-success-foreground"
                        }`}
                      >
                        {e.pago ? "Desfazer" : "Pagar"}
                      </button>
                      <button
                        onClick={() => removeExpense(e.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GlobalLayout>
  );
}
