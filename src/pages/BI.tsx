import { useState } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { BarChart3, TrendingUp, TrendingDown, Users, PieChart, Receipt, Landmark, Wallet, Loader2 } from "lucide-react";
import {
  BarChart, Bar, PieChart as RPie, Pie, Cell,
  FunnelChart, Funnel, LabelList, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import BIFilters, { type PeriodFilter, type CategoryFilter } from "@/components/bi/BIFilters";
import ChartCard from "@/components/bi/ChartCard";
import { useBIData, PIE_COLORS } from "@/components/bi/useBIData";

export default function BI() {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const { data, isLoading } = useBIData(period, category);

  const {
    revenue = [], catRev = [], payStatus = [], funnel = [], ltv = [],
    totalRevenue = 0, avgTicket = 0, activeClients = 0,
    totalExpenses = 0, totalFixedExpenses = 0, totalVariableExpenses = 0,
    profit = 0, profitMargin = 0, revenueVsExpenses = [], expenseByCategory = [],
    cashFlowByAccount = [], accountBalances = [],
  } = data ?? {};

  if (isLoading) {
    return (
      <GlobalLayout>
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando dados…</span>
        </div>
      </GlobalLayout>
    );
  }

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

      {/* KPIs - Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

      {/* KPIs - Expenses & Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive"><Receipt className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Despesas Totais</p>
            <p className="text-2xl font-bold mt-0.5">R$ {totalExpenses.toLocaleString("pt-BR")}</p>
          </div>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Fixas</p>
          <p className="text-lg font-bold mt-1">R$ {totalFixedExpenses.toLocaleString("pt-BR")}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Variáveis</p>
          <p className="text-lg font-bold mt-1">R$ {totalVariableExpenses.toLocaleString("pt-BR")}</p>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className={`p-2.5 rounded-lg ${profit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lucro / Margem</p>
            <p className={`text-2xl font-bold mt-0.5 ${profit >= 0 ? "text-success" : "text-destructive"}`}>
              R$ {profit.toLocaleString("pt-BR")}
            </p>
            <p className={`text-xs font-medium ${profit >= 0 ? "text-success" : "text-destructive"}`}>
              {profitMargin.toFixed(1)}% margem
            </p>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue vs Expenses */}
        <ChartCard title="Receita × Despesas (Mensal)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={revenueVsExpenses}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="hsl(172 66% 30%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(205 80% 50%)" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Expense by category */}
        <ChartCard title="Despesas por Categoria" icon={Receipt}>
          <ResponsiveContainer width="100%" height={280}>
            <RPie>
              <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {expenseByCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Legend />
            </RPie>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by category */}
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

      {/* Cash Flow by Account */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Fluxo de Caixa por Conta" icon={Landmark}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashFlowByAccount} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} stroke="hsl(200 10% 45%)" />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="hsl(152 60% 40%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="hsl(0 72% 51%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Saldo Atual por Conta" icon={Wallet}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={accountBalances} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(200 10% 45%)" />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} stroke="hsl(200 10% 45%)" />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Bar dataKey="saldo" name="Saldo" fill="hsl(205 80% 50%)" radius={[0, 6, 6, 0]} />
            </BarChart>
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
