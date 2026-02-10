import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Package, Plus, Tag, Heart, Loader2, X, Pencil, Save, Trash2 } from "lucide-react";

interface DBPlan {
  id: string;
  tipo: string;
  nome: string;
  categoria: string;
  preco: number;
  validade_dias: number | null;
  creditos_total: number | null;
  itens_combo: unknown;
  frequencia_pilates: string | null;
  vigencia_meses: number | null;
  aulas_por_mes: number | null;
  ilimitado: boolean;
  termo_fidelizacao: string | null;
  multa_cancelamento: number | null;
  desconto_indicacao_pct: number | null;
  desconto_familiar_pct: number | null;
  ativo: boolean;
}

interface Category {
  slug: string;
  nome: string;
}

const tipoLabel: Record<string, string> = {
  mensal_recorrente: "Mensal Recorrente",
  pacote_creditos: "Pacote de Créditos",
  combo_itens: "Combo de Itens",
  creditos_estetica: "Créditos Estética",
};
const freqLabel: Record<string, string> = { "2x_semana": "2x/semana", "3x_semana": "3x/semana", avulsa: "Avulsa" };

const emptyForm = {
  tipo: "" as string,
  nome: "",
  categoria: "",
  preco: 0,
  validade_dias: "" as string | number,
  creditos_total: "" as string | number,
  frequencia_pilates: "",
  vigencia_meses: "" as string | number,
  aulas_por_mes: "" as string | number,
  ilimitado: false,
  desconto_indicacao_pct: "" as string | number,
  desconto_familiar_pct: "" as string | number,
};

