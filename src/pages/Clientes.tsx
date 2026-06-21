import { useState, useEffect, useCallback, useMemo } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { createAndDownloadExcel } from "@/lib/excelExport";
import {
  Users, Search, Plus, Phone, Mail, Loader2, X, Pencil, Save, Trash2, Calendar,
  Filter, UserCheck, UserX, Download, Package
} from "lucide-react";

interface DBClient {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  origem_captacao: string | null;
  created_at: string;
}

interface DBAppointment {
  id: string;
  inicio_em: string;
  status: string;
  service: { nome: string } | null;
}

interface ClientCategory {
  clientId: string;
  categorias: string[];
  ativo: boolean;
}

interface DBEntitlement {
  id: string;
  status: string;
  inicio_em: string;
  expira_em: string | null;
  saldo_creditos: number | null;
  observacoes: string | null;
  product_plan: { nome: string; categoria: string; tipo: string } | null;
}

const emptyForm = {
  nome: "",
  telefone: "",
  email: "",
  data_nascimento: "",
  observacoes: "",
  origem_captacao: "",
};

const CAT_COLORS: Record<string, string> = {
  pilates: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  fisioterapia: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  estetica: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/20",
};

const CAT_LABELS: Record<string, string> = {
  pilates: "Pilates",
  fisioterapia: "Fisioterapia",
  estetica: "Estética",
};

