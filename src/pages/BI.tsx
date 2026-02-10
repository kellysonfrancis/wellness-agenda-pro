import GlobalLayout from "@/components/layout/GlobalLayout";
import { BarChart3, TrendingUp, Users, PieChart } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RPie, Pie, Cell,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { mockPayments, mockClients, mockAppointments, mockEntitlements, mockServices, getClientName } from "@/data/mockData";

/* ── helpers ── */
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function revenueByMonth() {
  const map: Record<string, number> = {};
  months.forEach((m) => (map[m] = 0));
  mockPayments.forEach((p) => {
    const d = new Date(p.criadoEm);
    map[months[d.getMonth()]] = (map[months[d.getMonth()]] || 0) + p.valorPago;
  });
  return months.map((m) => ({ mes: m, receita: map[m] }));
}

function categoryRevenue() {
  const map: Record<string, number> = {};
  mockAppointments.forEach((a) => {
    const svc = mockServices.find((s) => s.id === a.serviceId);
    if (!svc) return;
    const cat = svc.categoria;
    const payment = mockPayments.find((p) => p.appointmentId === a.id);
    map[cat] = (map[cat] || 0) + (payment?.valorPago ?? svc.precoBase);
  });
  return Object.entries(map).map(([name, value]) => ({ name: catLabel[name] || name, value }));
}

function paymentStatusData() {
  const counts: Record<string, number> = {};
  mockPayments.forEach((p) => {
    counts[p.status] = (counts[p.status] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name: statusLabel[name] || name, value }));
}

function funnelData() {
  const leads = mockClients.length;
  const withAppt = new Set(mockAppointments.map((a) => a.clientId)).size;
  const withPack = new Set(mockEntitlements.map((e) => e.clientId)).size;
  const recurring = mockEntitlements.filter((e) => e.status === "ativo").length;
  return [
    { name: "Cadastros", value: leads, fill: "hsl(172 66% 30%)" },
    { name: "Agendaram", value: withAppt, fill: "hsl(205 80% 50%)" },
    { name: "Compraram Pacote", value: withPack, fill: "hsl(38 92% 50%)" },
    { name: "Ativos", value: recurring, fill: "hsl(152 60% 40%)" },
  ];
}

function ltvData() {
  const clientTotals: Record<string, number> = {};
  mockPayments.forEach((p) => {
    clientTotals[p.clientId] = (clientTotals[p.clientId] || 0) + p.valorPago;
  });
  return Object.entries(clientTotals)
    .map(([id, total]) => ({ cliente: getClientName(id), ltv: total }))
    .sort((a, b) => b.ltv - a.ltv);
}

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const statusLabel: Record<string, string> = { pago: "Pago", pendente: "Pendente", parcial: "Parcial", estornado: "Estornado", isento: "Isento" };

const PIE_COLORS = [
  "hsl(172 66% 30%)",
  "hsl(38 92% 50%)",
  "hsl(205 80% 50%)",
  "hsl(152 60% 40%)",
  "hsl(0 72% 51%)",
];

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-5 border-b border-border flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function BI() {
  const revenue = revenueByMonth();
  const catRev = categoryRevenue();
  const payStatus = paymentStatusData();
  const funnel = funnelData();
  const ltv = ltvData();

  const totalRevenue = mockPayments.reduce((s, p) => s + p.valorPago, 0);
  const avgTicket = totalRevenue / (mockPayments.filter((p) => p.valorPago > 0).length || 1);
  const activeClients = new Set(mockAppointments.map((a) => a.clientId)).size;

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Business Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Análises e métricas do negócio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold mt-0.5">R$ {totalRevenue.toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-info/10 text-info"><PieChart className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold mt-0.5">R$ {avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-success/10 text-success"><Users className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            <p className="text-2xl font-bold mt-0.5">{activeClients}</p>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue over time */}
        <ChartCard title="Faturamento Mensal" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Bar dataKey="receita" fill="hsl(172 66% 30%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category distribution */}
        <ChartCard title="Receita por Categoria" icon={PieChart}>
          <ResponsiveContainer width="100%" height={260}>
            <RPie>
              <Pie data={catRev} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {catRev.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
            </RPie>
          </ResponsiveContainer>
        </ChartCard>

        {/* Funnel */}
        <ChartCard title="Funil de Conversão" icon={Users}>
          <ResponsiveContainer width="100%" height={260}>
            <FunnelChart>
              <Tooltip formatter={(v: number) => v} />
              <Funnel dataKey="value" data={funnel} isAnimationActive>
                <LabelList position="right" fill="hsl(200 25% 12%)" stroke="none" dataKey="name" fontSize={12} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight={700} />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment status */}
        <ChartCard title="Status de Pagamentos" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={260}>
            <RPie>
              <Pie data={payStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} label>
                {payStatus.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </RPie>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* LTV table */}
      <ChartCard title="LTV por Cliente" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ltv} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
            <YAxis dataKey="cliente" type="category" width={120} tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
            <Bar dataKey="ltv" fill="hsl(205 80% 50%)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </GlobalLayout>
  );
}
