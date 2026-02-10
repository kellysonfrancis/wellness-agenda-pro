import GlobalLayout from "@/components/layout/GlobalLayout";
import { Settings, MessageSquare, CheckCircle2, AlertCircle, Plus, Trash2, Loader2, Send, ShieldCheck, XCircle, Globe, Clock, Palette } from "lucide-react";
import LandingConfigEditor from "@/components/landing/LandingConfigEditor";
import TestimonialsEditor from "@/components/landing/TestimonialsEditor";
import CategorySchedulesEditor from "@/components/agenda/CategorySchedulesEditor";
import HolidaysEditor from "@/components/agenda/HolidaysEditor";
import ThemeCustomizer from "@/components/theme/ThemeCustomizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  isNew?: boolean;
  // validation state
  validationStatus?: "idle" | "validating" | "valid" | "invalid";
  validationMsg?: string;
  phoneDisplay?: string;
  // test state
  testStatus?: "idle" | "sending" | "sent" | "error";
  testMsg?: string;
  testPhone?: string;
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
  isNew: true,
  validationStatus: "idle",
  testStatus: "idle",
  testPhone: "",
});

export default function Configuracoes() {
  const [cancelHours, setCancelHours] = useState(12);
  const [confirmStart, setConfirmStart] = useState(48);
  const [confirmEnd, setConfirmEnd] = useState(1);
  const [reminders, setReminders] = useState("24,2");

  const [lines, setLines] = useState<WaLine[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadingLines, setLoadingLines] = useState(true);

  const fetchLines = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_lines")
      .select("id, label, categorias, reminder_enabled, confirm_enabled, receipt_enabled")
      .order("created_at");

    if (!error && data) {
      setLines(data.map((row: any) => ({
        id: row.id,
        label: row.label,
        categorias: row.categorias || [],
        token: "",
        phoneId: "",
        reminderEnabled: row.reminder_enabled,
        confirmEnabled: row.confirm_enabled,
        receiptEnabled: row.receipt_enabled,
        configured: true,
        validationStatus: "idle" as const,
        testStatus: "idle" as const,
        testPhone: "",
      })));
    }
    setLoadingLines(false);
  }, []);

  useEffect(() => { fetchLines(); }, [fetchLines]);

  const updateLine = (id: string, patch: Partial<WaLine>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

  const removeLine = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      const { error } = await supabase.from("whatsapp_lines").delete().eq("id", id);
      if (error) { toast.error("Erro ao remover linha"); return; }
      toast.success("Linha removida");
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const toggleCategoria = (id: string, cat: string) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const has = l.categorias.includes(cat);
      return { ...l, categorias: has ? l.categorias.filter(c => c !== cat) : [...l.categorias, cat] };
    }));
  };

  const handleValidate = async (line: WaLine) => {
    if (!line.token.trim() || !line.phoneId.trim()) {
      toast.error("Preencha o Token e o Phone Number ID para validar");
      return;
    }
    updateLine(line.id, { validationStatus: "validating", validationMsg: "" });
    try {
      const { data, error } = await supabase.functions.invoke("save-whatsapp-config", {
        body: { action: "validate", access_token: line.token, phone_number_id: line.phoneId },
      });
      if (error) throw error;
      if (data.valid) {
        updateLine(line.id, {
          validationStatus: "valid",
          validationMsg: data.verified_name ? `✓ ${data.verified_name} (${data.phone_display})` : `✓ Número ${data.phone_display}`,
          phoneDisplay: data.phone_display,
        });
        toast.success("Credenciais válidas!");
      } else {
        updateLine(line.id, { validationStatus: "invalid", validationMsg: data.error || "Credenciais inválidas" });
        toast.error("Credenciais inválidas");
      }
    } catch (err: any) {
      updateLine(line.id, { validationStatus: "invalid", validationMsg: err.message || "Erro na validação" });
      toast.error("Erro ao validar credenciais");
    }
  };

  const handleTest = async (line: WaLine) => {
    if (!line.token.trim() || !line.phoneId.trim()) {
      toast.error("Preencha o Token e o Phone Number ID");
      return;
    }
    if (!line.testPhone?.trim()) {
      toast.error("Informe o número de teste (com DDD e código do país)");
      return;
    }
    updateLine(line.id, { testStatus: "sending", testMsg: "" });
    try {
      const { data, error } = await supabase.functions.invoke("save-whatsapp-config", {
        body: { action: "test", access_token: line.token, phone_number_id: line.phoneId, test_phone: line.testPhone },
      });
      if (error) throw error;
      if (data.sent) {
        updateLine(line.id, { testStatus: "sent", testMsg: "Mensagem de teste enviada com sucesso!" });
        toast.success("Mensagem de teste enviada!");
      } else {
        updateLine(line.id, { testStatus: "error", testMsg: data.error || "Erro ao enviar" });
        toast.error(data.error || "Erro ao enviar teste");
      }
    } catch (err: any) {
      updateLine(line.id, { testStatus: "error", testMsg: err.message || "Erro ao enviar teste" });
      toast.error("Erro ao enviar mensagem de teste");
    }
  };

  const handleSave = async (line: WaLine) => {
    if (!line.token.trim() || !line.phoneId.trim()) {
      toast.error("Preencha o Token e o Phone Number ID");
      return;
    }
    if (!line.label.trim()) {
      toast.error("Dê um nome para esta linha");
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
      updateLine(line.id, { configured: true, token: "", phoneId: "", isNew: false, validationStatus: "idle", testStatus: "idle" });
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

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="geral"><Settings className="h-4 w-4 mr-1.5" />Geral</TabsTrigger>
          <TabsTrigger value="personalizar"><Palette className="h-4 w-4 mr-1.5" />Personalizar</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
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
            Configure múltiplos números WhatsApp, cada um vinculado a categorias específicas.
          </p>

          {loadingLines ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : lines.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Nenhuma linha configurada. Clique em "Adicionar linha" para começar.
            </div>
          ) : null}

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
                <button onClick={() => removeLine(line.id, line.isNew)} className="text-destructive hover:text-destructive/80 p-1" title="Remover linha">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Nome da linha</label>
                <input type="text" value={line.label} onChange={e => updateLine(line.id, { label: e.target.value })}
                  placeholder="Ex: Recepção, Pilates" className={inputClass} />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Categorias atendidas</label>
                <div className="flex gap-2 mt-1">
                  {CATEGORIAS.map(cat => (
                    <button key={cat.value} type="button" onClick={() => toggleCategoria(line.id, cat.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        line.categorias.includes(cat.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Access Token (permanente)</label>
                <input type="password" value={line.token} onChange={e => updateLine(line.id, { token: e.target.value, validationStatus: "idle", testStatus: "idle" })}
                  placeholder={line.configured ? "••••••••••• (já salvo — preencha para atualizar)" : "Cole aqui o token"}
                  className={inputClass} />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Phone Number ID</label>
                <input type="text" value={line.phoneId} onChange={e => updateLine(line.id, { phoneId: e.target.value, validationStatus: "idle", testStatus: "idle" })}
                  placeholder={line.configured ? "••••••••••• (já salvo — preencha para atualizar)" : "ID do número"}
                  className={inputClass} />
              </div>

              {/* Validation & Test Section */}
              {(line.token.trim() && line.phoneId.trim()) && (
                <div className="border border-border rounded-lg p-3 space-y-3 bg-background">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verificação de credenciais</p>

                  {/* Validate button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleValidate(line)}
                      disabled={line.validationStatus === "validating"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {line.validationStatus === "validating" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      Validar credenciais
                    </button>
                    {line.validationStatus === "valid" && (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {line.validationMsg}
                      </span>
                    )}
                    {line.validationStatus === "invalid" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> {line.validationMsg}
                      </span>
                    )}
                  </div>

                  {/* Test message */}
                  {line.validationStatus === "valid" && (
                    <div className="space-y-2 pt-1 border-t border-border">
                      <p className="text-xs text-muted-foreground pt-2">Enviar mensagem de teste (opcional)</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={line.testPhone || ""}
                          onChange={e => updateLine(line.id, { testPhone: e.target.value, testStatus: "idle" })}
                          placeholder="5511999999999"
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        />
                        <button
                          onClick={() => handleTest(line)}
                          disabled={line.testStatus === "sending"}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/40 bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
                        >
                          {line.testStatus === "sending" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Enviar teste
                        </button>
                      </div>
                      {line.testStatus === "sent" && (
                        <p className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {line.testMsg}
                        </p>
                      )}
                      {line.testStatus === "error" && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> {line.testMsg}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagens</p>
                {[
                  { key: "reminderEnabled" as const, label: "Lembrete de agendamento" },
                  { key: "confirmEnabled" as const, label: "Confirmação de agendamento" },
                  { key: "receiptEnabled" as const, label: "Recibo / comprovante" },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={line[opt.key]}
                      onChange={e => updateLine(line.id, { [opt.key]: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-ring/30" />
                    {opt.label}
                  </label>
                ))}
              </div>

              <button onClick={() => handleSave(line)} disabled={savingId === line.id}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
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
              <li>Use os botões acima para <strong>validar</strong> e <strong>testar</strong> antes de salvar</li>
            </ol>
          </div>
        </div>

        <CategorySchedulesEditor />
        <HolidaysEditor />

        <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Salvar Configurações
        </button>

        {/* Landing Page Configuration */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Página de Agendamento Público
          </h2>
          <p className="text-xs text-muted-foreground">
            Personalize a landing page pública de agendamento (logo, cores, nome) e copie o link para compartilhar.
          </p>
          <LandingConfigEditor />
        </div>

        {/* Testimonials */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Depoimentos de Clientes
          </h2>
          <p className="text-xs text-muted-foreground">
            Adicione depoimentos para exibir na página de agendamento público.
          </p>
          <TestimonialsEditor />
        </div>
          </div>
        </TabsContent>

        <TabsContent value="personalizar">
          <div className="max-w-xl">
            <ThemeCustomizer />
          </div>
        </TabsContent>
      </Tabs>
    </GlobalLayout>
  );
}
