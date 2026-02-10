import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserX, Search, Clock, TrendingDown, Users, FileDown, FileSpreadsheet } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type RiskLevel = "baixo" | "medio" | "alto" | "critico";

function getRisk(days: number): RiskLevel {
  if (days <= 30) return "baixo";
  if (days <= 60) return "medio";
  if (days <= 90) return "alto";
  return "critico";
}

function getRiskStyle(risk: RiskLevel) {
  switch (risk) {
    case "baixo": return { badge: "secondary" as const, color: "text-muted-foreground" };
    case "medio": return { badge: "secondary" as const, color: "text-yellow-600 dark:text-yellow-400" };
    case "alto": return { badge: "destructive" as const, color: "text-orange-600 dark:text-orange-400" };
    case "critico": return { badge: "destructive" as const, color: "text-red-600 dark:text-red-400" };
  }
}

const riskLabels: Record<RiskLevel, string> = {
  baixo: "Baixo (≤30d)",
  medio: "Médio (31-60d)",
  alto: "Alto (61-90d)",
  critico: "Crítico (90d+)",
};

const PIE_COLORS = [
  "hsl(var(--muted-foreground))",
  "hsl(45 93% 47%)",
  "hsl(25 95% 53%)",
  "hsl(0 72% 51%)",
];

export default function Churn() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [minDays, setMinDays] = useState("30");

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["churn-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, nome, telefone, email")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["churn-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("client_id, inicio_em, status")
        .not("status", "eq", "cancelado")
        .order("inicio_em", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingClients || loadingAppts;
  const threshold = parseInt(minDays) || 30;

  const rows = useMemo(() => {
    const now = new Date();
    const lastApptMap = new Map<string, { date: Date; count: number }>();

    appointments.forEach((a) => {
      const existing = lastApptMap.get(a.client_id);
      const date = parseISO(a.inicio_em);
      if (!existing) {
        lastApptMap.set(a.client_id, { date, count: 1 });
      } else {
        existing.count++;
        if (date > existing.date) existing.date = date;
      }
    });

    return clients.map((c) => {
      const info = lastApptMap.get(c.id);
      const lastDate = info?.date || null;
      const daysSince = lastDate ? differenceInDays(now, lastDate) : 9999;
      const totalAppts = info?.count || 0;
      const risk = getRisk(daysSince);

      return {
        id: c.id,
        nome: c.nome,
        telefone: c.telefone,
        email: c.email || "",
        lastDate,
        daysSince,
        totalAppts,
        risk,
        neverBooked: !lastDate,
      };
    }).filter((r) => r.daysSince >= threshold)
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [clients, appointments, threshold]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.nome.toLowerCase().includes(q) && !r.telefone.includes(q) && !r.email.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [rows, search, riskFilter]);

  const riskSummary = useMemo(() => {
    const s = { baixo: 0, medio: 0, alto: 0, critico: 0 };
    rows.forEach((r) => { s[r.risk]++; });
    return s;
  }, [rows]);

  const pieData = useMemo(() => {
    return (["baixo", "medio", "alto", "critico"] as RiskLevel[])
      .map((r) => ({ name: riskLabels[r], value: riskSummary[r] }))
      .filter((d) => d.value > 0);
  }, [riskSummary]);

  const exportData = () =>
    filtered.map((r) => ({
      Cliente: r.nome,
      Telefone: r.telefone,
      Email: r.email,
      "Último Agendamento": r.lastDate ? format(r.lastDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca",
      "Dias sem agendar": r.neverBooked ? "Nunca agendou" : r.daysSince,
      "Total Agendamentos": r.totalAppts,
      Risco: riskLabels[r.risk],
    }));

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Churn");
    XLSX.writeFile(wb, `churn_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Relatório de Churn de Clientes", 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 25);
    doc.text(`Total de clientes em risco: ${rows.length} (mínimo ${threshold} dias)`, 14, 30);

    const head = [["Cliente", "Telefone", "Último Agendamento", "Dias", "Total Agend.", "Risco"]];
    const body = filtered.map((r) => [
      r.nome, r.telefone,
      r.lastDate ? format(r.lastDate, "dd/MM/yyyy") : "Nunca",
      r.neverBooked ? "—" : r.daysSince.toString(),
      r.totalAppts.toString(), riskLabels[r.risk],
    ]);
    autoTable(doc, { head, body, startY: 35, styles: { fontSize: 8 } });
    doc.save(`churn_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <GlobalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserX className="h-6 w-6 text-destructive" />
            Detecção de Churn
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Clientes inativos que não agendam há mais de {threshold} dias</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <p className="text-xs text-muted-foreground">Total em Risco</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{rows.length}</p>
        </div>
        {(["baixo", "medio", "alto", "critico"] as RiskLevel[]).map((r) => {
          const style = getRiskStyle(r);
          return (
            <div key={r} className="bg-card rounded-xl border border-border shadow-sm p-4">
              <p className="text-xs text-muted-foreground">{riskLabels[r]}</p>
              <p className={`text-2xl font-bold mt-1 ${style.color}`}>{riskSummary[r]}</p>
            </div>
          );
        })}
      </div>

      {/* Chart + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Pie */}
        {pieData.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-primary" /> Distribuição de Risco
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" /> Filtros
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={minDays} onValueChange={setMinDays}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">≥ 15 dias</SelectItem>
                <SelectItem value="30">≥ 30 dias</SelectItem>
                <SelectItem value="60">≥ 60 dias</SelectItem>
                <SelectItem value="90">≥ 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "baixo", "medio", "alto", "critico"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    riskFilter === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {r === "all" ? "Todos" : riskLabels[r]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum cliente inativo encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">Telefone</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-center p-3 font-medium">Último Agendamento</th>
                  <th className="text-center p-3 font-medium">Dias Inativo</th>
                  <th className="text-center p-3 font-medium">Total Agend.</th>
                  <th className="text-center p-3 font-medium">Risco</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const style = getRiskStyle(r.risk);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{r.nome}</td>
                      <td className="p-3 text-muted-foreground">{r.telefone}</td>
                      <td className="p-3 text-muted-foreground">{r.email || "—"}</td>
                      <td className="p-3 text-center">
                        {r.lastDate ? format(r.lastDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca"}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`flex items-center justify-center gap-1 ${style.color}`}>
                          <Clock className="h-3 w-3" />
                          {r.neverBooked ? "—" : r.daysSince}
                        </span>
                      </td>
                      <td className="p-3 text-center">{r.totalAppts}</td>
                      <td className="p-3 text-center">
                        <Badge variant={style.badge}>{riskLabels[r.risk]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-3" colSpan={5}>{filtered.length} cliente(s) em risco</td>
                  <td className="p-3 text-center">{filtered.reduce((s, r) => s + r.totalAppts, 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}