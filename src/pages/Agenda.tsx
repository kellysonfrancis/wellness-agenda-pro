import GlobalLayout from "@/components/layout/GlobalLayout";
import { Calendar, ChevronLeft, ChevronRight, Filter, X, Loader2, Plus, Pencil, Trash2, Save, CalendarPlus, RefreshCw, Package, MessageSquare, Check, XCircle, Clock, Send } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import type { Categoria, AppointmentStatus } from "@/types/clinic";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgendaData, type DBService, type DBAppointment } from "@/hooks/useAgendaData";
import { useEntitlements } from "@/hooks/useEntitlements";
import PilatesMonthlyWizard from "@/components/agenda/PilatesMonthlyWizard";
import PackageScheduler from "@/components/agenda/PackageScheduler";
import MakeupClassModal from "@/components/agenda/MakeupClassModal";

const statusBorderColors: Record<AppointmentStatus, string> = {
  reservado: "border-l-warning",
  confirmado: "border-l-success",
  em_atendimento: "border-l-info",
  concluido: "border-l-muted-foreground",
  faltou: "border-l-destructive",
  cancelado: "border-l-muted-foreground",
};

const categoryColors: Record<Categoria, string> = {
  pilates: "bg-primary/15 text-primary",
  fisioterapia: "bg-info/15 text-info",
  estetica: "bg-accent text-accent-foreground",
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

function WhatsAppIndicator({ status }: { status?: string }) {
  if (!status) return null;

  const config: Record<string, { icon: React.ElementType; color: string; title: string }> = {
    enviado: { icon: Clock, color: "text-warning", title: "Aguardando resposta" },
    confirmado_cliente: { icon: Check, color: "text-success", title: "Confirmado via WhatsApp" },
    cancelado_cliente: { icon: XCircle, color: "text-destructive", title: "Cancelado via WhatsApp" },
    erro: { icon: XCircle, color: "text-muted-foreground", title: "Erro no envio" },
  };

  const cfg = config[status];
  if (!cfg) return null;

  const Icon = cfg.icon;
  return (
    <span title={cfg.title} className={`shrink-0 ${cfg.color}`}>
      <MessageSquare className="h-3 w-3 inline-block" />
      <Icon className="h-2.5 w-2.5 inline-block -ml-0.5 -mt-1" />
    </span>
  );
}

type ViewMode = "week" | "day";

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDayHeader(d: Date, isToday: boolean) {
  const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  return { weekday: dayNames[d.getDay()], day: d.getDate(), isToday };
}

interface AppointmentForm {
  clientId: string;
  serviceId: string;
  profissionalId: string;
  date: string;
  startTime: string;
  status: string;
  observacoes: string;
}

const emptyForm: AppointmentForm = {
  clientId: "",
  serviceId: "",
  profissionalId: "",
  date: "",
  startTime: "",
  status: "reservado",
  observacoes: "",
};

export default function Agenda() {
  const {
    appointments, clients, services, professionals, loading,
    createAppointment, updateAppointment, deleteAppointment,
    getClientName, getServiceName, getProfessionalName, refetch,
  } = useAgendaData();
  const { plans, makeupClasses, createMakeupClass, refetch: refetchEntitlements } = useEntitlements();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [filterProfissional, setFilterProfissional] = useState("");
  const [filterServico, setFilterServico] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<Categoria | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<AppointmentForm>({ ...emptyForm });
  const [showPilatesWizard, setShowPilatesWizard] = useState(false);
  const [showPackageScheduler, setShowPackageScheduler] = useState(false);
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [selectedMakeup, setSelectedMakeup] = useState<typeof makeupClasses[0] | null>(null);
  const [selectedMakeupAppt, setSelectedMakeupAppt] = useState<DBAppointment | null>(null);
  const [sendingWa, setSendingWa] = useState<string | null>(null); // "confirmacao" | "lembrete" | null

  const today = new Date();
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate.toDateString()]);
  const viewDays = viewMode === "week" ? weekDays : [currentDate];

  // WhatsApp confirmation statuses per appointment
  const [waStatuses, setWaStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchWaStatuses = async () => {
      const apptIds = appointments.map(a => a.id);
      if (apptIds.length === 0) return;

      const { data } = await supabase
        .from("whatsapp_log")
        .select("appointment_id, status, tipo")
        .eq("tipo", "confirmacao")
        .in("appointment_id", apptIds);

      if (data) {
        const map: Record<string, string> = {};
        for (const log of data) {
          if (log.appointment_id) {
            map[log.appointment_id] = log.status;
          }
        }
        setWaStatuses(map);
      }
    };
    fetchWaStatuses();
  }, [appointments]);

  const categorias = useMemo(() => [...new Set(services.map((s) => s.categoria as Categoria))], [services]);

  const serviceMap = useMemo(() => {
    const map: Record<string, DBService> = {};
    services.forEach((s) => (map[s.id] = s));
    return map;
  }, [services]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (filterProfissional && a.profissional_id !== filterProfissional) return false;
      if (filterServico && a.service_id !== filterServico) return false;
      if (filterCategoria) {
        const svc = serviceMap[a.service_id];
        if (!svc || svc.categoria !== filterCategoria) return false;
      }
      return true;
    });
  }, [appointments, filterProfissional, filterServico, filterCategoria, serviceMap]);

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === "week" ? 7 * dir : dir));
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const getEventsForDayHour = (day: Date, hour: number) => {
    return filtered.filter((a) => {
      const start = new Date(a.inicio_em);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  };

  const activeFiltersCount =
    (filterProfissional ? 1 : 0) + (filterServico ? 1 : 0) + (filterCategoria ? 1 : 0);

  const monthLabel = viewMode === "week"
    ? (() => {
        const first = weekDays[0];
        const last = weekDays[6];
        if (first.getMonth() === last.getMonth()) {
          return first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        }
        return `${first.toLocaleDateString("pt-BR", { month: "short" })} – ${last.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`;
      })()
    : currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const openNewModal = useCallback((day?: Date, hour?: number) => {
    const d = day || new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : "";
    setEditingId(null);
    setConfirmDelete(false);
    setForm({ ...emptyForm, date: dateStr, startTime: timeStr });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((evt: DBAppointment) => {
    const start = new Date(evt.inicio_em);
    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    setEditingId(evt.id);
    setConfirmDelete(false);
    setForm({
      clientId: evt.client_id,
      serviceId: evt.service_id,
      profissionalId: evt.profissional_id,
      date: dateStr,
      startTime: timeStr,
      status: evt.status,
      observacoes: evt.observacoes || "",
    });
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.clientId || !form.serviceId || !form.profissionalId || !form.date || !form.startTime) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const svc = serviceMap[form.serviceId];
    if (!svc) return;

    const startDate = new Date(`${form.date}T${form.startTime}:00`);
    const endDate = new Date(startDate.getTime() + svc.duracao_min * 60000);

    if (editingId) {
      const oldAppt = appointments.find((a) => a.id === editingId);
      const result = await updateAppointment(editingId, {
        client_id: form.clientId,
        service_id: form.serviceId,
        profissional_id: form.profissionalId,
        inicio_em: startDate.toISOString(),
        fim_em: endDate.toISOString(),
        status: form.status,
        observacoes: form.observacoes || null,
      });
      if (result) {
        // Auto-create commission when status changes to "concluido"
        if (form.status === "concluido" && oldAppt && oldAppt.status !== "concluido") {
          const apptSvc = serviceMap[form.serviceId] || serviceMap[oldAppt.service_id];
          if (apptSvc) {
            try {
              const { data: rateData } = await supabase
                .from("commission_rates")
                .select("percentual")
                .eq("categoria", apptSvc.categoria)
                .maybeSingle();

              const perc = rateData ? Number(rateData.percentual) : 0;
              const valorVenda = Number(apptSvc.preco_base);
              const valorComissao = (valorVenda * perc) / 100;

              if (valorVenda > 0) {
                await supabase.from("sales").insert({
                  seller_id: form.profissionalId,
                  seller_type: "profissional",
                  client_id: form.clientId,
                  categoria: apptSvc.categoria,
                  valor_venda: valorVenda,
                  percentual_comissao: perc,
                  valor_comissao: valorComissao,
                });
                toast({ title: "Comissão registrada", description: `${perc}% = R$ ${valorComissao.toFixed(2)}` });
              }
            } catch (err) {
              console.error("Erro ao registrar comissão:", err);
            }
          }
        }

        // Auto-create makeup class when status changes to "faltou" for Pilates
        if (form.status === "faltou" && oldAppt && oldAppt.status !== "faltou") {
          const apptSvc = serviceMap[oldAppt.service_id];
          if (apptSvc && apptSvc.categoria === "pilates") {
            const apptData = result as any;
            if (apptData.entitlement_id) {
              const prazo = new Date();
              prazo.setDate(prazo.getDate() + 7);
              await createMakeupClass({
                entitlement_id: apptData.entitlement_id,
                client_id: form.clientId,
                original_appointment_id: editingId,
                prazo_limite: prazo.toISOString().split("T")[0],
              });
              toast({ title: "Reposição criada", description: "O aluno tem 7 dias para reagendar." });
            }
          }
        }
        setShowModal(false);
        setEditingId(null);
        toast({ title: "Agendamento atualizado!" });
      }
    } else {
      const result = await createAppointment({
        client_id: form.clientId,
        service_id: form.serviceId,
        profissional_id: form.profissionalId,
        inicio_em: startDate.toISOString(),
        fim_em: endDate.toISOString(),
        observacoes: form.observacoes || undefined,
      });
      if (result) {
        setShowModal(false);
        setForm({ ...emptyForm });
        toast({ title: "Agendamento criado!", description: `${getClientName(form.clientId)} — ${svc.nome}` });
      }
    }
  }, [form, serviceMap, editingId, createAppointment, updateAppointment, getClientName]);

  const handleDelete = useCallback(async () => {
    if (!editingId) return;
    const ok = await deleteAppointment(editingId);
    if (ok) {
      setShowModal(false);
      setEditingId(null);
      setConfirmDelete(false);
      toast({ title: "Agendamento excluído!" });
    }
  }, [editingId, deleteAppointment]);

  const handleSendWhatsApp = useCallback(async (tipo: "confirmacao" | "lembrete") => {
    if (!editingId || !form.clientId) return;
    setSendingWa(tipo);
    try {
      const client = clients.find(c => c.id === form.clientId);
      if (!client?.telefone) {
        toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
        return;
      }
      const svc = form.serviceId ? serviceMap[form.serviceId] : null;
      const categoria = svc?.categoria || "pilates";

      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tipo,
          destinatario: client.telefone.replace(/\D/g, ""),
          categoria,
          dados: {
            appointment_id: editingId,
            cliente_nome: client.nome,
            servico: svc?.nome || "",
            data: form.date ? new Date(form.date + "T" + (form.startTime || "00:00")).toLocaleDateString("pt-BR") : "",
            hora: form.startTime || "",
            profissional: getProfessionalName(form.profissionalId),
          },
        },
      });

      if (error) throw error;
      toast({ title: `${tipo === "confirmacao" ? "Confirmação" : "Lembrete"} enviado via WhatsApp!` });
      // Refresh WA statuses
      const { data: newLogs } = await supabase
        .from("whatsapp_log")
        .select("appointment_id, status, tipo")
        .eq("appointment_id", editingId);
      if (newLogs) {
        setWaStatuses(prev => {
          const updated = { ...prev };
          for (const log of newLogs) {
            if (log.appointment_id) updated[log.appointment_id] = log.status;
          }
          return updated;
        });
      }
    } catch (err: any) {
      console.error("Erro ao enviar WhatsApp:", err);
      toast({ title: "Erro ao enviar WhatsApp", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSendingWa(null);
    }
  }, [editingId, form, clients, serviceMap, getProfessionalName]);

  const filteredProfessionals = useMemo(() => {
    const svc = form.serviceId ? serviceMap[form.serviceId] : null;
    if (!svc) return professionals.filter((p) => p.ativo);
    return professionals.filter((p) => p.ativo && p.especialidades.includes(svc.categoria));
  }, [form.serviceId, serviceMap, professionals]);

  if (loading) {
    return (
      <GlobalLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold capitalize">{monthLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Hoje</button>
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button onClick={() => navigateWeek(-1)} className="p-1.5 hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => navigateWeek(1)} className="p-1.5 hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              <button onClick={() => setViewMode("day")} className={`px-3 py-1.5 transition-colors ${viewMode === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Dia</button>
              <button onClick={() => setViewMode("week")} className={`px-3 py-1.5 transition-colors ${viewMode === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Semana</button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${activeFiltersCount > 0 ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
            </button>
            <button
              onClick={() => setShowPilatesWizard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <CalendarPlus className="h-3.5 w-3.5" /> Pilates Mensal
            </button>
            <button
              onClick={() => setShowPackageScheduler(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-info/30 bg-info/10 text-info text-sm font-medium hover:bg-info/20 transition-colors"
            >
              <Package className="h-3.5 w-3.5" /> Pacote
            </button>
            <button
              onClick={() => openNewModal()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Novo
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-card rounded-xl border border-border shadow-sm">
            <select value={filterCategoria} onChange={(e) => { setFilterCategoria(e.target.value as Categoria | ""); setFilterServico(""); }} className="text-sm rounded-lg border border-input bg-background px-3 py-1.5">
              <option value="">Todas as categorias</option>
              {categorias.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <select value={filterProfissional} onChange={(e) => setFilterProfissional(e.target.value)} className="text-sm rounded-lg border border-input bg-background px-3 py-1.5">
              <option value="">Todos os profissionais</option>
              {professionals.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
            </select>
            <select value={filterServico} onChange={(e) => setFilterServico(e.target.value)} className="text-sm rounded-lg border border-input bg-background px-3 py-1.5">
              <option value="">Todos os serviços</option>
              {services.filter((s) => s.ativo && (!filterCategoria || s.categoria === filterCategoria)).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {activeFiltersCount > 0 && (
              <button onClick={() => { setFilterCategoria(""); setFilterProfissional(""); setFilterServico(""); }} className="text-sm text-destructive hover:underline px-2">Limpar filtros</button>
            )}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: `60px repeat(${viewDays.length}, 1fr)` }}>
              <div className="p-2" />
              {viewDays.map((day) => {
                const { weekday, day: dayNum, isToday: isTodayDay } = formatDayHeader(day, isSameDay(day, today));
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-l border-border cursor-pointer hover:bg-muted/40 transition-colors ${isTodayDay ? "bg-primary/5" : ""}`}
                    onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                  >
                    <p className={`text-xs font-medium ${isTodayDay ? "text-primary" : "text-muted-foreground"}`}>{weekday}</p>
                    <p className={`text-lg font-bold mt-0.5 ${isTodayDay ? "bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mx-auto" : "text-foreground"}`}>
                      {dayNum}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div key={hour} className="grid border-b border-border/50" style={{ gridTemplateColumns: `60px repeat(${viewDays.length}, 1fr)`, minHeight: "64px" }}>
                  <div className="p-1 pr-2 text-right">
                    <span className="text-xs text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
                  </div>
                  {viewDays.map((day) => {
                    const events = getEventsForDayHour(day, hour);
                    const isCurrentDay = isSameDay(day, today);
                    return (
                      <div
                        key={day.toISOString() + hour}
                        className={`border-l border-border/50 p-0.5 min-h-[64px] cursor-pointer hover:bg-muted/20 transition-colors ${isCurrentDay ? "bg-primary/[0.02]" : ""}`}
                        onClick={() => openNewModal(day, hour)}
                      >
                        {events.map((evt) => {
                          const start = new Date(evt.inicio_em);
                          const end = new Date(evt.fim_em);
                          const durationMin = (end.getTime() - start.getTime()) / 60000;
                          const heightPx = Math.max(24, (durationMin / 60) * 64);
                          const svc = serviceMap[evt.service_id];
                          const catColor = svc ? categoryColors[svc.categoria as Categoria] : "bg-muted text-muted-foreground";

                          return (
                            <div
                              key={evt.id}
                              className={`rounded-md px-1.5 py-1 mb-0.5 border-l-[3px] cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${catColor} ${statusBorderColors[evt.status as AppointmentStatus] || ""}`}
                              style={{ minHeight: `${Math.min(heightPx, 128)}px` }}
                              title={`${getClientName(evt.client_id)} — ${getServiceName(evt.service_id)}\n${getProfessionalName(evt.profissional_id)}\nStatus: ${evt.status}`}
                              onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                            >
                              <div className="flex items-center gap-1">
                                <p className="text-[11px] font-semibold truncate leading-tight flex-1">{getClientName(evt.client_id)}</p>
                                <WhatsAppIndicator status={waStatuses[evt.id]} />
                              </div>
                              <p className="text-[10px] truncate leading-tight opacity-80">{getServiceName(evt.service_id)}</p>
                              <p className="text-[10px] truncate leading-tight opacity-60">
                                {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary/15 border border-primary/30" /> Pilates</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-info/15 border border-info/30" /> Fisioterapia</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-accent border border-accent-foreground/20" /> Estética</span>
        <span className="mx-2 border-l border-border h-4" />
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-warning" /> Reservado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-success" /> Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-info" /> Em Atendimento</span>
        <span className="mx-2 border-l border-border h-4" />
        <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-warning" /> Aguardando WhatsApp</span>
        <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-success" /> Confirmado WhatsApp</span>
        <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-destructive" /> Cancelado WhatsApp</span>
      </div>

      {/* Appointment Modal (Create / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Agendamento" : "Novo Agendamento"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-client">Cliente *</label>
                <select id="appt-client" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                  <option value="">Selecione o cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-service">Serviço *</label>
                <select id="appt-service" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value, profissionalId: "" })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                  <option value="">Selecione o serviço</option>
                  {services.filter((s) => s.ativo).map((s) => (
                    <option key={s.id} value={s.id}>{s.nome} ({s.duracao_min}min — R$ {s.preco_base})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-prof">Profissional *</label>
                <select id="appt-prof" value={form.profissionalId} onChange={(e) => setForm({ ...form, profissionalId: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                  <option value="">Selecione o profissional</option>
                  {filteredProfessionals.map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
                </select>
                {form.serviceId && filteredProfessionals.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Nenhum profissional disponível para este serviço</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="appt-date">Data *</label>
                  <input id="appt-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="appt-time">Horário *</label>
                  <input id="appt-time" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="appt-status">Status</label>
                  <select id="appt-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="reservado">Reservado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="concluido">Concluído</option>
                    <option value="faltou">Faltou</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              )}

              {form.serviceId && serviceMap[form.serviceId] && (
                <p className="text-xs text-muted-foreground">
                  Duração: {serviceMap[form.serviceId].duracao_min} minutos
                  {form.startTime && ` — Término previsto: ${(() => {
                    const [h, m] = form.startTime.split(":").map(Number);
                    const end = new Date(2000, 0, 1, h, m + serviceMap[form.serviceId].duracao_min);
                    return end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  })()}`}
                </p>
              )}

              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-obs">Observações</label>
                <textarea id="appt-obs" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} maxLength={500} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none" placeholder="Observações opcionais..." />
              </div>

              {editingId && (
                <div className="border-t border-border pt-3 mt-1">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Enviar WhatsApp
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendWhatsApp("confirmacao")}
                      disabled={sendingWa !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-success/40 bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      {sendingWa === "confirmacao" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Confirmação
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp("lembrete")}
                      disabled={sendingWa !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-warning/40 bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors disabled:opacity-50"
                    >
                      {sendingWa === "lembrete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                      Lembrete
                    </button>
                  </div>
                  {waStatuses[editingId] && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <WhatsAppIndicator status={waStatuses[editingId]} />
                      <span className="text-xs text-muted-foreground">
                        {waStatuses[editingId] === "enviado" && "Aguardando resposta"}
                        {waStatuses[editingId] === "confirmado_cliente" && "Cliente confirmou"}
                        {waStatuses[editingId] === "cancelado_cliente" && "Cliente cancelou"}
                        {waStatuses[editingId] === "erro" && "Erro no envio"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                {editingId ? <><Save className="h-4 w-4" /> Salvar</> : <><Plus className="h-4 w-4" /> Agendar</>}
              </button>
              {editingId && !confirmDelete && (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {editingId && confirmDelete && (
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  <Trash2 className="h-4 w-4" /> Confirmar
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Makeups */}
      {makeupClasses.filter((m) => m.status === "pendente").length > 0 && (
        <div className="mt-6 bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <RefreshCw className="h-4 w-4 text-primary" />
            Reposições Pendentes ({makeupClasses.filter((m) => m.status === "pendente").length})
          </h3>
          <div className="space-y-2">
            {makeupClasses.filter((m) => m.status === "pendente").map((mk) => {
              const isExpired = new Date(mk.prazo_limite) < new Date();
              const originalAppt = appointments.find((a) => a.id === mk.original_appointment_id);
              return (
                <div key={mk.id} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${isExpired ? "bg-destructive/5 text-destructive" : "bg-muted/40"}`}>
                  <div>
                    <span className="font-medium">{getClientName(mk.client_id)}</span>
                    <span className="text-muted-foreground ml-2">Prazo: {new Date(mk.prazo_limite).toLocaleDateString("pt-BR")}</span>
                    {isExpired && <span className="ml-2 text-destructive text-xs font-medium">Expirado</span>}
                  </div>
                  {!isExpired && (
                    <button
                      onClick={() => {
                        setSelectedMakeup(mk);
                        setSelectedMakeupAppt(originalAppt || null);
                        setShowMakeupModal(true);
                      }}
                      className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
                    >
                      Reagendar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wizards */}
      <PilatesMonthlyWizard
        open={showPilatesWizard}
        onClose={() => setShowPilatesWizard(false)}
        clients={clients}
        services={services}
        professionals={professionals}
        plans={plans}
        existingAppointments={appointments}
        onCreated={() => { refetch(); refetchEntitlements(); }}
      />
      <PackageScheduler
        open={showPackageScheduler}
        onClose={() => setShowPackageScheduler(false)}
        clients={clients}
        services={services}
        professionals={professionals}
        plans={plans}
        onCreated={() => { refetch(); refetchEntitlements(); }}
      />
      <MakeupClassModal
        open={showMakeupModal}
        onClose={() => { setShowMakeupModal(false); setSelectedMakeup(null); }}
        makeupClass={selectedMakeup}
        clientName={selectedMakeup ? getClientName(selectedMakeup.client_id) : ""}
        services={services}
        professionals={professionals}
        existingAppointments={appointments}
        originalAppointment={selectedMakeupAppt}
        onScheduled={() => { refetch(); refetchEntitlements(); }}
      />
    </GlobalLayout>
  );
}
