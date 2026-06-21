import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, CreditCard, AlertTriangle, RefreshCw } from "lucide-react";

export default function ClientPackages() {
  const { user } = useAuth();

  const { data: client } = useQuery({
    queryKey: ["my-client-record-pkg", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("email", user?.email || "")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ["my-entitlements", client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_entitlements")
        .select("id, status, saldo_creditos, inicio_em, expira_em, observacoes, product_plans(nome, categoria, preco, tipo, creditos_total, aulas_por_mes)")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["my-pending-payments", client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, valor_total, valor_pago, status, metodo, created_at")
        .eq("client_id", client!.id)
        .in("status", ["pendente", "parcial"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["my-subscriptions", client?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, provider, status, valor, periodicidade, proxima_cobranca, created_at, product_plans(nome)")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!client?.id,
  });

  const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ativo: "default",
    pausado: "secondary",
    encerrado: "outline",
    vencido: "destructive",
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" /> Meus Pacotes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Pacotes, créditos e pagamentos pendentes</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !client ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum cadastro de cliente encontrado para seu email.
        </div>
      ) : (
        <div className="space-y-6">
          {subscriptions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Assinaturas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subscriptions.map((s: any) => (
                  <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{s.product_plans?.nome || "Assinatura"}</p>
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{s.provider} · {s.periodicidade}</p>
                    {s.valor && <p className="text-sm mt-2">{fmt(Number(s.valor))}/mês</p>}
                    {s.proxima_cobranca && <p className="text-xs text-muted-foreground mt-1">Próxima cobrança: {new Date(s.proxima_cobranca).toLocaleDateString("pt-BR")}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagamentos pendentes */}
          {pendingPayments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Pagamentos Pendentes ({pendingPayments.length})
              </h2>
              <div className="space-y-3">
                {pendingPayments.map((p: any) => (
                  <div key={p.id} className="bg-card rounded-xl border border-destructive/30 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Pagamento {p.status === "parcial" ? "parcial" : "pendente"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.metodo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">{fmt(Number(p.valor_total) - Number(p.valor_pago))} restante</p>
                      <p className="text-xs text-muted-foreground">Total: {fmt(Number(p.valor_total))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pacotes */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Pacotes & Planos ({entitlements.length})
            </h2>
            {entitlements.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
                Você não possui pacotes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entitlements.map((e: any) => {
                  const plan = e.product_plans as any;
                  const isExpiring = e.expira_em && new Date(e.expira_em) <= new Date(Date.now() + 7 * 86400000);
                  return (
                    <div key={e.id} className={`bg-card rounded-xl border shadow-sm p-5 ${isExpiring && e.status === "ativo" ? "border-yellow-500/50" : "border-border"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold">{plan?.nome || "Plano"}</h3>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">{plan?.categoria}</p>
                        </div>
                        <Badge variant={statusBadge[e.status] || "secondary"}>
                          {e.status}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        {e.saldo_creditos !== null && e.saldo_creditos !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Saldo</span>
                            <span className="font-medium">{e.saldo_creditos} crédito(s)</span>
                          </div>
                        )}
                        {plan?.preco && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valor</span>
                            <span className="font-medium">{fmt(Number(plan.preco))}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Início</span>
                          <span className="font-medium">{new Date(e.inicio_em).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {e.expira_em && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Validade</span>
                            <span className={`font-medium ${isExpiring && e.status === "ativo" ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                              {new Date(e.expira_em).toLocaleDateString("pt-BR")}
                              {isExpiring && e.status === "ativo" && " ⚠️"}
                            </span>
                          </div>
                        )}
                      </div>
                      {e.observacoes && (
                        <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-2">{e.observacoes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </GlobalLayout>
  );
}
