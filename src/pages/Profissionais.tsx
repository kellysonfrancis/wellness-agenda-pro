import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Stethoscope, Plus, Loader2, X, Pencil, Save, Trash2, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Professional {
  id: string;
  user_id: string | null;
  nome_exibicao: string;
  especialidades: string[];
  ativo: boolean;
  ve_todas_comissoes: boolean;
}

interface Category {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
}

interface Profile {
  user_id: string;
  nome: string;
  email: string | null;
}

const emptyForm = { nome_exibicao: "", user_id: "", especialidades: [] as string[], ve_todas_comissoes: false };

export default function Profissionais() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [profRes, catRes, profileRes] = await Promise.all([
      supabase.from("professionals").select("*").order("nome_exibicao"),
      supabase.from("categories").select("id, nome, slug, ativo").eq("ativo", true).order("nome"),
      supabase.from("profiles").select("user_id, nome, email"),
    ]);
    if (profRes.data) setProfessionals(profRes.data as Professional[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    if (profileRes.data) setProfiles(profileRes.data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (prof: Professional) => {
    setEditingId(prof.id);
    setForm({
      nome_exibicao: prof.nome_exibicao,
      user_id: prof.user_id || "",
      especialidades: [...prof.especialidades],
      ve_todas_comissoes: prof.ve_todas_comissoes ?? false,
    });
    setShowForm(true);
  };

  const toggleEspecialidade = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      especialidades: prev.especialidades.includes(slug)
        ? prev.especialidades.filter((e) => e !== slug)
        : [...prev.especialidades, slug],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_exibicao.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (form.especialidades.length === 0) {
      toast({ title: "Selecione ao menos uma especialidade", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      nome_exibicao: form.nome_exibicao.trim(),
      user_id: form.user_id || null,
      especialidades: form.especialidades,
      ve_todas_comissoes: form.ve_todas_comissoes,
    };

    if (editingId) {
      const { error } = await supabase.from("professionals").update(payload as any).eq("id", editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Profissional atualizado!" });
        setShowForm(false);
        fetchAll();
      }
    } else {
      const { error } = await supabase.from("professionals").insert(payload as any);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Profissional cadastrado!" });
        setShowForm(false);
        setForm({ ...emptyForm });
        fetchAll();
      }
    }
    setSaving(false);
  };

  const toggleAtivo = async (prof: Professional) => {
    const { error } = await supabase.from("professionals").update({ ativo: !prof.ativo } as any).eq("id", prof.id);
    if (!error) fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { data: appts } = await supabase.from("appointments").select("id").eq("profissional_id", id).limit(1);
    if (appts?.length) {
      toast({ title: "Não é possível excluir", description: "Este profissional possui agendamentos vinculados. Desative-o em vez de excluir.", variant: "destructive" });
      setConfirmDeleteId(null);
      return;
    }
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profissional excluído!" });
      setConfirmDeleteId(null);
      fetchAll();
    }
  };

  const getCatLabel = (slug: string) => categories.find((c) => c.slug === slug)?.nome || slug;

  return (
    <GlobalLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" /> Profissionais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os profissionais e suas especialidades</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Novo Profissional
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : professionals.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum profissional cadastrado.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário Vinculado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidades</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {professionals.map((p) => {
                  const linkedProfile = p.user_id ? profiles.find((pr) => pr.user_id === p.user_id) : null;
                  return (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-medium flex items-center gap-1.5">
                        {p.nome_exibicao}
                        {p.ve_todas_comissoes && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary cursor-help">
                                <Eye className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-medium">Visibilidade total</p>
                              <p className="text-xs text-muted-foreground">Este profissional pode ver todas as vendas e comissões de todos os colaboradores.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {linkedProfile ? `${linkedProfile.nome} (${linkedProfile.email})` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.especialidades.map((esp) => (
                            <span key={esp} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {getCatLabel(esp)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-center px-4 py-3">
                        <button
                          onClick={() => toggleAtivo(p)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${p.ativo ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {p.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="text-center px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {confirmDeleteId === p.id ? (
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="inline-flex items-center justify-center h-8 px-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Profissional" : "Novo Profissional"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="prof-nome">Nome de Exibição *</label>
                <input
                  id="prof-nome"
                  required
                  maxLength={100}
                  value={form.nome_exibicao}
                  onChange={(e) => setForm({ ...form, nome_exibicao: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Dr. João Silva"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground" htmlFor="prof-user">Vincular a Usuário</label>
                <select
                  id="prof-user"
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Sem vínculo</option>
                  {profiles.map((pr) => (
                    <option key={pr.user_id} value={pr.user_id}>{pr.nome} ({pr.email})</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Opcional: vincule a um usuário existente do sistema</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Especialidades *</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {categories.map((cat) => {
                    const selected = form.especialidades.includes(cat.slug);
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => toggleEspecialidade(cat.slug)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:bg-muted"
                        }`}
                      >
                        {cat.nome}
                      </button>
                    );
                  })}
                </div>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Cadastre categorias primeiro</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ve_todas_comissoes}
                    onChange={(e) => setForm({ ...form, ve_todas_comissoes: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring/30"
                  />
                  <span className="text-sm font-medium">Vê todas as vendas e comissões</span>
                </label>
                <p className="text-xs text-muted-foreground mt-1">Se desativado, vê apenas as próprias vendas</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? "Salvar" : "Cadastrar"}
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
