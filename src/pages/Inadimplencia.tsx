import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, Clock, Filter, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportJsonToExcel } from "@/lib/excelExport";

type AgingBucket = "0-30" | "31-60" | "61-90" | "90+";

function getAgingBucket(days: number): AgingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function getAgingColor(bucket: AgingBucket) {
  switch (bucket) {
    case "0-30": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "31-60": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "61-90": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "90+": return "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300";
  }
}

export default function Inadimplencia() {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<AgingBucket | "all">("all");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["inadimplencia-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, valor_total, valor_pago, status, created_at, metodo, client_id, clients(nome, telefone, email)")
        .in("status", ["pendente", "parcial"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const rows = useMemo(() => {
    const now = new Date();
    return payments.map((p) => {
      const dias = differenceInDays(now, new Date(p.created_at));
      const saldo = Number(p.valor_total) - Number(p.valor_pago);
      const bucket = getAgingBucket(dias);
      const client = p.clients as { nome: string; telefone: string; email: string | null } | null;
      return {
        id: p.id,
        clientName: client?.nome || "—",
        clientPhone: client?.telefone || "",
        clientEmail: client?.email || "",
        valorTotal: Number(p.valor_total),
        valorPago: Number(p.valor_pago),
        saldo,
        dias,
        bucket,
        status: p.status,
        metodo: p.metodo,
        createdAt: p.created_at,
      };
    });
  }, [payments]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (bucketFilter !== "all" && r.bucket !== bucketFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.clientName.toLowerCase().includes(q) &&
          !r.clientPhone.includes(q) &&
          !r.clientEmail.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [rows, search, bucketFilter]);

  const summary = useMemo(() => {
    const s = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0 };
    rows.forEach((r) => {
      s[r.bucket] += r.saldo;
      s.total += r.saldo;
    });
    return s;
  }, [rows]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportRows = () =>
    filtered.map((r) => ({
      Cliente: r.clientName,
      Telefone: r.clientPhone,
      "Valor Total": `R$ ${fmt(r.valorTotal)}`,
      "Valor Pago": `R$ ${fmt(r.valorPago)}`,
      "Saldo Devedor": `R$ ${fmt(r.saldo)}`,
      "Dias em Atraso": r.dias,
      Faixa: r.bucket,
      Status: r.status,
    }));

  const handleExportExcel = () => {
    exportJsonToExcel(exportRows(), "Inadimplência", `inadimplencia_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Relatório de Inadimplência", 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 25);
    doc.text(`Total em aberto: R$ ${fmt(summary.total)}`, 14, 30);

    const head = [["Cliente", "Telefone", "Valor Total", "Pago", "Saldo", "Dias", "Faixa", "Status"]];
    const body = filtered.map((r) => [
      r.clientName, r.clientPhone,
      `R$ ${fmt(r.valorTotal)}`, `R$ ${fmt(r.valorPago)}`, `R$ ${fmt(r.saldo)}`,
      r.dias.toString(), r.bucket, r.status,
    ]);
    autoTable(doc, { head, body, startY: 35, styles: { fontSize: 8 } });
    doc.save(`inadimplencia_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const buckets: { label: string; key: AgingBucket | "all" }[] = [
    { label: "Todos", key: "all" },
    { label: "0-30 dias", key: "0-30" },
    { label: "31-60 dias", key: "31-60" },
    { label: "61-90 dias", key: "61-90" },
    { label: "90+ dias", key: "90+" },
  ];

  return (
    <GlobalLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Inadimplência
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pagamentos pendentes com aging 30/60/90 dias</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total em Aberto", value: summary.total, color: "text-foreground" },
          { label: "0-30 dias", value: summary["0-30"], color: "text-yellow-600 dark:text-yellow-400" },
          { label: "31-60 dias", value: summary["31-60"], color: "text-orange-600 dark:text-orange-400" },
          { label: "61-90 dias", value: summary["61-90"], color: "text-red-600 dark:text-red-400" },
          { label: "90+ dias", value: summary["90+"], color: "text-red-700 dark:text-red-300" },
        ].map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>R$ {fmt(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {buckets.map((b) => (
              <button
                key={b.key}
                onClick={() => setBucketFilter(b.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  bucketFilter === b.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum pagamento pendente encontrado.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">Telefone</th>
                  <th className="text-right p-3 font-medium">Valor Total</th>
                  <th className="text-right p-3 font-medium">Pago</th>
                  <th className="text-right p-3 font-medium">Saldo</th>
                  <th className="text-center p-3 font-medium">Dias</th>
                  <th className="text-center p-3 font-medium">Faixa</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{r.clientName}</td>
                    <td className="p-3 text-muted-foreground">{r.clientPhone}</td>
                    <td className="p-3 text-right">R$ {fmt(r.valorTotal)}</td>
                    <td className="p-3 text-right">R$ {fmt(r.valorPago)}</td>
                    <td className="p-3 text-right font-semibold">R$ {fmt(r.saldo)}</td>
                    <td className="p-3 text-center">
                      <span className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" /> {r.dias}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getAgingColor(r.bucket)}`}>
                        {r.bucket}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={r.status === "pendente" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-3" colSpan={2}>{filtered.length} registro(s)</td>
                  <td className="p-3 text-right">R$ {fmt(filtered.reduce((s, r) => s + r.valorTotal, 0))}</td>
                  <td className="p-3 text-right">R$ {fmt(filtered.reduce((s, r) => s + r.valorPago, 0))}</td>
                  <td className="p-3 text-right">R$ {fmt(filtered.reduce((s, r) => s + r.saldo, 0))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}