import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from "recharts";
import { TrendingUp, DollarSign, CalendarDays, Package, Receipt } from "lucide-react";
import {
  addMonths, format, startOfMonth, endOfMonth, parseISO, isAfter, isBefore,
  differenceInMonths, startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const MONTHS_AHEAD = 6;
const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };

export default function ProjecaoReceita() {
  const now = new Date();

  // Active entitlements with their plans
  const { data: entitlements = [] } = useQuery({
    queryKey: ["projecao-entitlements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_entitlements")
        .select("id, client_id, product_plan_id, inicio_em, expira_em, status, saldo_creditos, product_plans(nome, preco, categoria, tipo, vigencia_meses, creditos_total)")
        .eq("status", "ativo");
      if (error) throw error;
      return data || [];
    },
  });

  // Future appointments (not cancelled)
  const { data: futureAppts = [] } = useQuery({
    queryKey: ["projecao-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, inicio_em, service_id, status, services(nome, preco_base, categoria)")
        .gte("inicio_em", now.toISOString())
        .not("status", "eq", "cancelado");
      if (error) throw error;
      return data || [];
    },
  });

  // Recurring expenses for net projection
  const { data: recurringExpenses = [] } = useQuery({
    queryKey: ["projecao-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, valor, descricao, categoria, recorrente")
        .eq("recorrente", true);
      if (error) throw error;
      return data || [];
    },
  });

  const monthlyExpenses = useMemo(() => {
    return recurringExpenses.reduce((sum, e) => sum + Number(e.valor), 0);
  }, [recurringExpenses]);

  // Project revenue by month
  const projection = useMemo(() => {
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    for (let i = 0; i < MONTHS_AHEAD; i++) {
      const m = addMonths(now, i);
      months.push({
        key: format(m, "yyyy-MM"),
        label: format(m, "MMM/yy", { locale: ptBR }),
        start: startOfMonth(m),
        end: endOfMonth(m),
      });
    }

    return months.map((m) => {
      // Revenue from recurring plans (monthly)
      let recorrente = 0;
      entitlements.forEach((e) => {
        const plan = e.product_plans as any;
        if (!plan || plan.tipo !== "mensal_recorrente") return;
        const inicio = startOfDay(parseISO(e.inicio_em));
        const expira = e.expira_em ? startOfDay(parseISO(e.expira_em)) : addMonths(inicio, plan.vigencia_meses || 12);
        if (isBefore(m.start, expira) && isAfter(m.end, inicio)) {
          recorrente += Number(plan.preco);
        }
      });

      // Revenue from scheduled appointments
      let agendamentos = 0;
      futureAppts.forEach((a) => {
        const apptDate = parseISO(a.inicio_em);
        if (apptDate >= m.start && apptDate <= m.end) {
          const svc = a.services as any;
          agendamentos += svc ? Number(svc.preco_base) : 0;
        }
      });

      // Credit-based plans: distribute remaining value across remaining months
      let creditos = 0;
      entitlements.forEach((e) => {
        const plan = e.product_plans as any;
        if (!plan || plan.tipo === "mensal_recorrente") return;
        const inicio = startOfDay(parseISO(e.inicio_em));
        const expira = e.expira_em ? startOfDay(parseISO(e.expira_em)) : addMonths(inicio, 6);
        if (isBefore(m.start, expira) && isAfter(m.end, inicio)) {
          const totalMonths = Math.max(1, differenceInMonths(expira, inicio));
          creditos += Number(plan.preco) / totalMonths;
        }
      });

      const totalReceita = recorrente + agendamentos + creditos;
      const despesas = monthlyExpenses;
      const lucroProjetado = totalReceita - despesas;

      return {
        ...m,
        recorrente: Math.round(recorrente * 100) / 100,
        agendamentos: Math.round(agendamentos * 100) / 100,
        creditos: Math.round(creditos * 100) / 100,
        totalReceita: Math.round(totalReceita * 100) / 100,
        despesas: Math.round(despesas * 100) / 100,
        lucroProjetado: Math.round(lucroProjetado * 100) / 100,
      };
    });
  }, [entitlements, futureAppts, monthlyExpenses, now]);

  // Category breakdown from active entitlements
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    entitlements.forEach((e) => {
      const plan = e.product_plans as any;
      if (!plan) return;
      const label = catLabel[plan.categoria] || plan.categoria;
      map.set(label, (map.get(label) || 0) + Number(plan.preco));
    });
    return Array.from(map, ([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [entitlements]);

  const totals = useMemo(() => {
    return {
      receita6m: projection.reduce((s, m) => s + m.totalReceita, 0),
      recorrente6m: projection.reduce((s, m) => s + m.recorrente, 0),
      despesas6m: projection.reduce((s, m) => s + m.despesas, 0),
      lucro6m: projection.reduce((s, m) => s + m.lucroProjetado, 0),
      planosAtivos: entitlements.length,
      apptsFuturos: futureAppts.length,
    };
  }, [projection, entitlements, futureAppts]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const BAR_COLORS = ["hsl(var(--primary))", "hsl(var(--primary) / 0.6)", "hsl(var(--primary) / 0.3)"];

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Projeção de Receita
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimativa para os próximos {MONTHS_AHEAD} meses baseada em planos ativos e agendamentos
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Receita Projetada", value: `R$ ${fmt(totals.receita6m)}`, icon: DollarSign, accent: "text-primary" },
          { label: "Recorrente", value: `R$ ${fmt(totals.recorrente6m)}`, icon: TrendingUp, accent: "text-primary" },
          { label: "Despesas Fixas", value: `R$ ${fmt(totals.despesas6m)}`, icon: Receipt, accent: "text-destructive" },
          { label: "Lucro Projetado", value: `R$ ${fmt(totals.lucro6m)}`, icon: DollarSign, accent: totals.lucro6m >= 0 ? "text-primary" : "text-destructive" },
          { label: "Planos Ativos", value: totals.planosAtivos.toString(), icon: Package, accent: "text-foreground" },
          { label: "Agend. Futuros", value: totals.apptsFuturos.toString(), icon: CalendarDays, accent: "text-foreground" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.accent}`} />
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
            <p className={`text-lg font-bold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Area chart - main projection */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" /> Projeção Mensal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projection} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [`R$ ${fmt(value)}`, name]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Legend />
              <Area type="monotone" dataKey="recorrente" name="Recorrente" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
              <Area type="monotone" dataKey="agendamentos" name="Agendamentos" stackId="1" stroke="hsl(var(--primary) / 0.7)" fill="hsl(var(--primary) / 0.15)" />
              <Area type="monotone" dataKey="creditos" name="Créditos" stackId="1" stroke="hsl(var(--primary) / 0.4)" fill="hsl(var(--primary) / 0.08)" />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-primary" /> Receita por Categoria
          </h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum plano ativo</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                <RechartsTooltip
                  formatter={(value: number) => [`R$ ${fmt(value)}`, "Receita Mensal"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Mês</th>
                <th className="text-right p-3 font-medium">Recorrente</th>
                <th className="text-right p-3 font-medium">Agendamentos</th>
                <th className="text-right p-3 font-medium">Créditos</th>
                <th className="text-right p-3 font-medium">Total Receita</th>
                <th className="text-right p-3 font-medium">Despesas Fixas</th>
                <th className="text-right p-3 font-medium">Lucro Projetado</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((m) => (
                <tr key={m.key} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium capitalize">{m.label}</td>
                  <td className="p-3 text-right">R$ {fmt(m.recorrente)}</td>
                  <td className="p-3 text-right">R$ {fmt(m.agendamentos)}</td>
                  <td className="p-3 text-right">R$ {fmt(m.creditos)}</td>
                  <td className="p-3 text-right font-semibold">R$ {fmt(m.totalReceita)}</td>
                  <td className="p-3 text-right text-destructive">R$ {fmt(m.despesas)}</td>
                  <td className={`p-3 text-right font-bold ${m.lucroProjetado >= 0 ? "text-primary" : "text-destructive"}`}>
                    R$ {fmt(m.lucroProjetado)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-bold">
                <td className="p-3">Total 6 meses</td>
                <td className="p-3 text-right">R$ {fmt(totals.recorrente6m)}</td>
                <td className="p-3 text-right">R$ {fmt(projection.reduce((s, m) => s + m.agendamentos, 0))}</td>
                <td className="p-3 text-right">R$ {fmt(projection.reduce((s, m) => s + m.creditos, 0))}</td>
                <td className="p-3 text-right">R$ {fmt(totals.receita6m)}</td>
                <td className="p-3 text-right text-destructive">R$ {fmt(totals.despesas6m)}</td>
                <td className={`p-3 text-right ${totals.lucro6m >= 0 ? "text-primary" : "text-destructive"}`}>
                  R$ {fmt(totals.lucro6m)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </GlobalLayout>
  );
}