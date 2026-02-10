import { useState, useMemo, useCallback } from "react";
import { X, CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DBPlan, DBEntitlement } from "@/hooks/useEntitlements";

interface Props {
  open: boolean;
  onClose: () => void;
  clients: { id: string; nome: string }[];
  services: { id: string; nome: string; categoria: string; duracao_min: number }[];
  professionals: { id: string; nome_exibicao: string; especialidades: string[] }[];
  plans: DBPlan[];
  onCreated: (entitlement: DBEntitlement, count: number) => void;
}

interface SessionSlot {
  date: string;
  time: string;
  serviceId: string;
  profissionalId: string;
}

export default function PackageScheduler({ open, onClose, clients, services, professionals, plans, onCreated }: Props) {
  const [clientId, setClientId] = useState("");
  const [planId, setPlanId] = useState("");
  const [sessions, setSessions] = useState<SessionSlot[]>([]);
  const [saving, setSaving] = useState(false);

  const packagePlans = useMemo(
    () => plans.filter((p) => ["pacote_creditos", "combo_itens", "creditos_estetica"].includes(p.tipo)),
    [plans]
  );

  const selectedPlan = packagePlans.find((p) => p.id === planId);
  const totalCredits = selectedPlan?.creditos_total || 0;
  const remainingCredits = totalCredits - sessions.length;

  const catServices = useMemo(() => {
    if (!selectedPlan) return services;
    return services.filter((s) => s.categoria === selectedPlan.categoria);
  }, [selectedPlan, services]);

  const getProfsForService = useCallback((svcId: string) => {
    const svc = services.find((s) => s.id === svcId);
    if (!svc) return professionals;
    return professionals.filter((p) => p.especialidades.includes(svc.categoria));
  }, [services, professionals]);

  const addSession = () => {
    if (totalCredits > 0 && sessions.length >= totalCredits) {
      toast({ title: "Todos os créditos já foram alocados", variant: "destructive" });
      return;
    }
    setSessions([...sessions, { date: "", time: "", serviceId: catServices[0]?.id || "", profissionalId: "" }]);
  };

  const removeSession = (i: number) => setSessions(sessions.filter((_, idx) => idx !== i));
  const updateSession = (i: number, field: keyof SessionSlot, value: string) =>
    setSessions(sessions.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleConfirm = useCallback(async () => {
    if (!clientId || !planId) {
      toast({ title: "Selecione cliente e pacote", variant: "destructive" });
      return;
    }
    setSaving(true);

    const expiraEm = new Date();
    if (selectedPlan?.validade_dias) expiraEm.setDate(expiraEm.getDate() + selectedPlan.validade_dias);
    else if (selectedPlan?.vigencia_meses) expiraEm.setMonth(expiraEm.getMonth() + selectedPlan.vigencia_meses);
    else expiraEm.setMonth(expiraEm.getMonth() + 3);

    const { data: entitlement, error: entError } = await supabase
      .from("client_entitlements")
      .insert({
        client_id: clientId,
        product_plan_id: planId,
        saldo_creditos: Math.max(0, remainingCredits),
        inicio_em: new Date().toISOString().split("T")[0],
        expira_em: expiraEm.toISOString().split("T")[0],
      } as any)
      .select()
      .single();

    if (entError) {
      toast({ title: "Erro ao criar pacote", description: entError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Create scheduled sessions
    const validSessions = sessions.filter((s) => s.date && s.time && s.serviceId && s.profissionalId);
    if (validSessions.length > 0) {
      const appointments = validSessions.map((s) => {
        const svc = services.find((sv) => sv.id === s.serviceId);
        const duration = svc?.duracao_min || 50;
        const [h, m] = s.time.split(":").map(Number);
        const [y, mo, day] = s.date.split("-").map(Number);
        const start = new Date(y, mo - 1, day, h, m);
        const end = new Date(start.getTime() + duration * 60000);
        return {
          client_id: clientId,
          service_id: s.serviceId,
          profissional_id: s.profissionalId,
          inicio_em: start.toISOString(),
          fim_em: end.toISOString(),
          status: "reservado" as any,
          origem: "recepcao" as any,
          entitlement_id: (entitlement as any).id,
        };
      });

      const { error: apptError } = await supabase.from("appointments").insert(appointments);
      if (apptError) {
        toast({ title: "Erro ao agendar sessões", description: apptError.message, variant: "destructive" });
      }
    }

    const scheduled = validSessions.length;
    toast({
      title: "Pacote criado!",
      description: `${scheduled} sessão(ões) agendada(s)${remainingCredits > 0 ? `, ${remainingCredits} crédito(s) restante(s)` : ""}`,
    });

    onCreated(entitlement as DBEntitlement, scheduled);
    setSaving(false);
    onClose();
  }, [clientId, planId, sessions, selectedPlan, remainingCredits, services, onCreated, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Novo Pacote — Agendar Sessões
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Cliente *</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Selecione</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Pacote *</label>
            <select value={planId} onChange={(e) => { setPlanId(e.target.value); setSessions([]); }} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Selecione</option>
              {packagePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {Number(p.preco).toFixed(2)} ({p.creditos_total ?? "∞"} créditos)
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <>
              <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                <span>Créditos: <strong>{totalCredits}</strong></span>
                <span>Agendados: <strong>{sessions.length}</strong></span>
                <span>Restantes: <strong className={remainingCredits <= 0 ? "text-destructive" : "text-success"}>{Math.max(0, remainingCredits)}</strong></span>
              </div>

              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Sessão {i + 1}</span>
                      <button onClick={() => removeSession(i)} className="p-1 rounded hover:bg-muted"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={s.date} onChange={(e) => updateSession(i, "date", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
                      <input type="time" value={s.time} onChange={(e) => updateSession(i, "time", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
                    </div>
                    <select value={s.serviceId} onChange={(e) => updateSession(i, "serviceId", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm">
                      <option value="">Serviço</option>
                      {catServices.map((sv) => <option key={sv.id} value={sv.id}>{sv.nome}</option>)}
                    </select>
                    <select value={s.profissionalId} onChange={(e) => updateSession(i, "profissionalId", e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm">
                      <option value="">Profissional</option>
                      {getProfsForService(s.serviceId).map((p) => <option key={p.id} value={p.id}>{p.nome_exibicao}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {(totalCredits === 0 || sessions.length < totalCredits) && (
                <button onClick={addSession} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Adicionar sessão
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                {remainingCredits > 0
                  ? `Você pode agendar mais sessões depois usando os ${remainingCredits} crédito(s) restante(s).`
                  : "Todas as sessões serão agendadas agora."}
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={saving || !clientId || !planId}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Confirmar Pacote
          </button>
        </div>
      </div>
    </div>
  );
}
