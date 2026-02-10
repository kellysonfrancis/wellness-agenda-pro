import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, Search, Plus, Phone, Mail, Loader2, X, Pencil, Save, Trash2, Calendar } from "lucide-react";

interface DBClient {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  created_at: string;
}

interface DBAppointment {
  id: string;
  inicio_em: string;
  status: string;
  service: { nome: string } | null;
}

const emptyForm = {
  nome: "",
  telefone: "",
  email: "",
  data_nascimento: "",
  observacoes: "",
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

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("nome");
    if (data) setClients(data as DBClient[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Fetch appointments when a client is selected
  useEffect(() => {
    if (!selectedId) { setAppointments([]); return; }
    supabase
      .from("appointments")
      .select("id, inicio_em, status, service:services(nome)")
      .eq("client_id", selectedId)
      .order("inicio_em", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setAppointments(data as unknown as DBAppointment[]);
      });
  }, [selectedId]);

  const filtered = clients.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.telefone.includes(search)
  );

  const selected = selectedId ? clients.find((c) => c.id === selectedId) : null;

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
    // Check for dependencies
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

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
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
              ) : filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 hover:bg-muted/40 transition-colors ${selectedId === c.id ? "bg-accent/60" : ""}`}
                >
                  <p className="text-sm font-medium">{c.nome}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{c.telefone}</p>
                </button>
              ))}
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
                      <h2 className="text-lg font-semibold mb-2">{selected.nome}</h2>
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
