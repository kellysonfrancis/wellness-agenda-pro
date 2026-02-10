import { useState, useEffect, useCallback } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContasBancarias from "@/components/financeiro/ContasBancarias";
import ReceiptButton from "@/components/financeiro/ReceiptGenerator";
import { useToast } from "@/hooks/use-toast";

interface DBPayment {
  id: string;
  client_id: string;
  valor_total: number;
  valor_pago: number;
  status: string;
  metodo: string;
  pago_em: string | null;
  conta_destino_id: string | null;
  client: { nome: string } | null;
  bank_account: { nome: string } | null;
}

export default function Financeiro() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*, client:clients(nome), bank_account:bank_accounts(nome)")
      .order("created_at", { ascending: false });
    if (data) setPayments(data as unknown as DBPayment[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const pendentes = payments.filter((p) => p.status === "pendente" || p.status === "parcial");
  const pagos = payments.filter((p) => p.status === "pago");
  const totalPago = payments.reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalPendente = payments.reduce((s, p) => s + (Number(p.valor_total) - Number(p.valor_pago)), 0);

  const handleBaixar = async (p: DBPayment) => {
    const { error } = await supabase.from("payments").update({
      status: "pago",
      valor_pago: p.valor_total,
      pago_em: new Date().toISOString(),
    } as any).eq("id", p.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Pagamento baixado!" }); fetchPayments(); }
  };

  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de pagamentos, cobranças e contas bancárias</p>
        </div>
      </div>

      <Tabs defaultValue="pagamentos" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="stat-card flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></div>
                  <div><p className="text-sm text-muted-foreground">Faturamento</p><p className="text-2xl font-bold">R$ {totalPago.toLocaleString("pt-BR")}</p></div>
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
                          <td className="p-4">{p.client?.nome || "—"}</td>
                          <td className="p-4">R$ {Number(p.valor_total).toLocaleString("pt-BR")}</td>
                          <td className="p-4">R$ {Number(p.valor_pago).toLocaleString("pt-BR")}</td>
                          <td className="p-4 capitalize">{p.metodo}</td>
                          <td className="p-4"><span className="text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning font-medium">{p.status}</span></td>
                          <td className="p-4 flex gap-2">
                            <button onClick={() => handleBaixar(p)} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">Baixar</button>
                            <ReceiptButton payment={p} />
                          </td>
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
                      <th className="text-left p-4 font-medium text-muted-foreground">Conta Destino</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Recibo</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {pagos.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum pagamento registrado</td></tr>
                      ) : pagos.map(p => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="p-4">{p.client?.nome || "—"}</td>
                          <td className="p-4">R$ {Number(p.valor_pago).toLocaleString("pt-BR")}</td>
                          <td className="p-4 capitalize">{p.metodo}</td>
                          <td className="p-4">{p.bank_account?.nome || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-4">{p.pago_em ? new Date(p.pago_em).toLocaleDateString("pt-BR") : "—"}</td>
                          <td className="p-4"><ReceiptButton payment={p} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="contas">
          <ContasBancarias />
        </TabsContent>
      </Tabs>
    </GlobalLayout>
  );
}
