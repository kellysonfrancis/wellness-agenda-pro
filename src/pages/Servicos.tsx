import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Plus, Users, FileText, Upload, MoreVertical, Loader2, X, Pencil, Save, Trash2 } from "lucide-react";

interface DBService {
  id: string;
  categoria: string;
  nome: string;
  duracao_min: number;
  preco_base: number;
  permite_pacote: boolean;
  max_alunos: number | null;
  ativo: boolean;
}

interface Category {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
}

interface ContractTemplate {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  criadoEm: string;
}

const defaultTemplates: ContractTemplate[] = [
  { id: "ct1", nome: "Contrato Pilates Mensal", categoria: "pilates", descricao: "Contrato padrão para planos mensais de Pilates com termos de fidelização.", criadoEm: new Date().toISOString() },
  { id: "ct2", nome: "Contrato Fisioterapia", categoria: "fisioterapia", descricao: "Termo de responsabilidade e consentimento para tratamento fisioterapêutico.", criadoEm: new Date().toISOString() },
  { id: "ct3", nome: "Contrato Estética", categoria: "estetica", descricao: "Contrato para procedimentos estéticos com termos de ciência dos riscos.", criadoEm: new Date().toISOString() },
];

const emptyForm = {
  nome: "",
  categoria: "",
  duracao_min: 50,
  preco_base: 0,
  permite_pacote: true,
  max_alunos: "" as string | number,
};

export default function Servicos() {
  const [templates] = useState<ContractTemplate[]>(defaultTemplates);
  const [services, setServices] = useState<DBService[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [svcRes, catRes] = await Promise.all([
      supabase.from("services").select("*").order("nome"),
      supabase.from("categories").select("id, nome, slug, ativo").eq("ativo", true).order("nome"),
    ]);
    if (svcRes.data) setServices(svcRes.data as DBService[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getCatLabel = (slug: string) => categories.find((c) => c.slug === slug)?.nome || slug.charAt(0).toUpperCase() + slug.slice(1);

  const catColor: Record<string, string> = {
    pilates: "bg-primary/10 text-primary",
    fisioterapia: "bg-info/10 text-info",
    estetica: "bg-accent text-accent-foreground",
  };
  const getCatColor = (slug: string) => catColor[slug] || "bg-muted text-muted-foreground";

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (s: DBService) => {
    setEditingId(s.id);
    setForm({
      nome: s.nome,
      categoria: s.categoria,
      duracao_min: s.duracao_min,
      preco_base: s.preco_base,
      permite_pacote: s.permite_pacote,
      max_alunos: s.max_alunos ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.categoria) {
      toast({ title: "Nome e categoria são obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      duracao_min: form.duracao_min,
      preco_base: form.preco_base,
      permite_pacote: form.permite_pacote,
      max_alunos: form.max_alunos === "" ? null : Number(form.max_alunos),
    };

    if (editingId) {
      const { error } = await supabase.from("services").update(payload as any).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Serviço atualizado!" });
        setShowForm(false);
        fetchAll();
      }
    } else {
      const { error } = await supabase.from("services").insert(payload as any);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Serviço criado!" });
        setShowForm(false);
        setForm({ ...emptyForm });
        fetchAll();
      }
    }
    setSaving(false);
  };

  const toggleAtivo = async (s: DBService) => {
    const { error } = await supabase.from("services").update({ ativo: !s.ativo } as any).eq("id", s.id);
    if (!error) fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { data: appts } = await supabase.from("appointments").select("id").eq("service_id", id).limit(1);
    if (appts?.length) {
      toast({ title: "Não é possível excluir", description: "Este serviço possui agendamentos vinculados. Desative-o em vez de excluir.", variant: "destructive" });
      setConfirmDeleteId(null);
      return;
    }
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço excluído!" });
      setConfirmDeleteId(null);
      fetchAll();
    }
  };

  const handleDuplicate = async (s: DBService) => {
    const payload = {
      nome: `${s.nome} (cópia)`,
      categoria: s.categoria,
      duracao_min: s.duracao_min,
      preco_base: s.preco_base,
      permite_pacote: s.permite_pacote,
      max_alunos: s.max_alunos,
    };
    const { error } = await supabase.from("services").insert(payload as any);
    if (error) {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço duplicado!" });
      fetchAll();
    }
  };

  return (
    <GlobalLayout>
      {/* ── Contratos / Templates ── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Templates de Contratos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Modelos de contrato para cada categoria de serviço</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors">
            <Upload className="h-4 w-4" /> Enviar Template
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{t.nome}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block font-medium ${getCatColor(t.categoria)}`}>
                      {getCatLabel(t.categoria)}
                    </span>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.descricao}</p>
              <div className="flex gap-2">
                <button className="flex-1 text-xs py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-accent">Visualizar</button>
                <button className="text-xs py-1.5 px-3 rounded-lg border border-input text-muted-foreground hover:bg-muted">Substituir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Serviços ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os serviços oferecidos</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Novo Serviço
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : services.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum serviço cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{s.nome}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${getCatColor(s.categoria)}`}>
                    {getCatLabel(s.categoria)}
                  </span>
                </div>
                <button
                  onClick={() => toggleAtivo(s)}
                  className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${s.ativo ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {s.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{s.duracao_min} min</span>
                <span className="font-semibold text-foreground">R$ {Number(s.preco_base).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              {s.max_alunos && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>Máx. {s.max_alunos} aluno{s.max_alunos > 1 ? "s" : ""} por horário</span>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-accent transition-colors">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button onClick={() => handleDuplicate(s)} className="text-xs py-1.5 px-3 rounded-lg border border-input text-muted-foreground hover:bg-muted transition-colors">Duplicar</button>
                {confirmDeleteId === s.id ? (
                  <button onClick={() => handleDelete(s.id)} className="text-xs py-1.5 px-2.5 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity">
                    Confirmar
                  </button>
                ) : (
                  <button onClick={() => setConfirmDeleteId(s.id)} className="text-xs py-1.5 px-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Serviço" : "Novo Serviço"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="svc-nome">Nome *</label>
                <input
                  id="svc-nome"
                  required
                  maxLength={100}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Ex: Pilates Solo"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground" htmlFor="svc-cat">Categoria *</label>
                <select
                  id="svc-cat"
                  required
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="svc-dur">Duração (min) *</label>
                  <input
                    id="svc-dur"
                    type="number"
                    required
                    min={5}
                    max={480}
                    value={form.duracao_min}
                    onChange={(e) => setForm({ ...form, duracao_min: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="svc-preco">Preço Base (R$) *</label>
                  <input
                    id="svc-preco"
                    type="number"
                    required
                    min={0}
                    step={0.01}
                    value={form.preco_base}
                    onChange={(e) => setForm({ ...form, preco_base: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="svc-max">Máx. Alunos</label>
                  <input
                    id="svc-max"
                    type="number"
                    min={1}
                    max={50}
                    value={form.max_alunos}
                    onChange={(e) => setForm({ ...form, max_alunos: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.permite_pacote}
                      onChange={(e) => setForm({ ...form, permite_pacote: e.target.checked })}
                      className="rounded border-input"
                    />
                    <span className="text-sm text-muted-foreground">Permite pacote</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Salvar" : "Criar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
