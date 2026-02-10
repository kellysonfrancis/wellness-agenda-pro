import { useState, useEffect } from "react";
import { Calendar, Clock, User, Phone, Mail, CheckCircle, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceOption {
  id: string;
  nome: string;
  categoria: string;
  duracao_min: number;
  preco_base: number;
  max_alunos: number | null;
}

interface ProfessionalOption {
  id: string;
  nome_exibicao: string;
  especialidades: string[];
}

type Step = "service" | "professional" | "datetime" | "info" | "success";

function phoneMask(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

const CATEGORY_LABELS: Record<string, string> = {
  pilates: "Pilates",
  fisioterapia: "Fisioterapia",
  estetica: "Estética",
};

export default function AgendarPublico() {
  const [step, setStep] = useState<Step>("service");
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);

  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking?action=options`;
      const res = await fetch(url, {
        headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      const json = await res.json();
      setServices(json.services ?? []);
      setProfessionals(json.professionals ?? []);
      setLoading(false);
    };
    fetchOptions();
  }, []);

  const filteredProfessionals = professionals.filter((p) =>
    selectedService ? p.especialidades.includes(selectedService.categoria) : true
  );

  const fetchSlots = async (date: string) => {
    if (!selectedService || !selectedProfessional) return;
    setLoadingSlots(true);
    setSlots([]);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking?action=slots&date=${date}&service_id=${selectedService.id}&profissional_id=${selectedProfessional.id}`;
    const res = await fetch(url, {
      headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const json = await res.json();
    setSlots(json.slots ?? []);
    setLoadingSlots(false);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot("");
    fetchSlots(date);
  };

  const handleSubmit = async () => {
    if (!nome.trim() || telefone.replace(/\D/g, "").length < 10) {
      setError("Preencha nome e telefone corretamente.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ""),
        email: email.trim() || null,
        service_id: selectedService!.id,
        profissional_id: selectedProfessional!.id,
        inicio_em: selectedSlot,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
    } else {
      setStep("success");
    }
    setSubmitting(false);
  };

  // Generate next 14 days
  const today = startOfDay(new Date());
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(today, i + 1);
    return format(d, "yyyy-MM-dd");
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-2xl font-bold mb-1">Agende sua Sessão</h1>
          <p className="text-sm opacity-90">Pilates · Fisioterapia · Estética</p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-6">
          {(["Serviço", "Profissional", "Data/Horário", "Seus dados"] as const).map((label, i) => {
            const stepOrder: Step[] = ["service", "professional", "datetime", "info"];
            const currentIdx = stepOrder.indexOf(step);
            const isActive = i <= currentIdx && step !== "success";
            return (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={isActive ? "text-primary font-semibold" : ""}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step: Service */}
        {step === "service" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Escolha o serviço</h2>
            <div className="space-y-2">
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                const catServices = services.filter((s) => s.categoria === cat);
                if (catServices.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 mt-3">{label}</p>
                    {catServices.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedService(s); setSelectedProfessional(null); setStep("professional"); }}
                        className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all mb-2"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{s.nome}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <Clock className="inline h-3 w-3 mr-1" />{s.duracao_min} min
                              {s.max_alunos && s.max_alunos > 1 && <span className="ml-2">· Turma até {s.max_alunos}</span>}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            R$ {Number(s.preco_base).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Professional */}
        {step === "professional" && (
          <div>
            <button onClick={() => setStep("service")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <h2 className="text-lg font-semibold mb-4">Escolha o profissional</h2>
            <div className="space-y-2">
              {filteredProfessionals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum profissional disponível para este serviço.</p>
              ) : (
                filteredProfessionals.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProfessional(p); setStep("datetime"); }}
                    className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {p.nome_exibicao.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.nome_exibicao}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.especialidades.map((e) => CATEGORY_LABELS[e] || e).join(", ")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step: DateTime */}
        {step === "datetime" && (
          <div>
            <button onClick={() => setStep("professional")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <h2 className="text-lg font-semibold mb-4">Escolha data e horário</h2>

            {/* Date selector */}
            <div className="mb-4">
              <label className="text-sm text-muted-foreground mb-2 block">Data</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableDates.map((d) => {
                  const dateObj = new Date(d + "T12:00:00");
                  const dayName = format(dateObj, "EEE", { locale: ptBR });
                  const dayNum = format(dateObj, "dd");
                  const monthName = format(dateObj, "MMM", { locale: ptBR });
                  const isSelected = selectedDate === d;
                  return (
                    <button
                      key={d}
                      onClick={() => handleDateChange(d)}
                      className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <span className="uppercase">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                      <span className="uppercase">{monthName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots */}
            {selectedDate && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Horários disponíveis</label>
                {loadingSlots ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Nenhum horário disponível neste dia.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((s) => {
                      const time = format(new Date(s), "HH:mm");
                      const isSelected = selectedSlot === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedSlot(s)}
                          className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <button
                onClick={() => setStep("info")}
                className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Step: Client info */}
        {step === "info" && (
          <div>
            <button onClick={() => setStep("datetime")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <h2 className="text-lg font-semibold mb-4">Seus dados</h2>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6 space-y-1 text-sm">
              <p><span className="font-medium">Serviço:</span> {selectedService?.nome}</p>
              <p><span className="font-medium">Profissional:</span> {selectedProfessional?.nome_exibicao}</p>
              <p><span className="font-medium">Data/Hora:</span> {selectedSlot ? format(new Date(selectedSlot), "dd/MM/yyyy 'às' HH:mm") : ""}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Nome completo *
                </label>
                <input
                  type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Seu nome completo" maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> WhatsApp *
                </label>
                <input
                  type="text" required value={telefone} onChange={(e) => setTelefone(phoneMask(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> E-mail (opcional)
                </label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="seu@email.com" maxLength={255}
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Confirmar Agendamento
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedService?.nome} com {selectedProfessional?.nome_exibicao}
            </p>
            <p className="text-sm font-medium text-primary mb-6">
              {selectedSlot ? format(new Date(selectedSlot), "dd/MM/yyyy 'às' HH:mm") : ""}
            </p>
            <p className="text-xs text-muted-foreground mb-6">Você receberá uma confirmação em breve.</p>
            <button
              onClick={() => {
                setStep("service");
                setSelectedService(null);
                setSelectedProfessional(null);
                setSelectedDate("");
                setSelectedSlot("");
                setNome("");
                setTelefone("");
                setEmail("");
                setError(null);
              }}
              className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Fazer novo agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
