import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ClipboardList, Search, Plus, Clock, FileText, UserCheck, LogOut as LogOutIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import TemplateForm, { type TemplateField } from "@/components/prontuario/TemplateForm";
import BodyMap, { type BodyMark } from "@/components/prontuario/BodyMap";
import PhysicalAssessments from "@/components/prontuario/PhysicalAssessments";
import EvolutionPhotos from "@/components/prontuario/EvolutionPhotos";

const tipoLabel: Record<string, string> = {
  anamnese: "Anamnese",
  evolucao: "Evolução",
  observacao: "Observação",
  alta: "Alta",
};

const tipoBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  anamnese: "outline",
  evolucao: "default",
  observacao: "secondary",
  alta: "destructive",
};

const tipoIcon: Record<string, React.ElementType> = {
  anamnese: FileText,
  evolucao: Clock,
  observacao: ClipboardList,
  alta: LogOutIcon,
};

export default function Prontuario() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTipo, setFormTipo] = useState<string>("evolucao");
  const [formConteudo, setFormConteudo] = useState("");
  const [tab, setTab] = useState<"timeline" | "fisica" | "fotos">("timeline");
  const [templateId, setTemplateId] = useState<string>("");
  const [templateValues, setTemplateValues] = useState<Record<string, any>>({});
  const [bodyMarks, setBodyMarks] = useState<BodyMark[]>([]);

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["record-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("record_templates")
        .select("id, categoria, nome, campos")
        .eq("ativo", true)
        .order("categoria");
      if (error) throw error;
      return (data || []) as { id: string; categoria: string; nome: string; campos: TemplateField[] }[];
    },
  });
  const selectedTemplate = templates.find((t) => t.id === templateId);

  // Clients
  const { data: clients = [] } = useQuery({
    queryKey: ["prontuario-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, nome, telefone")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Current professional
  const { data: currentProfessional } = useQuery({
    queryKey: ["prontuario-my-professional", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("professionals")
        .select("id, nome_exibicao")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Professionals list for display
  const { data: professionals = [] } = useQuery({
    queryKey: ["prontuario-professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, nome_exibicao")
        .eq("ativo", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Clinical records for selected client
  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["clinical-records", selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase
        .from("clinical_records")
        .select("*")
        .eq("client_id", selectedClient)
        .order("data_registro", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedClient,
  });

  // Insert mutation
  const insertRecord = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Selecione um paciente");
      const hasTemplateData = selectedTemplate && Object.keys(templateValues).length > 0;
      const hasBody = bodyMarks.length > 0;
      if (!formConteudo.trim() && !hasTemplateData && !hasBody) {
        throw new Error("Preencha o conteúdo, o template ou marque o mapa corporal");
      }

      const dados: any = {};
      if (selectedTemplate) {
        dados.template = { id: selectedTemplate.id, nome: selectedTemplate.nome, categoria: selectedTemplate.categoria };
        dados.respostas = templateValues;
      }
      if (bodyMarks.length > 0) dados.body_marks = bodyMarks;

      const profId = currentProfessional?.id;
      if (!profId) {
        // For admins without professional profile, get first professional
        const { data: firstProf } = await supabase
          .from("professionals")
          .select("id")
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();
        if (!firstProf) throw new Error("Nenhum profissional encontrado");

        const { error } = await (supabase as any).from("clinical_records").insert({
          client_id: selectedClient,
          profissional_id: firstProf.id,
          tipo: formTipo as any,
          conteudo: formConteudo.trim() || (selectedTemplate ? `[${selectedTemplate.nome}]` : "Mapa corporal"),
          template_id: templateId || null,
          dados: Object.keys(dados).length ? dados : null,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("clinical_records").insert({
          client_id: selectedClient,
          profissional_id: profId,
          tipo: formTipo as any,
          conteudo: formConteudo.trim() || (selectedTemplate ? `[${selectedTemplate.nome}]` : "Mapa corporal"),
          template_id: templateId || null,
          dados: Object.keys(dados).length ? dados : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-records", selectedClient] });
      setDialogOpen(false);
      setFormConteudo("");
      setFormTipo("evolucao");
      setTemplateId("");
      setTemplateValues({});
      setBodyMarks([]);
      toast.success("Registro adicionado com sucesso");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const profMap = useMemo(() => {
    const m = new Map<string, string>();
    professionals.forEach((p) => m.set(p.id, p.nome_exibicao));
    return m;
  }, [professionals]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (tipoFilter !== "all" && r.tipo !== tipoFilter) return false;
      return true;
    });
  }, [records, tipoFilter]);

  const filteredClients = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.nome.toLowerCase().includes(q) || c.telefone.includes(q));
  }, [clients, search]);

  const selectedClientName = clients.find((c) => c.id === selectedClient)?.nome || "";

  return (
    <GlobalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Prontuário Clínico
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de evolução e acompanhamento por paciente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Client list */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 sticky top-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <UserCheck className="h-4 w-4 text-primary" /> Pacientes
            </h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClient(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedClient === c.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <p className="font-medium truncate">{c.nome}</p>
                  <p className={`text-xs ${selectedClient === c.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {c.telefone}
                  </p>
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum paciente encontrado</p>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3">
          {!selectedClient ? (
            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">Selecione um paciente para ver o prontuário</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedClientName}</h2>
                  <p className="text-sm text-muted-foreground">{records.length} registro(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
                    <button onClick={() => setTab("timeline")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === "timeline" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Timeline</button>
                    <button onClick={() => setTab("fisica")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === "fisica" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Avaliação Física</button>
                    <button onClick={() => setTab("fotos")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === "fotos" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Fotos</button>
                  </div>
                  {tab === "timeline" && (<>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="anamnese">Anamnese</SelectItem>
                      <SelectItem value="evolucao">Evolução</SelectItem>
                      <SelectItem value="observacao">Observação</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Novo Registro
                  </Button>
                  </>)}
                </div>
              </div>

              {tab === "fotos" ? (
                <EvolutionPhotos clientId={selectedClient} />
              ) : tab === "fisica" ? (
                <PhysicalAssessments clientId={selectedClient} />
              ) : loadingRecords ? (
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Nenhum registro encontrado</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Criar primeiro registro
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-4">
                    {filteredRecords.map((r) => {
                      const Icon = tipoIcon[r.tipo] || FileText;
                      const dados = (r as any).dados;
                      return (
                        <div key={r.id} className="relative pl-12">
                          {/* Timeline dot */}
                          <div className="absolute left-3 top-4 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                          </div>

                          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <Badge variant={tipoBadge[r.tipo] || "secondary"}>
                                  {tipoLabel[r.tipo] || r.tipo}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {profMap.get(r.profissional_id) || "Profissional"}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(r.data_registro), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{r.conteudo}</p>
                            {dados?.respostas && dados?.template && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/30 rounded-lg p-3">
                                <div className="col-span-full font-medium text-foreground/80">{dados.template.nome}</div>
                                {Object.entries(dados.respostas).map(([k, v]) => (
                                  v ? (
                                    <div key={k}><span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}: </span><span>{String(v)}</span></div>
                                  ) : null
                                ))}
                              </div>
                            )}
                            {dados?.body_marks?.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-1">Mapa corporal ({dados.body_marks.length} marcação{dados.body_marks.length > 1 ? "es" : ""})</p>
                                <BodyMap marks={dados.body_marks} onChange={() => {}} readOnly />
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Registrado em {format(parseISO(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Record Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Registro — {selectedClientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anamnese">Anamnese</SelectItem>
                    <SelectItem value="evolucao">Evolução</SelectItem>
                    <SelectItem value="observacao">Observação</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template (opcional)</Label>
                <Select value={templateId || "none"} onValueChange={(v) => { setTemplateId(v === "none" ? "" : v); setTemplateValues({}); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.categoria} — {t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedTemplate && (
              <div className="border border-border rounded-lg p-3 bg-muted/20">
                <p className="text-xs font-medium mb-2">{selectedTemplate.nome}</p>
                <TemplateForm campos={selectedTemplate.campos} values={templateValues} onChange={setTemplateValues} />
              </div>
            )}

            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={formConteudo}
                onChange={(e) => setFormConteudo(e.target.value)}
                placeholder="Descreva a evolução, observações, queixas..."
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="border border-border rounded-lg p-3">
              <p className="text-xs font-medium mb-2">Mapa corporal</p>
              <BodyMap marks={bodyMarks} onChange={setBodyMarks} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => insertRecord.mutate()} disabled={insertRecord.isPending}>
              {insertRecord.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlobalLayout>
  );
}