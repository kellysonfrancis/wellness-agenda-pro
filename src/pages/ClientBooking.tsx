import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPlus, ChevronRight, CheckCircle2 } from "lucide-react";
import { addMinutes, format, setHours, setMinutes, startOfDay, addDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };

export default function ClientBooking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [profId, setProfId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [obs, setObs] = useState("");
  const [done, setDone] = useState(false);

  const { data: client } = useQuery({
    queryKey: ["my-client-record-booking", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("email", user?.email || "")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["booking-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, nome, categoria, duracao_min, preco_base")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: professionals = [] } = useQuery({
    queryKey: ["booking-professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, nome_exibicao, especialidades")
        .eq("ativo", true)
        .order("nome_exibicao");
      if (error) throw error;
      return data || [];
    },
  });

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedProf = professionals.find((p) => p.id === profId);
  const filteredServices = catFilter ? services.filter((s) => s.categoria === catFilter) : services;
  const filteredProfs = selectedService
    ? professionals.filter((p) => (p.especialidades as string[]).includes(selectedService.categoria))
    : professionals;

  // Generate date options (next 14 days, exclude Sundays)
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i + 1);
    return d.getDay() !== 0 ? format(d, "yyyy-MM-dd") : null;
  }).filter(Boolean) as string[];

  // Time slots
  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const h = 7 + i;
    return [`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`];
  }).flat();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id || !serviceId || !profId || !selectedDate || !selectedTime) throw new Error("Preencha todos os campos");
      const [hour, min] = selectedTime.split(":").map(Number);
      const inicio = new Date(`${selectedDate}T${selectedTime}:00`);
      const duracao = selectedService?.duracao_min || 50;
      const fim = addMinutes(inicio, duracao);

      const { error } = await supabase.from("appointments").insert({
        client_id: client.id,
        service_id: serviceId,
        profissional_id: profId,
        inicio_em: inicio.toISOString(),
        fim_em: fim.toISOString(),
        status: "reservado" as any,
        origem: "cliente" as any,
        observacoes: obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      toast.success("Agendamento solicitado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reset = () => {
    setStep(0);
    setCatFilter(null);
    setServiceId(null);
    setProfId(null);
    setSelectedDate("");
    setSelectedTime("");
    setObs("");
    setDone(false);
  };

  if (done) {
    return (
      <GlobalLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-4"><CheckCircle2 className="h-8 w-8 text-primary" /></div>
          <h1 className="text-xl font-bold mb-2">Agendamento Solicitado!</h1>
          <p className="text-sm text-muted-foreground mb-6">Você receberá uma confirmação em breve.</p>
          <div className="flex gap-3">
            <a href="/meus-agendamentos" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Ver Meus Agendamentos
            </a>
            <Button variant="outline" onClick={reset}>Novo Agendamento</Button>
          </div>
        </div>
      </GlobalLayout>
    );
  }

  if (!client && user) {
    return (
      <GlobalLayout>
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum cadastro de cliente encontrado para seu email.
        </div>
      </GlobalLayout>
    );
  }

  const categories = [...new Set(services.map((s) => s.categoria))];

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarPlus className="h-6 w-6 text-primary" /> Agendar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha o serviço, profissional e horário</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground flex-wrap">
        {["Serviço", "Profissional", "Data/Hora", "Confirmar"].map((s, i) => (
          <span key={s} className={`px-3 py-1.5 rounded-full transition-colors ${step === i ? "bg-primary text-primary-foreground font-medium" : "bg-muted"}`}>{s}</span>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCatFilter(null)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${!catFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Todos</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${catFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {catLabel[c] || c}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filteredServices.map((s) => (
              <button key={s.id} onClick={() => { setServiceId(s.id); setStep(1); }}
                className="w-full p-4 bg-card rounded-xl border border-border shadow-sm hover:border-primary transition-all text-left flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{s.nome}</p>
                  <p className="text-xs text-muted-foreground">{s.duracao_min} min · R$ {Number(s.preco_base).toFixed(2)} · {catLabel[s.categoria] || s.categoria}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {filteredProfs.map((p) => (
            <button key={p.id} onClick={() => { setProfId(p.id); setStep(2); }}
              className="w-full p-4 bg-card rounded-xl border border-border shadow-sm hover:border-primary transition-all text-left flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{p.nome_exibicao}</p>
                <p className="text-xs text-muted-foreground capitalize">{(p.especialidades as string[]).join(", ")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <button onClick={() => setStep(0)} className="text-sm text-primary hover:underline">← Voltar</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 max-w-md">
          <div>
            <Label>Data</Label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a data" /></SelectTrigger>
              <SelectContent>
                {dateOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {format(new Date(d + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Horário</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
              <SelectContent>
                {timeSlots.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Alguma observação..." rows={3} className="mt-1" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setStep(3)} disabled={!selectedDate || !selectedTime}>Próximo</Button>
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 max-w-md">
          <h3 className="font-semibold mb-4">Confirmar Agendamento</h3>
          <div className="space-y-2 text-sm mb-6">
            <p><span className="text-muted-foreground">Serviço:</span> {selectedService?.nome}</p>
            <p><span className="text-muted-foreground">Profissional:</span> {selectedProf?.nome_exibicao}</p>
            <p><span className="text-muted-foreground">Data:</span> {selectedDate && format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}</p>
            <p><span className="text-muted-foreground">Horário:</span> {selectedTime}</p>
            <p><span className="text-muted-foreground">Duração:</span> {selectedService?.duracao_min} min</p>
            <p><span className="text-muted-foreground">Valor:</span> R$ {Number(selectedService?.preco_base || 0).toFixed(2)}</p>
            {obs && <p><span className="text-muted-foreground">Obs:</span> {obs}</p>}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? "Agendando..." : "Confirmar"}
            </Button>
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
