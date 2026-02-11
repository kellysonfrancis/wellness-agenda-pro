import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Stethoscope, Plus, Loader2, X, Pencil, Save, Trash2, Eye, Clock, ListChecks } from "lucide-react";
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

interface ProfSchedule {
  id: string;
  professional_id: string;
  dia_semana: number;
  hora_inicio: number;
  hora_fim: number;
  pausas: { inicio: number; fim: number }[];
  ativo: boolean;
}

interface ProfService {
  id: string;
  professional_id: string;
  service_id: string;
}

interface Service {
  id: string;
  nome: string;
  categoria: string;
  ativo: boolean;
}

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const emptyForm = { nome_exibicao: "", user_id: "", especialidades: [] as string[], ve_todas_comissoes: false };

export default function Profissionais() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [profSchedules, setProfSchedules] = useState<ProfSchedule[]>([]);
  const [profServices, setProfServices] = useState<ProfService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Schedule/Services detail panel
  const [detailProfId, setDetailProfId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"horarios" | "servicos">("horarios");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [profRes, catRes, profileRes, svcRes, schedRes, profSvcRes] = await Promise.all([
      supabase.from("professionals").select("*").order("nome_exibicao"),
      supabase.from("categories").select("id, nome, slug, ativo").eq("ativo", true).order("nome"),
      supabase.from("profiles").select("user_id, nome, email"),
      supabase.from("services").select("id, nome, categoria, ativo").eq("ativo", true).order("nome"),
      supabase.from("professional_schedules").select("*"),
      supabase.from("professional_services").select("*"),
    ]);
    if (profRes.data) setProfessionals(profRes.data as Professional[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    if (profileRes.data) setProfiles(profileRes.data as Profile[]);
    if (svcRes.data) setAllServices(svcRes.data as Service[]);
    if (schedRes.data) setProfSchedules(schedRes.data.map((r: any) => ({ ...r, pausas: Array.isArray(r.pausas) ? r.pausas : [] })) as ProfSchedule[]);
    if (profSvcRes.data) setProfServices(profSvcRes.data as ProfService[]);
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

  // === Schedule management ===
  const detailProf = professionals.find(p => p.id === detailProfId);
  const detailSchedules = profSchedules.filter(s => s.professional_id === detailProfId);
  const detailProfSvcs = profServices.filter(s => s.professional_id === detailProfId);

  const handleToggleDay = async (dayValue: number) => {
    if (!detailProfId) return;
    const existing = detailSchedules.find(s => s.dia_semana === dayValue);
    if (existing) {
      await supabase.from("professional_schedules").delete().eq("id", existing.id);
    } else {
      await supabase.from("professional_schedules").insert({
        professional_id: detailProfId,
        dia_semana: dayValue,
        hora_inicio: 8,
        hora_fim: 18,
        pausas: [],
        ativo: true,
      } as any);
    }
    fetchAll();
  };

  const handleUpdateSchedule = async (schedId: string, field: string, value: number) => {
    await supabase.from("professional_schedules").update({ [field]: value } as any).eq("id", schedId);
    fetchAll();
  };

  const handleToggleService = async (serviceId: string) => {
    if (!detailProfId) return;
    const existing = detailProfSvcs.find(s => s.service_id === serviceId);
    if (existing) {
      await supabase.from("professional_services").delete().eq("id", existing.id);
    } else {
      await supabase.from("professional_services").insert({
        professional_id: detailProfId,
        service_id: serviceId,
      } as any);
    }
    fetchAll();
  };

  // Services filtered by professional's specialties
  const detailAvailableServices = detailProf
    ? allServices.filter(s => detailProf.especialidades.includes(s.categoria))
    : [];

  return (
    <GlobalLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" /> Profissionais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie profissionais, horários e serviços vinculados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Novo Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: list */}
        <div className="lg:col-span-2">
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidades</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {professionals.map((p) => {
                      const isSelected = detailProfId === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : "hover:bg-muted/40"}`}
                          onClick={() => setDetailProfId(p.id)}
                        >
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
                                  <p className="text-xs">Visibilidade total de vendas/comissões</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
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
                              onClick={(e) => { e.stopPropagation(); toggleAtivo(p); }}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${p.ativo ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            >
                              {p.ativo ? "Ativo" : "Inativo"}
                            </button>
                          </td>
                          <td className="text-center px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {confirmDeleteId === p.id ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                  className="inline-flex items-center justify-center h-8 px-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
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
        </div>

        {/* Right: detail panel */}
        <div>
          {detailProf ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-sm mb-3">{detailProf.nome_exibicao}</h3>
              
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setDetailTab("horarios")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${detailTab === "horarios" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  <Clock className="h-3 w-3" /> Horários
                </button>
                <button
                  onClick={() => setDetailTab("servicos")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${detailTab === "servicos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  <ListChecks className="h-3 w-3" /> Serviços
                </button>
              </div>

              {detailTab === "horarios" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Clique nos dias para ativar/desativar. Configure horários de cada dia.</p>
                  {WEEKDAYS.map((wd) => {
                    const sched = detailSchedules.find(s => s.dia_semana === wd.value);
                    return (
                      <div key={wd.value} className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleDay(wd.value)}
                          className={`w-20 text-xs py-1.5 rounded-lg font-medium transition-colors ${sched ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {wd.label.slice(0, 3)}
                        </button>
                        {sched && (
                          <div className="flex items-center gap-1 text-xs">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={sched.hora_inicio}
                              onChange={(e) => handleUpdateSchedule(sched.id, "hora_inicio", Number(e.target.value))}
                              className="w-12 rounded border border-input bg-background px-1 py-1 text-center text-xs"
                            />
                            <span>–</span>
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={sched.hora_fim}
                              onChange={(e) => handleUpdateSchedule(sched.id, "hora_fim", Number(e.target.value))}
                              className="w-12 rounded border border-input bg-background px-1 py-1 text-center text-xs"
                            />
                            <span className="text-muted-foreground">h</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {detailTab === "servicos" && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">Marque os serviços que este profissional atende.</p>
                  {detailAvailableServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum serviço ativo nas especialidades deste profissional.</p>
                  ) : (
                    detailAvailableServices.map((svc) => {
                      const isLinked = detailProfSvcs.some(ps => ps.service_id === svc.id);
                      return (
                        <label key={svc.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isLinked}
                            onChange={() => handleToggleService(svc.id)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-ring/30"
                          />
                          <span className="text-sm">{svc.nome}</span>
                          <span className="text-xs text-muted-foreground ml-auto capitalize">{svc.categoria}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 text-center text-muted-foreground text-sm">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Selecione um profissional para gerenciar seus horários e serviços</p>
            </div>
          )}
        </div>
      </div>

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
