import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockServices, mockProfessionals } from "@/data/mockData";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Categoria } from "@/types/clinic";

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const categories: Categoria[] = ["pilates", "fisioterapia", "estetica"];

export default function ClientBooking() {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState<Categoria | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [profId, setProfId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const services = cat ? mockServices.filter((s) => s.categoria === cat && s.ativo) : [];
  const profs = cat ? mockProfessionals.filter((p) => p.especialidades.includes(cat) && p.ativo) : [];

  if (done) {
    return (
      <GlobalLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-success/10 text-success mb-4"><CalendarPlus className="h-8 w-8" /></div>
          <h1 className="text-xl font-bold mb-2">Agendamento Solicitado!</h1>
          <p className="text-sm text-muted-foreground mb-6">Você receberá uma confirmação em breve.</p>
          <a href="/meus-agendamentos" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Ver Meus Agendamentos
          </a>
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarPlus className="h-6 w-6 text-primary" /> Agendar</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha o serviço e horário desejado</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs text-muted-foreground">
        {["Categoria", "Serviço", "Profissional", "Confirmar"].map((s, i) => (
          <span key={s} className={`px-3 py-1.5 rounded-full ${step === i ? "bg-primary text-primary-foreground font-medium" : "bg-muted"}`}>{s}</span>
        ))}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((c) => (
            <button key={c} onClick={() => { setCat(c); setStep(1); }}
              className="p-6 bg-card rounded-xl border border-border shadow-sm hover:border-primary hover:shadow-md transition-all text-left group">
              <h3 className="text-lg font-semibold group-hover:text-primary">{catLabel[c]}</h3>
              <p className="text-sm text-muted-foreground mt-1">{mockServices.filter(s => s.categoria === c).length} serviços</p>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          {services.map(s => (
            <button key={s.id} onClick={() => { setServiceId(s.id); setStep(2); }}
              className="w-full p-4 bg-card rounded-xl border border-border shadow-sm hover:border-primary transition-all text-left flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{s.nome}</p>
                <p className="text-xs text-muted-foreground">{s.duracaoMin} min · R$ {s.precoBase}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <button onClick={() => setStep(0)} className="text-sm text-primary hover:underline">← Voltar</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {profs.map(p => (
            <button key={p.id} onClick={() => { setProfId(p.id); setStep(3); }}
              className="w-full p-4 bg-card rounded-xl border border-border shadow-sm hover:border-primary transition-all text-left flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{p.nomeExibicao}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.especialidades.join(", ")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <button onClick={() => setStep(1)} className="text-sm text-primary hover:underline">← Voltar</button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 max-w-md">
          <h3 className="font-semibold mb-4">Confirmar Agendamento</h3>
          <div className="space-y-2 text-sm mb-6">
            <p><span className="text-muted-foreground">Categoria:</span> {cat && catLabel[cat]}</p>
            <p><span className="text-muted-foreground">Serviço:</span> {mockServices.find(s => s.id === serviceId)?.nome}</p>
            <p><span className="text-muted-foreground">Profissional:</span> {mockProfessionals.find(p => p.id === profId)?.nomeExibicao}</p>
            <p><span className="text-muted-foreground">Data/Hora:</span> Próximo horário disponível (demo)</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDone(true)} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Confirmar</button>
            <button onClick={() => setStep(2)} className="py-2.5 px-4 rounded-lg border border-input text-sm text-muted-foreground hover:bg-muted">Voltar</button>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
