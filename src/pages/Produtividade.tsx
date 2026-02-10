import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, UserCheck, UserX, DollarSign, Calendar, BarChart3, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ["hsl(172 66% 30%)", "hsl(38 92% 50%)", "hsl(0 72% 51%)", "hsl(205 80% 50%)", "hsl(152 60% 40%)"];

type PeriodFilter = "month" | "quarter" | "year" | "all";

function periodCutoff(period: PeriodFilter): string | null {
  if (period === "all") return null;
  const now = new Date();
  let d: Date;
  if (period === "month") d = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  else if (period === "quarter") d = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  else d = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return d.toISOString();
}

export default function Produtividade() {
  const [period, setPeriod] = useState<PeriodFilter>("month");

  const { data: raw, isLoading } = useQuery({
    queryKey: ["produtividade-data"],
    queryFn: async () => {
      const [apptRes, payRes, profRes, svcRes] = await Promise.all([
        supabase.from("appointments").select("id, client_id, service_id, profissional_id, inicio_em, status"),
        supabase.from("payments").select("id, appointment_id, valor_pago, created_at"),
        supabase.from("professionals").select("id, nome_exibicao, ativo"),
        supabase.from("services").select("id, nome, categoria"),
      ]);
      return {
        appointments: apptRes.data ?? [],
        payments: payRes.data ?? [],
        professionals: profRes.data ?? [],
        services: svcRes.data ?? [],
      };
    },
    staleTime: 60_000,
  });

  const computed = useMemo(() => {
    if (!raw) return null;
    const { appointments, payments, professionals, services } = raw;
    const cutoff = periodCutoff(period);

    const svcMap = new Map(services.map((s) => [s.id, s]));
    const payByAppt = new Map<string, number>();
    payments.forEach((p) => {
      if (p.appointment_id) {
        payByAppt.set(p.appointment_id, (payByAppt.get(p.appointment_id) || 0) + Number(p.valor_pago));
      }
    });

    let filteredAppts = appointments;
    if (cutoff) filteredAppts = filteredAppts.filter((a) => a.inicio_em >= cutoff);

    // Per-professional stats
    const profStats = professionals.filter((p) => p.ativo).map((prof) => {
      const myAppts = filteredAppts.filter((a) => a.profissional_id === prof.id);
      const total = myAppts.length;
      const concluidos = myAppts.filter((a) => a.status === "concluido").length;
      const faltas = myAppts.filter((a) => a.status === "faltou").length;
      const cancelados = myAppts.filter((a) => a.status === "cancelado").length;
      const taxaFaltas = total > 0 ? (faltas / total) * 100 : 0;
      const taxaConclusao = total > 0 ? (concluidos / total) * 100 : 0;
      const receita = myAppts.reduce((s, a) => s + (payByAppt.get(a.id) || 0), 0);
      const clientesUnicos = new Set(myAppts.map((a) => a.client_id)).size;

      // Category breakdown
      const catCount: Record<string, number> = {};
      myAppts.forEach((a) => {
        const cat = svcMap.get(a.service_id)?.categoria || "outros";
        catCount[cat] = (catCount[cat] || 0) + 1;
      });

      return {
        id: prof.id,
        nome: prof.nome_exibicao,
        total,
        concluidos,
        faltas,
        cancelados,
        taxaFaltas,
        taxaConclusao,
        receita,
        clientesUnicos,
        catCount,
      };
    }).sort((a, b) => b.receita - a.receita);

    // Global KPIs
    const totalAtendimentos = profStats.reduce((s, p) => s + p.total, 0);
    const totalReceita = profStats.reduce((s, p) => s + p.receita, 0);
    const totalFaltas = profStats.reduce((s, p) => s + p.faltas, 0);
    const taxaFaltasGlobal = totalAtendimentos > 0 ? (totalFaltas / totalAtendimentos) * 100 : 0;
    const avgAtendimentos = profStats.length > 0 ? totalAtendimentos / profStats.length : 0;

    // Chart data
    const barData = profStats.map((p) => ({
      nome: p.nome.split(" ")[0],
      atendimentos: p.concluidos,
      faltas: p.faltas,
      cancelados: p.cancelados,
    }));

    const revenueBar = profStats.map((p) => ({
      nome: p.nome.split(" ")[0],
      receita: p.receita,
    }));

    // Status distribution
    const statusData = [
      { name: "Concluídos", value: profStats.reduce((s, p) => s + p.concluidos, 0) },
      { name: "Faltas", value: totalFaltas },
      { name: "Cancelados", value: profStats.reduce((s, p) => s + p.cancelados, 0) },
    ].filter((d) => d.value > 0);

    return { profStats, totalAtendimentos, totalReceita, totalFaltas, taxaFaltasGlobal, avgAtendimentos, barData, revenueBar, statusData };
  }, [raw, period]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <GlobalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Produtividade por Profissional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Atendimentos, receita e taxa de faltas</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Último mês</SelectItem>
            <SelectItem value="quarter">Último trimestre</SelectItem>
            <SelectItem value="year">Último ano</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading || !computed ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Atendimentos", value: computed.totalAtendimentos, icon: Calendar, accent: "text-primary" },
              { label: "Receita Gerada", value: fmt(computed.totalReceita), icon: DollarSign, accent: "text-green-600 dark:text-green-400" },
              { label: "Taxa de Faltas", value: `${computed.taxaFaltasGlobal.toFixed(1)}%`, icon: UserX, accent: "text-destructive" },
              { label: "Média/Profissional", value: computed.avgAtendimentos.toFixed(0), icon: Target, accent: "text-primary" },
            ].map((c) => (
              <div key={c.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <c.icon className={`h-4 w-4 ${c.accent}`} />
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
                <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Atendimentos por Profissional</h3>
              </div>
              <div className="p-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.barData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="atendimentos" name="Concluídos" fill="hsl(172 66% 30%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="faltas" name="Faltas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelados" name="Cancelados" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Receita por Profissional</h3>
              </div>
              <div className="p-5 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.revenueBar} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="nome" type="category" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="receita" name="Receita" fill="hsl(152 60% 40%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Distribution pie */}
          {computed.statusData.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm mb-6">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Distribuição de Status</h3>
              </div>
              <div className="p-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={computed.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {computed.statusData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Detalhamento por Profissional</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium">Profissional</th>
                    <th className="text-center p-3 font-medium">Atendimentos</th>
                    <th className="text-center p-3 font-medium">Concluídos</th>
                    <th className="text-center p-3 font-medium">Faltas</th>
                    <th className="text-center p-3 font-medium">Cancelados</th>
                    <th className="text-center p-3 font-medium">Taxa Conclusão</th>
                    <th className="text-center p-3 font-medium">Taxa Faltas</th>
                    <th className="text-center p-3 font-medium">Clientes</th>
                    <th className="text-right p-3 font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.profStats.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{p.nome}</td>
                      <td className="p-3 text-center">{p.total}</td>
                      <td className="p-3 text-center text-green-600 dark:text-green-400 font-medium">{p.concluidos}</td>
                      <td className="p-3 text-center text-destructive font-medium">{p.faltas}</td>
                      <td className="p-3 text-center text-muted-foreground">{p.cancelados}</td>
                      <td className="p-3 text-center">
                        <Badge variant={p.taxaConclusao >= 80 ? "default" : p.taxaConclusao >= 50 ? "secondary" : "destructive"}>
                          {p.taxaConclusao.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={p.taxaFaltas <= 10 ? "default" : p.taxaFaltas <= 25 ? "secondary" : "destructive"}>
                          {p.taxaFaltas.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-center">{p.clientesUnicos}</td>
                      <td className="p-3 text-right font-semibold">{fmt(p.receita)}</td>
                    </tr>
                  ))}
                  {computed.profStats.length === 0 && (
                    <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhum profissional ativo</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </GlobalLayout>
  );
}
