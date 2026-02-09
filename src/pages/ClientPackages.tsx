import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockEntitlements, getPlanName, mockPlans } from "@/data/mockData";
import { ShoppingBag } from "lucide-react";

export default function ClientPackages() {
  // Mock: client c1
  const myEntitlements = mockEntitlements.filter((e) => e.clientId === "c1");

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-primary" /> Meus Pacotes</h1>
      </div>

      {myEntitlements.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Você não possui pacotes ativos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myEntitlements.map(e => {
            const plan = mockPlans.find(p => p.id === e.productPlanId);
            return (
              <div key={e.id} className="bg-card rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">{getPlanName(e.productPlanId)}</h3>
                    {plan && <p className="text-xs text-muted-foreground capitalize mt-0.5">{plan.categoria}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.status === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {e.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  {e.saldoCreditos !== null && e.saldoCreditos !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo</span>
                      <span className="font-medium">{e.saldoCreditos} créditos</span>
                    </div>
                  )}
                  {e.expiraEm && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validade</span>
                      <span className="font-medium">{new Date(e.expiraEm).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  {!e.expiraEm && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validade</span>
                      <span className="font-medium">Sem validade</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlobalLayout>
  );
}
