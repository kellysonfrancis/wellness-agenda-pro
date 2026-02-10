import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ListOrdered, Plus, Search, Bell, CheckCircle2, Clock, XCircle, Filter } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  aguardando: "Aguardando",
  notificado: "Notificado",
  agendado: "Agendado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  aguardando: "default",
  notificado: "secondary",
  agendado: "outline",
  expirado: "destructive",
  cancelado: "destructive",
};

const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function ListaEspera() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("aguardando");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formProfId, setFormProfId] = useState("");
  const [formDia, setFormDia] = useState("");
  const [formHorario, setFormHorario] = useState("");
  const [formObs, setFormObs] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["waitlist-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, nome, telefone").order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["waitlist-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, nome, categoria, max_alunos").eq("ativo", true).order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["waitlist-professionals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, nome_exibicao").eq("ativo", true).order("nome_exibicao");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: waitlist = [], isLoading } = useQuery({
    queryKey: ["waitlist-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*, clients(nome, telefone), services(nome, categoria), professionals(nome_exibicao)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const insertEntry = useMutation({
    mutationFn: async () => {
      if (!formClientId || !formServiceId) throw new Error("Cliente e serviço são obrigatórios");
      const { error } = await supabase.from("waitlist").insert({
        client_id: formClientId,
        service_id: formServiceId,
        profissional_id: formProfId || null,
        dia_semana: formDia || null,
        horario_preferido: formHorario || null,
        observacoes: formObs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Cliente adicionado à lista de espera");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "notificado") updates.notificado_em = new Date().toISOString();
      const { error } = await supabase.from("waitlist").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      toast.success("Status atualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormClientId("");
    setFormServiceId("");
    setFormProfId("");
    setFormDia("");
    setFormHorario("");
    setFormObs("");
  };

  const filtered = useMemo(() => {
    return waitlist.filter((w: any) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const clientName = (w.clients as any)?.nome || "";
        const clientPhone = (w.clients as any)?.telefone || "";
        if (!clientName.toLowerCase().includes(q) && !clientPhone.includes(q)) return false;
      }
      return true;
    });
  }, [waitlist, search, statusFilter]);

  const summary = useMemo(() => {
    const s = { aguardando: 0, notificado: 0, agendado: 0, total: 0 };
    waitlist.forEach((w: any) => {
      s.total++;
      if (w.status in s) (s as any)[w.status]++;
    });
    return s;
  }, [waitlist]);

  return (
    <GlobalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            Lista de Espera
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de fila para horários lotados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Adicionar à Fila
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total na Fila", value: summary.total, icon: ListOrdered, accent: "text-foreground" },
          { label: "Aguardando", value: summary.aguardando, icon: Clock, accent: "text-primary" },
          { label: "Notificados", value: summary.notificado, icon: Bell, accent: "text-yellow-600 dark:text-yellow-400" },
          { label: "Agendados", value: summary.agendado, icon: CheckCircle2, accent: "text-green-600 dark:text-green-400" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.accent}`} />
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
            <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {[
              { label: "Aguardando", key: "aguardando" },
              { label: "Notificados", key: "notificado" },
              { label: "Agendados", key: "agendado" },
              { label: "Todos", key: "all" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setStatusFilter(b.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === b.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma entrada na lista de espera
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Posição</th>
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">Serviço</th>
                  <th className="text-left p-3 font-medium">Profissional</th>
                  <th className="text-center p-3 font-medium">Preferência</th>
                  <th className="text-center p-3 font-medium">Tempo na Fila</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w: any, idx: number) => {
                  const client = w.clients as any;
                  const service = w.services as any;
                  const prof = w.professionals as any;
                  return (
                    <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{client?.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground">{client?.telefone}</p>
                      </td>
                      <td className="p-3">
                        <p>{service?.nome || "—"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{service?.categoria}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">{prof?.nome_exibicao || "Qualquer"}</td>
                      <td className="p-3 text-center text-xs">
                        {w.dia_semana && <span className="block">{w.dia_semana}</span>}
                        {w.horario_preferido && <span className="block text-muted-foreground">{w.horario_preferido}</span>}
                        {!w.dia_semana && !w.horario_preferido && <span className="text-muted-foreground">Flexível</span>}
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(w.created_at), { locale: ptBR, addSuffix: true })}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={statusBadge[w.status] || "secondary"}>
                          {statusLabel[w.status] || w.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {w.status === "aguardando" && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => updateStatus.mutate({ id: w.id, status: "notificado" })}
                              title="Marcar como notificado"
                            >
                              <Bell className="h-4 w-4 text-yellow-600" />
                            </Button>
                          )}
                          {(w.status === "aguardando" || w.status === "notificado") && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => updateStatus.mutate({ id: w.id, status: "agendado" })}
                              title="Marcar como agendado"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {w.status !== "cancelado" && w.status !== "agendado" && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => updateStatus.mutate({ id: w.id, status: "cancelado" })}
                              title="Cancelar"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
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

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar à Lista de Espera</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cliente *</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serviço *</Label>
              <Select value={formServiceId} onValueChange={setFormServiceId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome} ({s.categoria})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profissional preferido</Label>
              <Select value={formProfId} onValueChange={setFormProfId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_exibicao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dia preferido</Label>
                <Select value={formDia} onValueChange={setFormDia}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Flexível" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexivel">Flexível</SelectItem>
                    {diasSemana.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário preferido</Label>
                <Input value={formHorario} onChange={(e) => setFormHorario(e.target.value)} placeholder="Ex: 14:00" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={formObs} onChange={(e) => setFormObs(e.target.value)} placeholder="Informações adicionais..." rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={() => insertEntry.mutate()} disabled={!formClientId || !formServiceId || insertEntry.isPending}>
              {insertEntry.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlobalLayout>
  );
}