import { useState } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { BarChart3, TrendingUp, Users, PieChart } from "lucide-react";
import {
  BarChart, Bar, PieChart as RPie, Pie, Cell,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import BIFilters, { type PeriodFilter, type CategoryFilter } from "@/components/bi/BIFilters";
import ChartCard from "@/components/bi/ChartCard";
import { useBIData, PIE_COLORS } from "@/components/bi/useBIData";

export default function BI() {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const { revenue, catRev, payStatus, funnel, ltv, totalRevenue, avgTicket, activeClients } =
    useBIData(period, category);

  return (
    <GlobalLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Business Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Análises e métricas do negócio</p>
        </div>
        <BIFilters period={period} category={category} onPeriodChange={setPeriod} onCategoryChange={setCategory} />
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
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><PieChart className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold mt-0.5">R$ {avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            <p className="text-2xl font-bold mt-0.5">{activeClients}</p>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
