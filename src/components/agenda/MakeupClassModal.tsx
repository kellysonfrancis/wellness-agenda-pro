import { useState, useMemo, useCallback } from "react";
import { X, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateSchedule, type CategorySchedule } from "@/utils/scheduleValidation";

interface Props {
  open: boolean;
  onClose: () => void;
  makeupClass: {
    id: string;
    entitlement_id: string;
    client_id: string;
    original_appointment_id: string;
    prazo_limite: string;
    status: string;
  } | null;
  clientName: string;
  services: { id: string; nome: string; categoria: string; duracao_min: number; max_alunos: number | null }[];
  professionals: { id: string; nome_exibicao: string; especialidades: string[] }[];
  existingAppointments: { inicio_em: string; fim_em: string; service_id: string }[];
  originalAppointment: { service_id: string; profissional_id: string } | null;
  categorySchedules: Record<string, CategorySchedule>;
  onScheduled: () => void;
}

export default function MakeupClassModal({
  open, onClose, makeupClass, clientName, services, professionals, existingAppointments, originalAppointment, categorySchedules, onScheduled
}: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState(originalAppointment?.service_id || "");
  const [profissionalId, setProfissionalId] = useState(originalAppointment?.profissional_id || "");
  const [saving, setSaving] = useState(false);

  const isExpired = makeupClass ? new Date(makeupClass.prazo_limite) < new Date() : false;
  const daysLeft = makeupClass
    ? Math.max(0, Math.ceil((new Date(makeupClass.prazo_limite).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const pilatesServices = useMemo(() => services.filter((s) => s.categoria === "pilates"), [services]);
  const filteredProfs = useMemo(() => professionals.filter((p) => p.especialidades.includes("pilates")), [professionals]);

  const selectedService = pilatesServices.find((s) => s.id === serviceId);

  const slotOccupancy = useMemo(() => {
    if (!date || !time || !serviceId) return 0;
    const [h, m] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const targetStart = new Date(y, mo - 1, d, h, m).getTime();
    return existingAppointments.filter((a) => {
      return a.service_id === serviceId && new Date(a.inicio_em).getTime() === targetStart;
    }).length;
  }, [date, time, serviceId, existingAppointments]);

  const isFull = selectedService?.max_alunos ? slotOccupancy >= selectedService.max_alunos : false;

  const handleSchedule = useCallback(async () => {
    if (!makeupClass || !date || !time || !serviceId || !profissionalId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (isExpired) {
      toast({ title: "Prazo de reposição expirado", variant: "destructive" });
      return;
    }
    if (isFull) {
      toast({ title: "Horário lotado", variant: "destructive" });
      return;
    }

    // Validate category schedule
    const [h0, m0] = time.split(":").map(Number);
    const [y0, mo0, d0] = date.split("-").map(Number);
    const checkDate = new Date(y0, mo0 - 1, d0, h0, m0);
    const schedCheck = validateSchedule(checkDate, "pilates", categorySchedules);
    if (!schedCheck.valid) {
      toast({ title: "Horário não permitido", description: schedCheck.message, variant: "destructive" });
      return;
    }

    setSaving(true);
    const svc = pilatesServices.find((s) => s.id === serviceId);
    const duration = svc?.duracao_min || 50;
    const [h, m] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const start = new Date(y, mo - 1, d, h, m);
    const end = new Date(start.getTime() + duration * 60000);

    // Create makeup appointment
    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .insert({
        client_id: makeupClass.client_id,
        service_id: serviceId,
        profissional_id: profissionalId,
        inicio_em: start.toISOString(),
        fim_em: end.toISOString(),
        status: "reservado" as any,
        origem: "recepcao" as any,
        entitlement_id: makeupClass.entitlement_id,
        observacoes: "Reposição de aula",
      })
      .select()
      .single();

    if (apptError) {
      toast({ title: "Erro ao agendar reposição", description: apptError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Update makeup_class record
    const { error: mkError } = await supabase
      .from("makeup_classes")
      .update({ makeup_appointment_id: (appt as any).id, status: "reagendado" } as any)
      .eq("id", makeupClass.id);

    if (mkError) {
      toast({ title: "Erro ao atualizar reposição", description: mkError.message, variant: "destructive" });
    } else {
      toast({ title: "Reposição agendada!", description: `${clientName} — ${start.toLocaleDateString("pt-BR")} às ${time}` });
      onScheduled();
    }

    setSaving(false);
    onClose();
  }, [makeupClass, date, time, serviceId, profissionalId, isExpired, isFull, pilatesServices, clientName, onScheduled, onClose, categorySchedules]);

  if (!open || !makeupClass) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reposição de Aula
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-muted/40 text-sm space-y-1">
          <p><strong>Aluno:</strong> {clientName}</p>
          <p>
            <strong>Prazo:</strong> {new Date(makeupClass.prazo_limite).toLocaleDateString("pt-BR")}
            {isExpired ? (
              <span className="ml-2 text-destructive font-medium">Expirado</span>
            ) : (
              <span className="ml-2 text-success font-medium">{daysLeft} dia(s) restante(s)</span>
            )}
          </p>
        </div>

        {isExpired ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>O prazo para reposição expirou. Não é possível reagendar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Data *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Horário *</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Serviço *</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {pilatesServices.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Profissional *</label>
              <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {filteredProfs.map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
              </select>
            </div>
            {isFull && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Horário lotado ({slotOccupancy}/{selectedService?.max_alunos} alunos)
              </div>
            )}
            {!isFull && selectedService?.max_alunos && date && time && (
              <p className="text-xs text-muted-foreground">Vagas: {slotOccupancy}/{selectedService.max_alunos}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          {!isExpired && (
            <button
              onClick={handleSchedule}
              disabled={saving || isFull || !date || !time || !serviceId || !profissionalId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reagendar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
