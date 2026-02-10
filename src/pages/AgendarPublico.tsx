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

interface LandingConfig {
  nome_clinica: string;
  subtitulo: string;
  logo_url: string | null;
  banner_url: string | null;
  cor_primaria: string;
  cor_fundo: string;
  cor_texto: string;
  link_instagram: string | null;
  mensagem_boas_vindas: string | null;
  horario_funcionamento: string | null;
  telefone_whatsapp: string | null;
}

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
  const [config, setConfig] = useState<LandingConfig | null>(null);

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
    const fetchAll = async () => {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const headers = { "apikey": apikey };

      const [optionsRes, configRes] = await Promise.all([
        fetch(`${baseUrl}/functions/v1/public-booking?action=options`, { headers }),
        fetch(`${baseUrl}/rest/v1/landing_config?select=*&limit=1`, { headers }),
      ]);

      const optionsJson = await optionsRes.json();
      setServices(optionsJson.services ?? []);
      setProfessionals(optionsJson.professionals ?? []);

      const configJson = await configRes.json();
      if (Array.isArray(configJson) && configJson.length > 0) {
        setConfig(configJson[0]);
      }
      setLoading(false);
    };
    fetchAll();
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

  const corPrimaria = config?.cor_primaria || "#0d7377";
  const corFundo = config?.cor_fundo || undefined;
  const corTexto = config?.cor_texto || undefined;

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
    <div className="min-h-screen" style={{ backgroundColor: corFundo, color: corTexto }}>
      {/* Header */}
      <div className="relative py-8 px-4 overflow-hidden" style={{ backgroundColor: corPrimaria }}>
        {config?.banner_url && (
          <img src={config.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="max-w-lg mx-auto text-center relative z-10">
          {config?.logo_url && (
            <img src={config.logo_url} alt="Logo" className="h-14 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#fff" }}>
            {config?.nome_clinica || "Agende sua Sessão"}
          </h1>
          <p className="text-sm opacity-90" style={{ color: "#fff" }}>
            {config?.subtitulo || "Pilates · Fisioterapia · Estética"}
          </p>
        </div>
      </div>

      {/* Welcome message & hours */}
      {(config?.mensagem_boas_vindas || config?.horario_funcionamento) && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
            {config.mensagem_boas_vindas && (
              <p className="text-sm" style={{ color: corTexto }}>{config.mensagem_boas_vindas}</p>
            )}
            {config.horario_funcionamento && (
              <p className="text-xs text-muted-foreground">{config.horario_funcionamento}</p>
            )}
          </div>
        </div>
      )}

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

      {/* Footer */}
      <footer className="mt-12 border-t border-border/50 py-6 px-4">
        <div className="max-w-lg mx-auto text-center space-y-3">
          {config?.horario_funcionamento && (
            <p className="text-xs text-muted-foreground">{config.horario_funcionamento}</p>
          )}
          {config?.link_instagram && (
            <a
              href={config.link_instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: corPrimaria }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              Instagram
            </a>
          )}
          <p className="text-xs text-muted-foreground/60">
            {config?.nome_clinica || "Clínica"} · Todos os direitos reservados
          </p>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      {config?.telefone_whatsapp && (
        <a
          href={`https://wa.me/${config.telefone_whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
          style={{ backgroundColor: "#25D366" }}
          aria-label="Fale conosco no WhatsApp"
        >
          <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
