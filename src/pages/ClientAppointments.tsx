import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockAppointments, getServiceName, getProfessionalName } from "@/data/mockData";
import { CalendarCheck } from "lucide-react";

export default function ClientAppointments() {
  // Mock: client c1
  const myAppts = mockAppointments.filter((a) => a.clientId === "c1");
  const now = new Date();

  const future = myAppts.filter(a => new Date(a.inicioEm) >= now);
  const past = myAppts.filter(a => new Date(a.inicioEm) < now);

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6 text-primary" /> Meus Agendamentos</h1>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Próximos</h2>
          {future.length === 0 ? (
            <p className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground text-center">Nenhum agendamento futuro.</p>
          ) : (
            <div className="space-y-3">
              {future.map(a => (
                <div key={a.id} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{getServiceName(a.serviceId)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.inicioEm).toLocaleDateString("pt-BR")} às {new Date(a.inicioEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {getProfessionalName(a.profissionalId)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === "confirmado" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {a.status}
                    </span>
                    {a.status === "reservado" && (
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">Confirmar</button>
                    )}
                    <button className="text-xs px-3 py-1.5 rounded-lg border border-input text-muted-foreground hover:bg-muted">Cancelar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Anteriores</h2>
          {past.length === 0 ? (
            <p className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground text-center">Nenhum agendamento anterior.</p>
          ) : (
            <div className="space-y-3">
              {past.map(a => (
                <div key={a.id} className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center justify-between opacity-70">
                  <div>
                    <p className="text-sm font-medium">{getServiceName(a.serviceId)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.inicioEm).toLocaleDateString("pt-BR")} · {a.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
