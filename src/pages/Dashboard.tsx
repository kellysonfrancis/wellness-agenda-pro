import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import {
  Calendar, DollarSign, AlertCircle, TrendingUp,
  Clock, CalendarCheck, Package, Loader2, Users, Percent, Ban
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
  valor_total: number;
  status: string;
  created_at: string;
  client_id: string;
}

interface DBClient { id: string; nome: string }
interface DBService { id: string; nome: string; duracao_min: number }
interface DBProfessional { id: string; nome_exibicao: string; user_id: string | null }
interface DBEntitlement { id: string; client_id: string; status: string }

function StatCard({ icon: Icon, label, value, subtitle, color, delay = 0 }: { icon: React.ElementType; label: string; value: string | number; subtitle?: string; color?: string; delay?: number }) {
  return (
    <div
      className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-start gap-4 animate-slide-up card-hover"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className={`p-2.5 rounded-lg ${color ?? "bg-secondary text-secondary-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
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
      supabase.from("payments").select("id, valor_pago, valor_total, status, created_at, client_id"),
      supabase.from("clients").select("id, nome"),
      supabase.from("services").select("id, nome, duracao_min"),
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

  // Realtime: re-fetch on changes to key tables
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const getClientName = useCallback((id: string) => clients.find((c) => c.id === id)?.nome ?? "—", [clients]);
  const getServiceName = useCallback((id: string) => services.find((s) => s.id === id)?.nome ?? "—", [services]);
  const getProfName = useCallback((id: string) => professionals.find((p) => p.id === id)?.nome_exibicao ?? "—", [professionals]);

  return { appointments, payments, clients, services, professionals, entitlements, loading, getClientName, getServiceName, getProfName };
}

function AdminDashboard({ data }: { data: ReturnType<typeof useDashboardData> }) {
  const { appointments, payments, professionals, getClientName, getServiceName, getProfName } = data;

  const todayAppts = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter((a) => new Date(a.inicio_em).toDateString() === today);
  }, [appointments]);

  const now = new Date();

  // === KPI 1: Faturamento do Mês (pagamentos pagos) ===
  const monthRevenue = useMemo(() => {
    return payments
      .filter((p) => {
        if (p.status !== "pago") return false;
        const d = new Date(p.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + Number(p.valor_pago), 0);
  }, [payments]);

  // === KPI 2: Agendamentos do Dia (por status) ===
  const todayConcluidos = useMemo(() => todayAppts.filter((a) => a.status === "concluido").length, [todayAppts]);
  const todayPendentes = useMemo(() => todayAppts.filter((a) => a.status === "reservado" || a.status === "confirmado" || a.status === "em_atendimento").length, [todayAppts]);

  // === KPI 3: Taxa de Ocupação (mês atual) ===
  const occupancyRate = useMemo(() => {
    const activeProfessionals = professionals.length;
    if (activeProfessionals === 0) return 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Working days in month (Mon-Sat)
    let workingDays = 0;
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) workingDays++;
    }

    // Slots per prof per day: 8h / 50min ≈ 9 slots
    const slotsPerDay = 9;
    const totalSlots = activeProfessionals * workingDays * slotsPerDay;

    const monthAppts = appointments.filter((a) => {
      const d = new Date(a.inicio_em);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.status !== "cancelado";
    });

    return totalSlots > 0 ? Math.min(Math.round((monthAppts.length / totalSlots) * 100), 100) : 0;
  }, [appointments, professionals]);

  // === KPI 4: Inadimplência ===
  const inadimplencia = useMemo(() => {
    const overdue = payments.filter((p) => p.status === "pendente" || p.status === "parcial");
    const total = overdue.reduce((s, p) => s + (Number(p.valor_total) - Number(p.valor_pago)), 0);
    return { count: overdue.length, total };
  }, [payments]);

  // === KPI 5: Faturamento do Mês Anterior (para comparação) ===
  const lastMonthRevenue = useMemo(() => {
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return payments
      .filter((p) => {
        if (p.status !== "pago") return false;
        const d = new Date(p.created_at);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      })
      .reduce((s, p) => s + Number(p.valor_pago), 0);
  }, [payments]);

  const revenueGrowth = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null;

  const unconfirmed = useMemo(() => todayAppts.filter((a) => a.status === "reservado"), [todayAppts]);

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label="Faturamento do Mês"
          value={`R$ ${monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          subtitle={revenueGrowth !== null ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}% vs mês anterior` : "Primeiro mês"}
          color="bg-success/10 text-success"
          delay={0}
        />
        <StatCard
          icon={Calendar}
          label="Atendimentos Hoje"
          value={todayAppts.length}
          subtitle={`${todayConcluidos} concluídos · ${todayPendentes} pendentes`}
          color="bg-primary/10 text-primary"
          delay={60}
        />
        <StatCard
          icon={Percent}
          label="Taxa de Ocupação"
          value={`${occupancyRate}%`}
          subtitle={`${professionals.length} profissionais ativos`}
          color="bg-info/10 text-info"
          delay={120}
        />
        <StatCard
          icon={Ban}
          label="Inadimplência"
          value={inadimplencia.count}
          subtitle={`R$ ${inadimplencia.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em aberto`}
          color="bg-destructive/10 text-destructive"
          delay={180}
        />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard icon={AlertCircle} label="Não Confirmados Hoje" value={unconfirmed.length} color="bg-warning/10 text-warning" />
        <StatCard icon={Users} label="Total de Clientes" value={data.clients.length} color="bg-secondary text-secondary-foreground" />
      </div>

      {/* Today's schedule */}
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
                  a.status === "concluido" ? "bg-success/10 text-success" :
                  a.status === "confirmado" ? "bg-primary/10 text-primary" :
                  a.status === "em_atendimento" ? "bg-info/10 text-info" :
                  a.status === "reservado" ? "bg-warning/10 text-warning" :
                  a.status === "faltou" ? "bg-destructive/10 text-destructive" :
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
