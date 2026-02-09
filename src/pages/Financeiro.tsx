import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockPayments, getClientName } from "@/data/mockData";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function Financeiro() {
  const pendentes = mockPayments.filter((p) => p.status === "pendente" || p.status === "parcial");
  const pagos = mockPayments.filter((p) => p.status === "pago");
  const totalPago = mockPayments.reduce((s, p) => s + p.valorPago, 0);
  const totalPendente = mockPayments.reduce((s, p) => s + (p.valorTotal - p.valorPago), 0);

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de pagamentos e cobranças</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          + Cobrança Manual
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">Faturamento Mês</p><p className="text-2xl font-bold">R$ {totalPago.toLocaleString("pt-BR")}</p></div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-warning/10 text-warning"><AlertCircle className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">Pendências</p><p className="text-2xl font-bold">R$ {totalPendente.toLocaleString("pt-BR")}</p></div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary"><CheckCircle className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">Pagamentos Concl.</p><p className="text-2xl font-bold">{pagos.length}</p></div>
        </div>
      </div>

      {/* Pending */}
      <div className="bg-card rounded-xl border border-border shadow-sm mb-6">
        <div className="p-5 border-b border-border"><h2 className="text-lg font-semibold">Pendências</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/40">
              <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Pago</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Método</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {pendentes.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma pendência! 🎉</td></tr>
              ) : pendentes.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-4">{getClientName(p.clientId)}</td>
                  <td className="p-4">R$ {p.valorTotal.toLocaleString("pt-BR")}</td>
                  <td className="p-4">R$ {p.valorPago.toLocaleString("pt-BR")}</td>
                  <td className="p-4 capitalize">{p.metodo}</td>
                  <td className="p-4"><span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">{p.status}</span></td>
                  <td className="p-4"><button className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">Baixar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paid */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 border-b border-border"><h2 className="text-lg font-semibold">Pagos</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/40">
              <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Método</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Data</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {pagos.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="p-4">{getClientName(p.clientId)}</td>
                  <td className="p-4">R$ {p.valorPago.toLocaleString("pt-BR")}</td>
                  <td className="p-4 capitalize">{p.metodo}</td>
                  <td className="p-4">{p.pagoEm ? new Date(p.pagoEm).toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GlobalLayout>
  );
}
