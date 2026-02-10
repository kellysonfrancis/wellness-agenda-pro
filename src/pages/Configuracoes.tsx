import GlobalLayout from "@/components/layout/GlobalLayout";
import { Settings, MessageSquare, CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WaLine {
  id: string;
  label: string;
  categorias: string[];
  token: string;
  phoneId: string;
  reminderEnabled: boolean;
  confirmEnabled: boolean;
  receiptEnabled: boolean;
  configured: boolean;
}

const CATEGORIAS = [
  { value: "pilates", label: "Pilates" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "estetica", label: "Estética" },
];

const newLine = (): WaLine => ({
  id: crypto.randomUUID(),
  label: "",
  categorias: [],
  token: "",
  phoneId: "",
  reminderEnabled: true,
  confirmEnabled: true,
  receiptEnabled: true,
  configured: false,
});

export default function Configuracoes() {
  const [cancelHours, setCancelHours] = useState(12);
  const [confirmStart, setConfirmStart] = useState(48);
  const [confirmEnd, setConfirmEnd] = useState(1);
  const [reminders, setReminders] = useState("24,2");

  const [lines, setLines] = useState<WaLine[]>(() => {
    const saved = localStorage.getItem("wa_lines");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const updateLine = (id: string, patch: Partial<WaLine>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.id !== id));

  const toggleCategoria = (id: string, cat: string) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const has = l.categorias.includes(cat);
      return { ...l, categorias: has ? l.categorias.filter(c => c !== cat) : [...l.categorias, cat] };
    }));
  };

  const handleSave = async (line: WaLine) => {
    if (!line.token.trim() || !line.phoneId.trim()) {
      toast.error("Preencha o Token e o Phone Number ID");
      return;
    }
    if (!line.label.trim()) {
      toast.error("Dê um nome para esta linha (ex: Recepção, Pilates)");
      return;
    }
    if (line.categorias.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }
    setSavingId(line.id);
    try {
      const { error } = await supabase.functions.invoke("save-whatsapp-config", {
        body: {
          line_id: line.id,
          label: line.label,
          categorias: line.categorias,
          access_token: line.token,
          phone_number_id: line.phoneId,
          reminder_enabled: line.reminderEnabled,
          confirm_enabled: line.confirmEnabled,
          receipt_enabled: line.receiptEnabled,
        },
      });
      if (error) throw error;
      updateLine(line.id, { configured: true, token: "", phoneId: "" });
      const updated = lines.map(l => l.id === line.id ? { ...l, configured: true, token: "", phoneId: "" } : l);
      localStorage.setItem("wa_lines", JSON.stringify(updated));
      toast.success(`Linha "${line.label}" salva com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "tente novamente"));
    } finally {
      setSavingId(null);
    }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" /> Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Parâmetros gerais da clínica</p>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">Política de Cancelamento</h2>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="cancel-hours">Horas antes para cancelar</label>
            <input id="cancel-hours" type="number" value={cancelHours} onChange={e => setCancelHours(+e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">Confirmação do Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="confirm-start">Início (horas antes)</label>
              <input id="confirm-start" type="number" value={confirmStart} onChange={e => setConfirmStart(+e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="confirm-end">Fim (horas antes)</label>
              <input id="confirm-end" type="number" value={confirmEnd} onChange={e => setConfirmEnd(+e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">Lembretes WhatsApp</h2>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="reminders">Horas antes (separado por vírgula)</label>
            <input id="reminders" type="text" value={reminders} onChange={e => setReminders(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* WhatsApp Business API — Multiple Lines */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Linhas WhatsApp Business (Meta)
            </h2>
            <button
              onClick={() => setLines(prev => [...prev, newLine()])}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar linha
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Configure múltiplos números WhatsApp, cada um vinculado a categorias específicas (ex: um para Recepção/Fisio/Estética, outro para Pilates).
          </p>

          {lines.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Nenhuma linha configurada. Clique em "Adicionar linha" para começar.
            </div>
          )}

          {lines.map((line, idx) => (
            <div key={line.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Linha {idx + 1}
                  {line.configured && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary font-medium normal-case">
                      <CheckCircle2 className="h-3 w-3" /> Ativa
                    </span>
                  )}
                </span>
                <button onClick={() => removeLine(line.id)} className="text-destructive hover:text-destructive/80 p-1" title="Remover linha">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Nome da linha</label>
                <input
                  type="text"
                  value={line.label}
                  onChange={e => updateLine(line.id, { label: e.target.value })}
                  placeholder="Ex: Recepção, Pilates"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Categorias atendidas</label>
                <div className="flex gap-2 mt-1">
                  {CATEGORIAS.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategoria(line.id, cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        line.categorias.includes(cat.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Access Token (permanente)</label>
                <input
                  type="password"
                  value={line.token}
                  onChange={e => updateLine(line.id, { token: e.target.value })}
                  placeholder={line.configured ? "••••••••••• (já salvo)" : "Cole aqui o token"}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Phone Number ID</label>
                <input
                  type="text"
                  value={line.phoneId}
                  onChange={e => updateLine(line.id, { phoneId: e.target.value })}
                  placeholder={line.configured ? "••••••••••• (já salvo)" : "ID do número"}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagens</p>
                {[
                  { key: "reminderEnabled" as const, label: "Lembrete de agendamento" },
                  { key: "confirmEnabled" as const, label: "Confirmação de agendamento" },
                  { key: "receiptEnabled" as const, label: "Recibo / comprovante" },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={line[opt.key]}
                      onChange={e => updateLine(line.id, { [opt.key]: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-ring/30"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              <button
                onClick={() => handleSave(line)}
                disabled={savingId === line.id}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingId === line.id ? "Salvando..." : line.configured ? "Atualizar" : "Salvar"}
              </button>
            </div>
          ))}

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Acesse <strong>developers.facebook.com</strong> → Meus Apps</li>
              <li>Crie ou selecione um app com produto "WhatsApp"</li>
              <li>Em API Setup, copie o <strong>Access Token</strong> permanente</li>
              <li>Copie o <strong>Phone Number ID</strong> do número verificado</li>
            </ol>
          </div>
        </div>

        <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Salvar Configurações
        </button>
      </div>
    </GlobalLayout>
  );
}
