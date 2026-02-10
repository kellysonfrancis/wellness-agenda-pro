import GlobalLayout from "@/components/layout/GlobalLayout";
import {
  mockAppointments, mockServices, mockProfessionals, mockClients,
  getClientName, getServiceName, getProfessionalName,
} from "@/data/mockData";
import { Calendar, ChevronLeft, ChevronRight, Filter, X, Loader2, Plus } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import type { Appointment, AppointmentStatus, Categoria } from "@/types/clinic";
import { toast } from "@/hooks/use-toast";

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

interface NewAppointmentForm {
  clientId: string;
  serviceId: string;
  profissionalId: string;
  date: string;
  startTime: string;
  observacoes: string;
}

const emptyForm: NewAppointmentForm = {
  clientId: "",
  serviceId: "",
  profissionalId: "",
  date: "",
  startTime: "",
  observacoes: "",
};

export default function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([...mockAppointments]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [filterProfissional, setFilterProfissional] = useState("");
  const [filterServico, setFilterServico] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<Categoria | "">("");
  const [showFilters, setShowFilters] = useState(false);

  // New appointment modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState<NewAppointmentForm>({ ...emptyForm });

  const today = new Date();
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate.toDateString()]);
  const viewDays = viewMode === "week" ? weekDays : [currentDate];

  const categorias = useMemo(() => [...new Set(mockServices.map((s) => s.categoria))], []);

  const serviceMap = useMemo(() => {
    const map: Record<string, typeof mockServices[0]> = {};
    mockServices.forEach((s) => (map[s.id] = s));
    return map;
  }, []);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (filterProfissional && a.profissionalId !== filterProfissional) return false;
      if (filterServico && a.serviceId !== filterServico) return false;
      if (filterCategoria) {
        const svc = serviceMap[a.serviceId];
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
      const start = new Date(a.inicioEm);
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

  // Open modal with pre-filled date/time
  const openNewModal = useCallback((day?: Date, hour?: number) => {
    const d = day || new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const timeStr = hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : "";
    setForm({ ...emptyForm, date: dateStr, startTime: timeStr });
    setShowNewModal(true);
  }, []);

  const handleCreate = useCallback(() => {
    if (!form.clientId || !form.serviceId || !form.profissionalId || !form.date || !form.startTime) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const svc = serviceMap[form.serviceId];
    if (!svc) return;

    const startDate = new Date(`${form.date}T${form.startTime}:00`);
    const endDate = new Date(startDate.getTime() + svc.duracaoMin * 60000);

    const newAppt: Appointment = {
      id: `a-${Date.now()}`,
      clientId: form.clientId,
      serviceId: form.serviceId,
      profissionalId: form.profissionalId,
      inicioEm: startDate.toISOString(),
      fimEm: endDate.toISOString(),
      status: "reservado",
      origem: "recepcao",
      observacoes: form.observacoes || null,
    };

    setAppointments((prev) => [...prev, newAppt]);
    setShowNewModal(false);
    setForm({ ...emptyForm });
    toast({ title: "Agendamento criado!", description: `${getClientName(form.clientId)} — ${svc.nome}` });
  }, [form, serviceMap]);

  // Filter services based on selected category
  const filteredServices = useMemo(() => {
    const selectedCat = form.serviceId ? serviceMap[form.serviceId]?.categoria : null;
    return mockServices.filter((s) => s.ativo);
  }, [form.serviceId, serviceMap]);

  // Filter professionals based on selected service's category
  const filteredProfessionals = useMemo(() => {
    const svc = form.serviceId ? serviceMap[form.serviceId] : null;
    if (!svc) return mockProfessionals.filter((p) => p.ativo);
    return mockProfessionals.filter((p) => p.ativo && p.especialidades.includes(svc.categoria));
  }, [form.serviceId, serviceMap]);

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
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
              Hoje
            </button>
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
              {mockProfessionals.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nomeExibicao}</option>)}
            </select>
            <select value={filterServico} onChange={(e) => setFilterServico(e.target.value)} className="text-sm rounded-lg border border-input bg-background px-3 py-1.5">
              <option value="">Todos os serviços</option>
              {mockServices.filter((s) => s.ativo && (!filterCategoria || s.categoria === filterCategoria)).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
                          const start = new Date(evt.inicioEm);
                          const end = new Date(evt.fimEm);
                          const durationMin = (end.getTime() - start.getTime()) / 60000;
                          const heightPx = Math.max(24, (durationMin / 60) * 64);
                          const svc = serviceMap[evt.serviceId];
                          const catColor = svc ? categoryColors[svc.categoria] : "bg-muted text-muted-foreground";

                          return (
                            <div
                              key={evt.id}
                              className={`rounded-md px-1.5 py-1 mb-0.5 border-l-[3px] cursor-default hover:opacity-80 transition-opacity overflow-hidden ${catColor} ${statusBorderColors[evt.status]}`}
                              style={{ minHeight: `${Math.min(heightPx, 128)}px` }}
                              title={`${getClientName(evt.clientId)} — ${getServiceName(evt.serviceId)}\n${getProfessionalName(evt.profissionalId)}\nStatus: ${evt.status}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[11px] font-semibold truncate leading-tight">{getClientName(evt.clientId)}</p>
                              <p className="text-[10px] truncate leading-tight opacity-80">{getServiceName(evt.serviceId)}</p>
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
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setShowNewModal(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Novo Agendamento</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Cliente */}
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-client">Cliente *</label>
                <select
                  id="appt-client"
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Selecione o cliente</option>
                  {mockClients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* Serviço */}
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-service">Serviço *</label>
                <select
                  id="appt-service"
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value, profissionalId: "" })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Selecione o serviço</option>
                  {mockServices.filter((s) => s.ativo).map((s) => (
                    <option key={s.id} value={s.id}>{s.nome} ({s.duracaoMin}min — R$ {s.precoBase})</option>
                  ))}
                </select>
              </div>

              {/* Profissional */}
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-prof">Profissional *</label>
                <select
                  id="appt-prof"
                  value={form.profissionalId}
                  onChange={(e) => setForm({ ...form, profissionalId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">Selecione o profissional</option>
                  {filteredProfessionals.map((p) => <option key={p.id} value={p.id}>{p.nomeExibicao}</option>)}
                </select>
                {form.serviceId && filteredProfessionals.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Nenhum profissional disponível para este serviço</p>
                )}
              </div>

              {/* Data e hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="appt-date">Data *</label>
                  <input
                    id="appt-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" htmlFor="appt-time">Horário *</label>
                  <input
                    id="appt-time"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              {/* Duração info */}
              {form.serviceId && serviceMap[form.serviceId] && (
                <p className="text-xs text-muted-foreground">
                  Duração: {serviceMap[form.serviceId].duracaoMin} minutos
                  {form.startTime && ` — Término previsto: ${(() => {
                    const [h, m] = form.startTime.split(":").map(Number);
                    const end = new Date(2000, 0, 1, h, m + serviceMap[form.serviceId].duracaoMin);
                    return end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  })()}`}
                </p>
              )}

              {/* Observações */}
              <div>
                <label className="text-sm text-muted-foreground" htmlFor="appt-obs">Observações</label>
                <textarea
                  id="appt-obs"
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                  maxLength={500}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                  placeholder="Observações opcionais..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleCreate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Agendar
              </button>
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