export default function Clientes() {
  const [clients, setClients] = useState<DBClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [entitlements, setEntitlements] = useState<DBEntitlement[]>([]);
  const [clientCategories, setClientCategories] = useState<Map<string, ClientCategory>>(new Map());

  // Filters
  const [filterCategoria, setFilterCategoria] = useState<string>("todas");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("nome");
    if (data) setClients(data as DBClient[]);
    setLoading(false);
  }, []);

  const fetchClientCategories = useCallback(async () => {
    // Fetch active entitlements with their product plan categories
    const { data: entitlements } = await supabase
      .from("client_entitlements")
      .select("client_id, status, product_plan:product_plans(categoria)")
      .order("created_at", { ascending: false });

    if (!entitlements) return;

    const catMap = new Map<string, ClientCategory>();

    for (const ent of entitlements) {
      const clientId = ent.client_id;
      const categoria = (ent.product_plan as any)?.categoria;
      const isAtivo = ent.status === "ativo";

      if (!catMap.has(clientId)) {
        catMap.set(clientId, { clientId, categorias: [], ativo: false });
      }
      const entry = catMap.get(clientId)!;
      if (categoria && !entry.categorias.includes(categoria)) {
        entry.categorias.push(categoria);
      }
      if (isAtivo) entry.ativo = true;
    }

    setClientCategories(catMap);
  }, []);

  useEffect(() => {
    fetchClients();
    fetchClientCategories();
  }, [fetchClients, fetchClientCategories]);

  // Fetch appointments and entitlements when a client is selected
  useEffect(() => {
    if (!selectedId) { setAppointments([]); setEntitlements([]); return; }
    supabase
      .from("appointments")
      .select("id, inicio_em, status, service:services(nome)")
      .eq("client_id", selectedId)
      .order("inicio_em", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setAppointments(data as unknown as DBAppointment[]);
      });
    supabase
      .from("client_entitlements")
      .select("id, status, inicio_em, expira_em, saldo_creditos, observacoes, product_plan:product_plans(nome, categoria, tipo)")
      .eq("client_id", selectedId)
      .order("inicio_em", { ascending: false })
      .then(({ data }) => {
        if (data) setEntitlements(data as unknown as DBEntitlement[]);
      });
  }, [selectedId]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      // Text search
      const matchesSearch =
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.telefone.includes(search);
      if (!matchesSearch) return false;

      const catInfo = clientCategories.get(c.id);

      // Category filter
      if (filterCategoria !== "todas") {
        if (!catInfo || !catInfo.categorias.includes(filterCategoria)) return false;
      }

      // Status filter
      if (filterStatus === "ativos") {
        if (!catInfo || !catInfo.ativo) return false;
      } else if (filterStatus === "inativos") {
        if (catInfo && catInfo.ativo) return false;
      }

      return true;
    });
  }, [clients, search, filterCategoria, filterStatus, clientCategories]);

  const selected = selectedId ? clients.find((c) => c.id === selectedId) : null;
  const selectedCat = selectedId ? clientCategories.get(selectedId) : null;

  // Stats
  const totalAtivos = useMemo(() => {
    let count = 0;
    clientCategories.forEach((v) => { if (v.ativo) count++; });
    return count;
  }, [clientCategories]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (c: DBClient) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome,
      telefone: c.telefone,
      email: c.email || "",
      data_nascimento: c.data_nascimento || "",
      observacoes: c.observacoes || "",
      origem_captacao: c.origem_captacao || "",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast({ title: "Nome e telefone são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      data_nascimento: form.data_nascimento || null,
      observacoes: form.observacoes.trim() || null,
      origem_captacao: form.origem_captacao || null,
    };

    if (editingId) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cliente atualizado!" });
        setShowForm(false);
        fetchClients();
      }
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cliente cadastrado!" });
        setShowForm(false);
        setForm({ ...emptyForm });
        fetchClients();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const [apptRes, payRes, entRes] = await Promise.all([
      supabase.from("appointments").select("id").eq("client_id", id).limit(1),
      supabase.from("payments").select("id").eq("client_id", id).limit(1),
      supabase.from("client_entitlements").select("id").eq("client_id", id).limit(1),
    ]);
    const deps: string[] = [];
    if (apptRes.data?.length) deps.push("agendamentos");
    if (payRes.data?.length) deps.push("pagamentos");
    if (entRes.data?.length) deps.push("pacotes/planos");

    if (deps.length > 0) {
      toast({ title: "Não é possível excluir", description: `Cliente possui ${deps.join(", ")} vinculados.`, variant: "destructive" });
      setConfirmDeleteId(null);
      return;
    }

    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente excluído!" });
      setConfirmDeleteId(null);
      if (selectedId === id) setSelectedId(null);
      fetchClients();
    }
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast({ title: "Nenhum cliente para exportar", variant: "destructive" });
      return;
    }

    const rows: (string | number | null | undefined)[][] = [
      ["Nome", "Telefone", "E-mail", "Nascimento", "Categorias", "Status", "Observações"],
    ];

    for (const c of filtered) {
      const catInfo = clientCategories.get(c.id);
      const cats = catInfo?.categorias.map(cat => CAT_LABELS[cat] || cat).join(", ") || "—";
      const status = catInfo ? (catInfo.ativo ? "Ativo" : "Inativo") : "Sem plano";
      const nasc = c.data_nascimento
        ? new Date(c.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")
        : "";

      rows.push([c.nome, c.telefone, c.email || "", nasc, cats, status, c.observacoes || ""]);
    }

    const filterLabel = filterCategoria !== "todas" ? `_${filterCategoria}` : "";
    const statusLabel = filterStatus !== "todos" ? `_${filterStatus}` : "";
    const filename = `clientes${filterLabel}${statusLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    await createAndDownloadExcel([{ name: "Clientes", data: rows }], filename);
    toast({ title: `${filtered.length} clientes exportados!` });
  };

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} cadastrados · <span className="text-primary font-medium">{totalAtivos} ativos</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="todas">Todas categorias</option>
            <option value="pilates">🧘 Pilates</option>
            <option value="fisioterapia">🩺 Fisioterapia</option>
            <option value="estetica">✨ Estética</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="todos">Todos</option>
            <option value="ativos">✅ Ativos</option>
            <option value="inativos">⏸ Inativos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground text-center">Nenhum cliente encontrado.</p>
              ) : filtered.map((c) => {
                const catInfo = clientCategories.get(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-4 hover:bg-muted/40 transition-colors ${selectedId === c.id ? "bg-accent/60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{c.nome}</p>
                      {catInfo?.ativo ? (
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : catInfo ? (
                        <UserX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />{c.telefone}
                    </p>
                    {catInfo && catInfo.categorias.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {catInfo.categorias.map((cat) => (
                          <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CAT_COLORS[cat] || ""}`}>
                            {CAT_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {!selected ? (
              <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center text-muted-foreground text-sm">
                Selecione um cliente para ver detalhes.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold">{selected.nome}</h2>
                        {selectedCat?.ativo ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Ativo</Badge>
                        ) : selectedCat ? (
                          <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Sem plano</Badge>
                        )}
                      </div>
                      {selectedCat && selectedCat.categorias.length > 0 && (
                        <div className="flex gap-1.5 mb-2 flex-wrap">
                          {selectedCat.categorias.map((cat) => (
                            <span key={cat} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[cat] || ""}`}>
                              {CAT_LABELS[cat] || cat}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selected.telefone}</span>
                        {selected.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selected.email}</span>}
                        {selected.data_nascimento && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(selected.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                      </div>
                      {selected.observacoes && <p className="text-xs text-muted-foreground mt-2">{selected.observacoes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(selected)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      {confirmDeleteId === selected.id ? (
                        <button onClick={() => handleDelete(selected.id)} className="text-xs py-1 px-2 rounded-lg bg-destructive text-destructive-foreground font-medium">Confirmar</button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(selected.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Trash2 className="h-4 w-4 text-destructive" /></button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Entitlements / Plans History */}
                <div className="bg-card rounded-xl border border-border shadow-sm">
                  <div className="border-b border-border p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-primary" /> Planos / Pacotes ({entitlements.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {entitlements.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">Nenhum plano ou pacote vinculado.</p>
                    ) : entitlements.map(ent => {
                      const cat = ent.product_plan?.categoria || "";
                      const statusColors: Record<string, string> = {
                        ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                        pausado: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                        encerrado: "bg-muted text-muted-foreground",
                        vencido: "bg-destructive/10 text-destructive",
                      };
                      return (
                        <div key={ent.id} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ent.product_plan?.nome || "Plano"}</span>
                              {cat && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CAT_COLORS[cat] || ""}`}>
                                  {CAT_LABELS[cat] || cat}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ent.status] || "bg-muted text-muted-foreground"}`}>
                              {ent.status}
                            </span>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Início: {new Date(ent.inicio_em + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                            {ent.expira_em && <span>Vencimento: {new Date(ent.expira_em + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                            {ent.saldo_creditos != null && <span>Créditos: {ent.saldo_creditos}</span>}
                          </div>
                          {ent.observacoes && <p className="text-xs text-muted-foreground mt-1 italic">{ent.observacoes}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Appointments */}
                <div className="bg-card rounded-xl border border-border shadow-sm">
                  <div className="border-b border-border p-4"><h3 className="text-sm font-semibold">Atendimentos ({appointments.length})</h3></div>
                  <div className="divide-y divide-border">
                    {appointments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum atendimento.</p> :
                      appointments.map(a => (
                        <div key={a.id} className="p-3 text-sm flex justify-between">
                          <span>{new Date(a.inicio_em).toLocaleDateString("pt-BR")} — {a.service?.nome || "Serviço"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "concluido" ? "bg-success/10 text-success" : a.status === "cancelado" || a.status === "faltou" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{a.status}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Cliente" : "Novo Cliente"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nome *</label>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="Nome completo" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Telefone *</label>
                <input required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" placeholder="(11) 99999-0000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Nascimento</label>
                  <input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Salvar" : "Cadastrar"}
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
