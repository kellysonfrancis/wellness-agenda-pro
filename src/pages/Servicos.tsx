import GlobalLayout from "@/components/layout/GlobalLayout";
import { mockServices } from "@/data/mockData";
import { Sparkles, Plus, Users, FileText, Upload, MoreVertical } from "lucide-react";
import { useState } from "react";

interface ContractTemplate {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  criadoEm: string;
}

const defaultTemplates: ContractTemplate[] = [
  { id: "ct1", nome: "Contrato Pilates Mensal", categoria: "pilates", descricao: "Contrato padrão para planos mensais de Pilates com termos de fidelização.", criadoEm: new Date().toISOString() },
  { id: "ct2", nome: "Contrato Fisioterapia", categoria: "fisioterapia", descricao: "Termo de responsabilidade e consentimento para tratamento fisioterapêutico.", criadoEm: new Date().toISOString() },
  { id: "ct3", nome: "Contrato Estética", categoria: "estetica", descricao: "Contrato para procedimentos estéticos com termos de ciência dos riscos.", criadoEm: new Date().toISOString() },
];

const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const catColor: Record<string, string> = { pilates: "bg-primary/10 text-primary", fisioterapia: "bg-info/10 text-info", estetica: "bg-accent text-accent-foreground" };

export default function Servicos() {
  const [templates] = useState<ContractTemplate[]>(defaultTemplates);

  return (
    <GlobalLayout>
      {/* ── Contratos / Templates ── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Templates de Contratos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Modelos de contrato para cada categoria de serviço</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors">
            <Upload className="h-4 w-4" /> Enviar Template
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{t.nome}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block font-medium ${catColor[t.categoria]}`}>
                      {catLabel[t.categoria]}
                    </span>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.descricao}</p>
              <div className="flex gap-2">
                <button className="flex-1 text-xs py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-accent">Visualizar</button>
                <button className="text-xs py-1.5 px-3 rounded-lg border border-input text-muted-foreground hover:bg-muted">Substituir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Serviços ── */}
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