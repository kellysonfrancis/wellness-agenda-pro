import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockPlans } from "@/data/mockData";
import { Package, Plus, Tag, Heart } from "lucide-react";

const tipoLabel: Record<string, string> = {
  mensal_recorrente: "Mensal Recorrente",
  pacote_creditos: "Pacote de Créditos",
  combo_itens: "Combo de Itens",
  creditos_estetica: "Créditos Estética",
};
const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const freqLabel: Record<string, string> = { "2x_semana": "2x/semana", "3x_semana": "3x/semana", avulsa: "Avulsa" };

export default function Pacotes() {
  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Pacotes & Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie e gerencie produtos comerciais</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Novo Pacote
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left p-4 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Frequência</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Preço</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Créditos</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Descontos</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Validade</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockPlans.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 font-medium">{p.nome}</td>
                <td className="p-4 text-muted-foreground">{tipoLabel[p.tipo]}</td>
                <td className="p-4 hidden sm:table-cell capitalize">{catLabel[p.categoria]}</td>
                <td className="p-4 hidden md:table-cell">
                  {p.frequenciaPilates ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {freqLabel[p.frequenciaPilates]}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-4">R$ {p.preco.toLocaleString("pt-BR")}</td>
                <td className="p-4 hidden md:table-cell">{p.ilimitado ? "Ilimitado" : p.creditosTotal ?? p.aulasPorMes ?? "—"}</td>
                <td className="p-4 hidden lg:table-cell">
                  <div className="flex flex-col gap-1">
                    {p.descontoIndicacaoPct ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <Tag className="h-3 w-3" /> {p.descontoIndicacaoPct}% indicação
                      </span>
                    ) : null}
                    {p.descontoFamiliarPct ? (
                      <span className="inline-flex items-center gap-1 text-xs text-info">
                        <Heart className="h-3 w-3" /> {p.descontoFamiliarPct}% familiar
                      </span>
                    ) : null}
                    {!p.descontoIndicacaoPct && !p.descontoFamiliarPct && "—"}
                  </div>
                </td>
                <td className="p-4 hidden lg:table-cell">{p.validadeDias ? `${p.validadeDias}d` : p.vigenciaMeses ? `${p.vigenciaMeses}m` : "—"}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlobalLayout>
  );
}