export default function Pacotes() {
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [plansRes, catRes] = await Promise.all([
      supabase.from("product_plans").select("*").order("nome"),
      supabase.from("categories").select("slug, nome").eq("ativo", true).order("nome"),
    ]);
    if (plansRes.data) setPlans(plansRes.data as DBPlan[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getCatLabel = (slug: string) => categories.find((c) => c.slug === slug)?.nome || slug;

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); };

  const openEdit = (p: DBPlan) => {
    setEditingId(p.id);
    setForm({
      tipo: p.tipo,
      nome: p.nome,
      categoria: p.categoria,
      preco: p.preco,
      validade_dias: p.validade_dias ?? "",
      creditos_total: p.creditos_total ?? "",
      frequencia_pilates: p.frequencia_pilates || "",
      vigencia_meses: p.vigencia_meses ?? "",
      aulas_por_mes: p.aulas_por_mes ?? "",
      ilimitado: p.ilimitado,
      desconto_indicacao_pct: p.desconto_indicacao_pct ?? "",
      desconto_familiar_pct: p.desconto_familiar_pct ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.tipo || !form.categoria) {
      toast({ title: "Nome, tipo e categoria são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      tipo: form.tipo,
      nome: form.nome.trim(),
      categoria: form.categoria,
      preco: form.preco,
      validade_dias: form.validade_dias === "" ? null : Number(form.validade_dias),
      creditos_total: form.creditos_total === "" ? null : Number(form.creditos_total),
      frequencia_pilates: form.frequencia_pilates || null,
      vigencia_meses: form.vigencia_meses === "" ? null : Number(form.vigencia_meses),
      aulas_por_mes: form.aulas_por_mes === "" ? null : Number(form.aulas_por_mes),
      ilimitado: form.ilimitado,
      desconto_indicacao_pct: form.desconto_indicacao_pct === "" ? null : Number(form.desconto_indicacao_pct),
      desconto_familiar_pct: form.desconto_familiar_pct === "" ? null : Number(form.desconto_familiar_pct),
    };

    if (editingId) {
      const { error } = await supabase.from("product_plans").update(payload as any).eq("id", editingId);
      if (error) toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      else { toast({ title: "Pacote atualizado!" }); setShowForm(false); fetchAll(); }
    } else {
      const { error } = await supabase.from("product_plans").insert(payload as any);
      if (error) toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      else { toast({ title: "Pacote criado!" }); setShowForm(false); setForm({ ...emptyForm }); fetchAll(); }
    }
    setSaving(false);
  };

  const toggleAtivo = async (p: DBPlan) => {
    const { error } = await supabase.from("product_plans").update({ ativo: !p.ativo } as any).eq("id", p.id);
    if (!error) fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { data: ents } = await supabase.from("client_entitlements").select("id").eq("product_plan_id", id).limit(1);
    if (ents?.length) {
      toast({ title: "Não é possível excluir", description: "Este pacote possui clientes vinculados. Desative-o em vez de excluir.", variant: "destructive" });
      setConfirmDeleteId(null);
      return;
    }
    const { error } = await supabase.from("product_plans").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else { toast({ title: "Pacote excluído!" }); setConfirmDeleteId(null); fetchAll(); }
  };

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Pacotes & Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie e gerencie produtos comerciais</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Novo Pacote
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center"><p className="text-muted-foreground text-sm">Nenhum pacote cadastrado.</p></div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Frequência</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Preço</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Créditos</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Descontos</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Validade</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{p.nome}</td>
                  <td className="p-4 text-muted-foreground">{tipoLabel[p.tipo] || p.tipo}</td>
                  <td className="p-4 hidden sm:table-cell capitalize">{getCatLabel(p.categoria)}</td>
                  <td className="p-4 hidden md:table-cell">
                    {p.frequencia_pilates ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{freqLabel[p.frequencia_pilates] || p.frequencia_pilates}</span>
                    ) : "—"}
                  </td>
                  <td className="p-4">R$ {Number(p.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 hidden md:table-cell">{p.ilimitado ? "Ilimitado" : p.creditos_total ?? p.aulas_por_mes ?? "—"}</td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex flex-col gap-1">
                      {p.desconto_indicacao_pct ? <span className="inline-flex items-center gap-1 text-xs text-success"><Tag className="h-3 w-3" /> {p.desconto_indicacao_pct}% indicação</span> : null}
                      {p.desconto_familiar_pct ? <span className="inline-flex items-center gap-1 text-xs text-info"><Heart className="h-3 w-3" /> {p.desconto_familiar_pct}% familiar</span> : null}
                      {!p.desconto_indicacao_pct && !p.desconto_familiar_pct && "—"}
                    </div>
                  </td>
                  <td className="p-4 hidden lg:table-cell">{p.validade_dias ? `${p.validade_dias}d` : p.vigencia_meses ? `${p.vigencia_meses}m` : "—"}</td>
                  <td className="p-4">
                    <button onClick={() => toggleAtivo(p)} className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors ${p.ativo ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      {confirmDeleteId === p.id ? (
                        <button onClick={() => handleDelete(p.id)} className="text-xs py-1 px-2 rounded-lg bg-destructive text-destructive-foreground font-medium">Confirmar</button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Pacote" : "Novo Pacote"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nome *</label>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="Ex: Pilates 2x/sem" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Tipo *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">Selecione</option>
                    {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Categoria *</label>
                  <select required value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">Selecione</option>
                    {categories.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Preço (R$) *</label>
                  <input type="number" required min={0} step={0.01} value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Frequência Pilates</label>
                  <select value={form.frequencia_pilates} onChange={(e) => setForm({ ...form, frequencia_pilates: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">Nenhuma</option>
                    {Object.entries(freqLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Créditos</label>
                  <input type="number" min={0} value={form.creditos_total} onChange={(e) => setForm({ ...form, creditos_total: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="Qtd" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Vigência (meses)</label>
                  <input type="number" min={1} value={form.vigencia_meses} onChange={(e) => setForm({ ...form, vigencia_meses: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Validade (dias)</label>
                  <input type="number" min={1} value={form.validade_dias} onChange={(e) => setForm({ ...form, validade_dias: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Aulas/mês</label>
                  <input type="number" min={1} value={form.aulas_por_mes} onChange={(e) => setForm({ ...form, aulas_por_mes: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">% Indicação</label>
                  <input type="number" min={0} max={100} value={form.desconto_indicacao_pct} onChange={(e) => setForm({ ...form, desconto_indicacao_pct: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">% Familiar</label>
                  <input type="number" min={0} max={100} value={form.desconto_familiar_pct} onChange={(e) => setForm({ ...form, desconto_familiar_pct: e.target.value === "" ? "" : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.ilimitado} onChange={(e) => setForm({ ...form, ilimitado: e.target.checked })} className="rounded border-input" />
                <span className="text-sm text-muted-foreground">Ilimitado</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Salvar" : "Criar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
