import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Activity, CalendarDays, Clock, Users } from "lucide-react";
import {
  startOfMonth, endOfMonth, subMonths, eachDayOfInterval,
  isWeekend, differenceInMinutes, format, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WORK_START = 8; // 8h
const WORK_END = 18;  // 18h
const WORK_MINUTES_PER_DAY = (WORK_END - WORK_START) * 60; // 600min

const periodOptions = [
  { label: "Este mês", value: "current" },
  { label: "Mês passado", value: "last" },
  { label: "Últimos 3 meses", value: "3months" },
];

function getDateRange(period: string) {
  const now = new Date();
  switch (period) {
    case "last":
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case "3months":
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function getWorkingDays(start: Date, end: Date) {
  const capEnd = end > new Date() ? new Date() : end;
  if (capEnd < start) return 0;
  return eachDayOfInterval({ start, end: capEnd }).filter((d) => !isWeekend(d)).length;
}

function getBarColor(rate: number) {
  if (rate >= 80) return "hsl(var(--primary))";
  if (rate >= 50) return "hsl(var(--primary) / 0.6)";
  return "hsl(var(--primary) / 0.3)";
}

export default function TaxaOcupacao() {
  const [period, setPeriod] = useState("current");

  const { start, end } = useMemo(() => getDateRange(period), [period]);

  const { data: professionals = [] } = useQuery({
    queryKey: ["ocupacao-professionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, nome_exibicao")
        .eq("ativo", true)
        .order("nome_exibicao");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["ocupacao-appointments", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, profissional_id, inicio_em, fim_em, status")
        .gte("inicio_em", start.toISOString())
        .lte("inicio_em", end.toISOString())
        .not("status", "eq", "cancelado");
      if (error) throw error;
      return data || [];
    },
  });

  const workingDays = useMemo(() => getWorkingDays(start, end), [start, end]);
  const totalAvailableMinutes = workingDays * WORK_MINUTES_PER_DAY;

  const profData = useMemo(() => {
    return professionals.map((prof) => {
      const profAppts = appointments.filter((a) => a.profissional_id === prof.id);
      const totalMinutes = profAppts.reduce((sum, a) => {
        return sum + Math.max(0, differenceInMinutes(parseISO(a.fim_em), parseISO(a.inicio_em)));
      }, 0);

      const completed = profAppts.filter((a) => a.status === "concluido").length;
      const noShow = profAppts.filter((a) => a.status === "faltou").length;
      const total = profAppts.length;
      const rate = totalAvailableMinutes > 0 ? Math.min(100, (totalMinutes / totalAvailableMinutes) * 100) : 0;

      return {
        id: prof.id,
        name: prof.nome_exibicao,
        totalAppts: total,
        completed,
        noShow,
        minutesUsed: totalMinutes,
        rate: Math.round(rate * 10) / 10,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [professionals, appointments, totalAvailableMinutes]);

  const avgRate = profData.length > 0
    ? Math.round((profData.reduce((s, p) => s + p.rate, 0) / profData.length) * 10) / 10
    : 0;

  const totalAppts = profData.reduce((s, p) => s + p.totalAppts, 0);
  const totalCompleted = profData.reduce((s, p) => s + p.completed, 0);
  const totalNoShow = profData.reduce((s, p) => s + p.noShow, 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <GlobalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Taxa de Ocupação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Horários preenchidos vs disponíveis por profissional ({WORK_START}h–{WORK_END}h, seg-sex)
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ocupação Média", value: `${fmt(avgRate)}%`, icon: Activity, accent: "text-primary" },
          { label: "Agendamentos", value: totalAppts.toString(), icon: CalendarDays, accent: "text-foreground" },
          { label: "Concluídos", value: totalCompleted.toString(), icon: Clock, accent: "text-primary" },
          { label: "Faltas", value: totalNoShow.toString(), icon: Users, accent: "text-destructive" },
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

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" /> Ocupação por Profissional
            </h3>
            {profData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, profData.length * 50)}>
                <BarChart data={profData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground"
                    tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={120} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Ocupação"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={30}>
                    {profData.map((entry, i) => (
                      <Cell key={i} fill={getBarColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Detail cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Detalhe por Profissional
            </h3>
            {profData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum profissional ativo</p>
            ) : (
              profData.map((p) => (
                <div key={p.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{p.name}</span>
                    <span className={`text-sm font-bold ${
                      p.rate >= 80 ? "text-primary" : p.rate >= 50 ? "text-orange-500" : "text-muted-foreground"
                    }`}>
                      {fmt(p.rate)}%
                    </span>
                  </div>
                  <Progress value={p.rate} className="h-2 mb-2" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{p.totalAppts} agendamentos</span>
                    <span>{p.completed} concluídos</span>
                    {p.noShow > 0 && <span className="text-destructive">{p.noShow} faltas</span>}
                    <span>{Math.round(p.minutesUsed / 60)}h usadas</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}