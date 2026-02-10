import { useState, useMemo, useCallback } from "react";
import { X, CalendarPlus, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DBPlan, DBEntitlement } from "@/hooks/useEntitlements";
import { fetchCategorySchedules, validateAgainstSchedule } from "@/lib/scheduleValidation";

interface Props {
  open: boolean;
  onClose: () => void;
  clients: { id: string; nome: string }[];
  services: { id: string; nome: string; categoria: string; duracao_min: number; max_alunos: number | null }[];
  professionals: { id: string; nome_exibicao: string; especialidades: string[] }[];
  plans: DBPlan[];
  existingAppointments: { inicio_em: string; fim_em: string; service_id: string }[];
  onCreated: (entitlement: DBEntitlement, count: number) => void;
}

const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const FREQ_MAP: Record<string, number> = { "2x_semana": 2, "3x_semana": 3, avulsa: 1 };

interface ScheduleSlot {
  weekday: number;
  time: string;
}

export default function PilatesMonthlyWizard({ open, onClose, clients, services, professionals, plans, existingAppointments, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [generatedDates, setGeneratedDates] = useState<{ date: string; time: string; conflict: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showGenerated, setShowGenerated] = useState(true);

  const pilatesPlans = useMemo(() => plans.filter((p) => p.categoria === "pilates" && p.tipo === "mensal_recorrente"), [plans]);
  const selectedPlan = pilatesPlans.find((p) => p.id === planId);
  const frequency = selectedPlan?.frequencia_pilates ? FREQ_MAP[selectedPlan.frequencia_pilates] || 2 : 2;

  const pilatesServices = useMemo(() => services.filter((s) => s.categoria === "pilates"), [services]);
  const filteredProfs = useMemo(() => professionals.filter((p) => p.especialidades.includes("pilates")), [professionals]);

  const addSlot = () => {
    if (slots.length >= frequency) return;
    setSlots([...slots, { weekday: 1, time: "08:00" }]);
  };

  const removeSlot = (i: number) => setSlots(slots.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, field: keyof ScheduleSlot, value: any) =>
    setSlots(slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const generateDates = useCallback(() => {
    if (slots.length === 0) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const svc = pilatesServices.find((s) => s.id === serviceId);
    const duration = svc?.duracao_min || 50;
    const maxAlunos = svc?.max_alunos || null;

    const dates: typeof generatedDates = [];

    for (const slot of slots) {
      let d = new Date(year, month, 1);
      while (d.getMonth() === month) {
        if (d.getDay() === slot.weekday % 7 && d >= now) {
          const [h, m] = slot.time.split(":").map(Number);
          const startDate = new Date(year, month, d.getDate(), h, m);
          const endDate = new Date(startDate.getTime() + duration * 60000);

          let conflict = false;
          if (maxAlunos && serviceId) {
            const sameSlot = existingAppointments.filter((a) => {
              const aStart = new Date(a.inicio_em);
              return a.service_id === serviceId && aStart.getTime() === startDate.getTime();
            });
            if (sameSlot.length >= maxAlunos) conflict = true;
          }

          dates.push({
            date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            time: slot.time,
            conflict,
          });
        }
        d.setDate(d.getDate() + 1);
      }
    }

    dates.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    setGeneratedDates(dates);
    setStep(3);
  }, [slots, serviceId, pilatesServices, existingAppointments]);

  const handleConfirm = useCallback(async () => {
    const validDates = generatedDates.filter((d) => !d.conflict);
    if (validDates.length === 0) {
      toast({ title: "Nenhuma data válida para agendar", variant: "destructive" });
      return;
    }
    setSaving(true);

    const svc = pilatesServices.find((s) => s.id === serviceId);
    const duration = svc?.duracao_min || 50;

    // Create entitlement
    const totalAulas = selectedPlan?.aulas_por_mes || validDates.length;
    const expiraEm = new Date();
    expiraEm.setMonth(expiraEm.getMonth() + (selectedPlan?.vigencia_meses || 1));

    const { data: entitlement, error: entError } = await supabase
      .from("client_entitlements")
      .insert({
        client_id: clientId,
        product_plan_id: planId,
        saldo_creditos: totalAulas,
        inicio_em: new Date().toISOString().split("T")[0],
        expira_em: expiraEm.toISOString().split("T")[0],
      } as any)
      .select()
      .single();

    if (entError) {
      toast({ title: "Erro ao criar vínculo", description: entError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Validate schedule constraints for pilates
    const schedules = await fetchCategorySchedules();
    const pilatesSchedule = schedules.find((cs) => cs.categoria === "pilates");
    for (const d of validDates) {
      const [h, m] = d.time.split(":").map(Number);
      const [y, mo, day] = d.date.split("-").map(Number);
      const dt = new Date(y, mo - 1, day, h, m);
      const err = validateAgainstSchedule(pilatesSchedule, dt);
      if (err) {
        toast({ title: "Horário inválido", description: `${d.date} ${d.time}: ${err}`, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    // Create appointments
    const appointments = validDates.map((d) => {
      const [h, m] = d.time.split(":").map(Number);
      const [y, mo, day] = d.date.split("-").map(Number);
      const start = new Date(y, mo - 1, day, h, m);
      const end = new Date(start.getTime() + duration * 60000);
      return {
        client_id: clientId,
        service_id: serviceId,
        profissional_id: profissionalId,
        inicio_em: start.toISOString(),
        fim_em: end.toISOString(),
        status: "reservado" as any,
        origem: "recepcao" as any,
        entitlement_id: (entitlement as any).id,
      };
    });

    const { error: apptError } = await supabase.from("appointments").insert(appointments);

    if (apptError) {
      toast({ title: "Erro ao criar agendamentos", description: apptError.message, variant: "destructive" });
    } else {
      toast({ title: `${validDates.length} aulas agendadas!`, description: `Plano mensal de Pilates criado para o mês.` });
      onCreated(entitlement as DBEntitlement, validDates.length);
    }

    setSaving(false);
    onClose();
  }, [generatedDates, clientId, planId, serviceId, profissionalId, pilatesServices, selectedPlan, onCreated, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Pilates Mensal — Wizard
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Step 1: Select client, plan, service, professional */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Cliente *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Plano Pilates *</label>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {pilatesPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — R$ {Number(p.preco).toFixed(2)} {p.frequencia_pilates ? `(${p.frequencia_pilates.replace("_", " ")})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Serviço *</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {pilatesServices.filter((s) => s.categoria === "pilates").map((s) => (
                  <option key={s.id} value={s.id}>{s.nome} ({s.duracao_min}min{s.max_alunos ? ` — máx ${s.max_alunos} alunos` : ""})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Profissional *</label>
              <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {filteredProfs.map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
              </select>
            </div>
            <button
              onClick={() => { if (clientId && planId && serviceId && profissionalId) { setSlots([]); setStep(2); } else toast({ title: "Preencha todos os campos", variant: "destructive" }); }}
              className="w-full mt-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Próximo — Definir Horários
            </button>
          </div>
        )}

        {/* Step 2: Define weekday/time slots */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina {frequency} dia(s) da semana e horário para as aulas.
              {selectedPlan?.aulas_por_mes && ` (~${selectedPlan.aulas_por_mes} aulas/mês)`}
            </p>
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={slot.weekday} onChange={(e) => updateSlot(i, "weekday", Number(e.target.value))} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  {WEEKDAYS.map((wd) => <option key={wd.value} value={wd.value}>{wd.label}</option>)}
                </select>
                <input type="time" value={slot.time} onChange={(e) => updateSlot(i, "time", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <button onClick={() => removeSlot(i)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="h-3.5 w-3.5 text-destructive" /></button>
              </div>
            ))}
            {slots.length < frequency && (
              <button onClick={addSlot} className="text-sm text-primary hover:underline">+ Adicionar dia</button>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Voltar</button>
              <button
                onClick={generateDates}
                disabled={slots.length === 0}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Gerar Datas
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & confirm */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {generatedDates.length} aulas geradas ({generatedDates.filter((d) => d.conflict).length} com conflito)
              </p>
              <button onClick={() => setShowGenerated(!showGenerated)} className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                {showGenerated ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showGenerated ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {showGenerated && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {generatedDates.map((d, i) => (
                  <div key={i} className={`flex items-center justify-between text-sm px-3 py-1.5 rounded-lg ${d.conflict ? "bg-destructive/10 text-destructive" : "bg-muted/40"}`}>
                    <span>{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                    <span>{d.time}</span>
                    {d.conflict ? <span className="text-xs font-medium">Lotado</span> : <Check className="h-3.5 w-3.5 text-success" />}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(2)} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Ajustar</button>
              <button
                onClick={handleConfirm}
                disabled={saving || generatedDates.filter((d) => !d.conflict).length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                Confirmar {generatedDates.filter((d) => !d.conflict).length} aulas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
