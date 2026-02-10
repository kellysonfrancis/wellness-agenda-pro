import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockServices } from "@/data/mockData";
import { Sparkles, Plus, Users } from "lucide-react";

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const catColor: Record<string, string> = { pilates: "bg-primary/10 text-primary", fisioterapia: "bg-info/10 text-info", estetica: "bg-accent text-accent-foreground" };

export default function Servicos() {
  return (
    <GlobalLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os serviços oferecidos</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Novo Serviço
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockServices.map((s) => (
          <div key={s.id} className="bg-card rounded-xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">{s.nome}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${catColor[s.categoria]}`}>
                  {catLabel[s.categoria]}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {s.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{s.duracaoMin} min</span>
              <span className="font-semibold text-foreground">R$ {s.precoBase.toLocaleString("pt-BR")}</span>
            </div>
            {s.maxAlunos && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>Máx. {s.maxAlunos} aluno{s.maxAlunos > 1 ? "s" : ""} por horário</span>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button className="flex-1 text-xs py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-accent">Editar</button>
              <button className="text-xs py-1.5 px-3 rounded-lg border border-input text-muted-foreground hover:bg-muted">Duplicar</button>
            </div>
          </div>
        ))}
      </div>
    </GlobalLayout>
  );
}