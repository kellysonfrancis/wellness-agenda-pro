import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import {
  Calendar, DollarSign, AlertCircle, TrendingUp,
  Clock, CalendarCheck, Package, Loader2
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DBAppointment {
  id: string;
  client_id: string;
  service_id: string;
  profissional_id: string;
  inicio_em: string;
  fim_em: string;
  status: string;
}

interface DBPayment {
  id: string;
  valor_pago: number;
  status: string;
  created_at: string;
}

interface DBClient { id: string; nome: string }
interface DBService { id: string; nome: string }
interface DBProfessional { id: string; nome_exibicao: string; user_id: string | null }
interface DBEntitlement { id: string; client_id: string; status: string }

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

function useDashboardData() {
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [clients, setClients] = useState<DBClient[]>([]);
  const [services, setServices] = useState<DBService[]>([]);
  const [professionals, setProfessionals] = useState<DBProfessional[]>([]);
  const [entitlements, setEntitlements] = useState<DBEntitlement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [apptRes, payRes, cliRes, svcRes, profRes, entRes] = await Promise.all([
      supabase.from("appointments").select("id, client_id, service_id, profissional_id, inicio_em, fim_em, status"),
      supabase.from("payments").select("id, valor_pago, status, created_at"),
      supabase.from("clients").select("id, nome"),
      supabase.from("services").select("id, nome"),
      supabase.from("professionals").select("id, nome_exibicao, user_id"),
      supabase.from("client_entitlements").select("id, client_id, status"),
    ]);
    if (apptRes.data) setAppointments(apptRes.data as DBAppointment[]);
    if (payRes.data) setPayments(payRes.data as DBPayment[]);
    if (cliRes.data) setClients(cliRes.data as DBClient[]);
    if (svcRes.data) setServices(svcRes.data as DBService[]);
    if (profRes.data) setProfessionals(profRes.data as DBProfessional[]);
    if (entRes.data) setEntitlements(entRes.data as DBEntitlement[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getClientName = useCallback((id: string) => clients.find((c) => c.id === id)?.nome ?? "—", [clients]);
  const getServiceName = useCallback((id: string) => services.find((s) => s.id === id)?.nome ?? "—", [services]);
  const getProfName = useCallback((id: string) => professionals.find((p) => p.id === id)?.nome_exibicao ?? "—", [professionals]);

  return { appointments, payments, clients, services, professionals, entitlements, loading, getClientName, getServiceName, getProfName };
}

function AdminDashboard({ data }: { data: ReturnType<typeof useDashboardData> }) {
  const { appointments, payments, getClientName, getServiceName, getProfName } = data;

  const todayAppts = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter((a) => new Date(a.inicio_em).toDateString() === today);
  }, [appointments]);

  const pendingPayments = useMemo(() => payments.filter((p) => p.status === "pendente" || p.status === "parcial"), [payments]);
  const unconfirmed = useMemo(() => todayAppts.filter((a) => a.status === "reservado"), [todayAppts]);

  const monthRevenue = useMemo(() => {
    const now = new Date();
    return payments
      .filter((p) => { const d = new Date(p.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, p) => s + Number(p.valor_pago), 0);
  }, [payments]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label="Atendimentos Hoje" value={todayAppts.length} color="bg-primary/10 text-primary" />
        <StatCard icon={DollarSign} label="Pendências" value={pendingPayments.length} color="bg-warning/10 text-warning" />
        <StatCard icon={AlertCircle} label="Não Confirmados" value={unconfirmed.length} color="bg-destructive/10 text-destructive" />
        <StatCard icon={TrendingUp} label="Faturamento Mês" value={`R$ ${monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="bg-success/10 text-success" />
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
                    <p className="text-sm font-medium truncate">{getClientName(a.client_id)} — {getServiceName(a.service_id)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.inicio_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {getProfName(a.profissional_id)}</p>
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

function ProfessionalDashboard({ data, userId }: { data: ReturnType<typeof useDashboardData>; userId: string }) {
  const { appointments, professionals, getClientName, getServiceName } = data;

  const myProfId = useMemo(() => professionals.find((p) => p.user_id === userId)?.id, [professionals, userId]);

  const todayAppts = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter((a) => a.profissional_id === myProfId && new Date(a.inicio_em).toDateString() === today);
  }, [appointments, myProfId]);

  const next7Days = useMemo(() => {
    const now = Date.now();
    const limit = now + 7 * 24 * 60 * 60 * 1000;
    return appointments.filter((a) => {
      const t = new Date(a.inicio_em).getTime();
      return a.profissional_id === myProfId && t >= now && t <= limit;
    });
  }, [appointments, myProfId]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Calendar} label="Minha Agenda Hoje" value={todayAppts.length} color="bg-primary/10 text-primary" />
        <StatCard icon={AlertCircle} label="Não Confirmados" value={todayAppts.filter((a) => a.status === "reservado").length} color="bg-warning/10 text-warning" />
        <StatCard icon={CalendarCheck} label="Próx. 7 dias" value={next7Days.length} color="bg-info/10 text-info" />
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border"><h2 className="text-lg font-semibold">Meus Atendimentos Hoje</h2></div>
        <div className="divide-y divide-border">
          {todayAppts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nenhum atendimento hoje.</p>
          ) : todayAppts.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{getClientName(a.client_id)} — {getServiceName(a.service_id)}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.inicio_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === "confirmado" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ClientDashboard({ data, userId }: { data: ReturnType<typeof useDashboardData>; userId: string }) {
  const { appointments, entitlements, clients } = data;

  // Find client record linked to this user (by matching email or via profiles)
  const myAppts = useMemo(() => {
    return appointments.filter((a) => {
      const t = new Date(a.inicio_em).getTime();
      return t >= Date.now() && (a.status === "reservado" || a.status === "confirmado");
    });
  }, [appointments]);

  const activePacks = useMemo(() => entitlements.filter((e) => e.status === "ativo"), [entitlements]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard icon={CalendarCheck} label="Próximos Agendamentos" value={myAppts.length} color="bg-primary/10 text-primary" />
        <StatCard icon={Package} label="Pacotes Ativos" value={activePacks.length} color="bg-success/10 text-success" />
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
  const { user, profile, isRole } = useAuth();
  const data = useDashboardData();

  if (data.loading) {
    return (
      <GlobalLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </GlobalLayout>
    );
  }

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Olá, {profile?.nome?.split(" ")[0] || "usuário"} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumo do seu dia</p>
      </div>
      {isRole("admin", "recepcao") && <AdminDashboard data={data} />}
      {isRole("profissional") && user && <ProfessionalDashboard data={data} userId={user.id} />}
      {isRole("cliente") && user && <ClientDashboard data={data} userId={user.id} />}
    </GlobalLayout>
  );
}
