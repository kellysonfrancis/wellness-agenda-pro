import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import {
  Calendar, DollarSign, AlertCircle, TrendingUp,
  Clock, CalendarCheck, Package
} from "lucide-react";
import { mockAppointments, mockPayments, mockEntitlements, getServiceName, getProfessionalName, getClientName } from "@/data/mockData";

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color?: string }) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color ?? "bg-secondary text-secondary-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const todayAppts = mockAppointments.filter(a => {
    const d = new Date(a.inicioEm);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const pendingPayments = mockPayments.filter(p => p.status === "pendente" || p.status === "parcial");
  const unconfirmed = todayAppts.filter(a => a.status === "reservado");
  const monthRevenue = mockPayments.reduce((s, p) => s + p.valorPago, 0);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Atendimentos Hoje" value={todayAppts.length} color="bg-primary/10 text-primary" />
        <StatCard icon={DollarSign} label="Pendências" value={pendingPayments.length} color="bg-warning/10 text-warning" />
        <StatCard icon={AlertCircle} label="Não Confirmados" value={unconfirmed.length} color="bg-destructive/10 text-destructive" />
        <StatCard icon={TrendingUp} label="Faturamento Mês" value={`R$ ${monthRevenue.toLocaleString("pt-BR")}`} color="bg-success/10 text-success" />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold">Agenda de Hoje</h2>
        </div>
        <div className="divide-y divide-border">
          {todayAppts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nenhum atendimento hoje.</p>
          ) : (
            todayAppts.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{getClientName(a.clientId)} — {getServiceName(a.serviceId)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.inicioEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {getProfessionalName(a.profissionalId)}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                  a.status === "confirmado" ? "bg-success/10 text-success" :
                  a.status === "reservado" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function ProfessionalDashboard() {
  const todayAppts = mockAppointments.filter(a => {
    const d = new Date(a.inicioEm);
    return d.toDateString() === new Date().toDateString() && a.profissionalId === "p1";
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Calendar} label="Minha Agenda Hoje" value={todayAppts.length} color="bg-primary/10 text-primary" />
        <StatCard icon={AlertCircle} label="Não Confirmados" value={todayAppts.filter(a => a.status === "reservado").length} color="bg-warning/10 text-warning" />
        <StatCard icon={CalendarCheck} label="Próx. 7 dias" value={mockAppointments.filter(a => a.profissionalId === "p1").length} color="bg-info/10 text-info" />
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border"><h2 className="text-lg font-semibold">Meus Atendimentos Hoje</h2></div>
        <div className="divide-y divide-border">
          {todayAppts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nenhum atendimento hoje.</p>
          ) : todayAppts.map(a => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{getClientName(a.clientId)} — {getServiceName(a.serviceId)}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.inicioEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === "confirmado" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ClientDashboard() {
  const myAppts = mockAppointments.filter(a => a.clientId === "c1");
  const myPacks = mockEntitlements.filter(e => e.clientId === "c1" && e.status === "ativo");

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard icon={CalendarCheck} label="Próximos Agendamentos" value={myAppts.length} color="bg-primary/10 text-primary" />
        <StatCard icon={Package} label="Pacotes Ativos" value={myPacks.length} color="bg-success/10 text-success" />
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 text-center">
        <p className="text-muted-foreground text-sm mb-3">Precisa agendar?</p>
        <a href="/agendar" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Calendar className="h-4 w-4" /> Agendar Agora
        </a>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { profile, isRole } = useAuth();

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Olá, {profile?.nome?.split(" ")[0] || "usuário"} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumo do seu dia</p>
      </div>
      {isRole("admin", "recepcao") && <AdminDashboard />}
      {isRole("profissional") && <ProfessionalDashboard />}
      {isRole("cliente") && <ClientDashboard />}
    </GlobalLayout>
  );
}
