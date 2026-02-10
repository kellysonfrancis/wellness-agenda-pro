import GlobalLayout from "@/components/layout/GlobalLayout";
import { Settings, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Configuracoes() {
  const [cancelHours, setCancelHours] = useState(12);
  const [confirmStart, setConfirmStart] = useState(48);
  const [confirmEnd, setConfirmEnd] = useState(1);
  const [reminders, setReminders] = useState("24,2");

  // WhatsApp Config
  const [waToken, setWaToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waReminderEnabled, setWaReminderEnabled] = useState(true);
  const [waConfirmEnabled, setWaConfirmEnabled] = useState(true);
  const [waReceiptEnabled, setWaReceiptEnabled] = useState(true);
  const [waStatus, setWaStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [waConfigured, setWaConfigured] = useState(false);

  useEffect(() => {
    // Check if WhatsApp secrets are already configured
    const saved = localStorage.getItem("wa_config");
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setWaReminderEnabled(cfg.reminder ?? true);
        setWaConfirmEnabled(cfg.confirm ?? true);
        setWaReceiptEnabled(cfg.receipt ?? true);
        setWaConfigured(cfg.configured ?? false);
      } catch {}
    }
  }, []);

  const handleSaveWhatsApp = async () => {
    if (!waToken.trim() || !waPhoneId.trim()) {
      toast.error("Preencha o Token de Acesso e o Phone Number ID");
      return;
    }
    setWaStatus("saving");
    try {
      // Store secrets via edge function
      const { error } = await supabase.functions.invoke("save-whatsapp-config", {
        body: {
          access_token: waToken,
          phone_number_id: waPhoneId,
          reminder_enabled: waReminderEnabled,
          confirm_enabled: waConfirmEnabled,
          receipt_enabled: waReceiptEnabled,
        },
      });
      if (error) throw error;
      localStorage.setItem("wa_config", JSON.stringify({
        reminder: waReminderEnabled,
        confirm: waConfirmEnabled,
        receipt: waReceiptEnabled,
        configured: true,
      }));
      setWaConfigured(true);
      setWaStatus("saved");
      setWaToken("");
      setWaPhoneId("");
      toast.success("Configuração do WhatsApp salva com sucesso!");
    } catch (err: any) {
      setWaStatus("error");
      toast.error("Erro ao salvar: " + (err.message || "tente novamente"));
    }
  };

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
            <input id="cancel-hours" type="number" value={cancelHours} onChange={e => setCancelHours(+e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">Confirmação do Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="confirm-start">Início (horas antes)</label>
              <input id="confirm-start" type="number" value={confirmStart} onChange={e => setConfirmStart(+e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="confirm-end">Fim (horas antes)</label>
              <input id="confirm-end" type="number" value={confirmEnd} onChange={e => setConfirmEnd(+e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">Lembretes WhatsApp</h2>
          <div>
            <label className="text-sm text-muted-foreground" htmlFor="reminders">Horas antes (separado por vírgula)</label>
            <input id="reminders" type="text" value={reminders} onChange={e => setReminders(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
        </div>

        {/* WhatsApp Business API Config */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              WhatsApp Business API (Meta)
            </h2>
            {waConfigured && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Configurado
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Conecte sua conta do Meta Cloud API para enviar lembretes, confirmações e recibos automaticamente pelo WhatsApp.
          </p>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="wa-token">Access Token (permanente)</label>
            <input
              id="wa-token"
              type="password"
              value={waToken}
              onChange={e => setWaToken(e.target.value)}
              placeholder={waConfigured ? "••••••••••• (já salvo)" : "Cole aqui o token de acesso"}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground" htmlFor="wa-phone-id">Phone Number ID</label>
            <input
              id="wa-phone-id"
              type="text"
              value={waPhoneId}
              onChange={e => setWaPhoneId(e.target.value)}
              placeholder={waConfigured ? "••••••••••• (já salvo)" : "ID do número no Meta Business Suite"}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipos de mensagem</p>
            {[
              { id: "wa-reminder", label: "Lembrete de agendamento", checked: waReminderEnabled, set: setWaReminderEnabled },
              { id: "wa-confirm", label: "Confirmação de agendamento", checked: waConfirmEnabled, set: setWaConfirmEnabled },
              { id: "wa-receipt", label: "Recibo / comprovante", checked: waReceiptEnabled, set: setWaReceiptEnabled },
            ].map(opt => (
              <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={opt.checked}
                  onChange={e => opt.set(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring/30"
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Acesse <strong>developers.facebook.com</strong> → Meus Apps</li>
              <li>Crie ou selecione um app com produto "WhatsApp"</li>
              <li>Em API Setup, copie o <strong>Access Token</strong> permanente</li>
              <li>Copie o <strong>Phone Number ID</strong> do número verificado</li>
            </ol>
          </div>

          <button
            onClick={handleSaveWhatsApp}
            disabled={waStatus === "saving"}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {waStatus === "saving" ? "Salvando..." : waConfigured ? "Atualizar Configuração" : "Salvar Configuração WhatsApp"}
          </button>
        </div>

        <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Salvar Configurações
        </button>
      </div>
    </GlobalLayout>
  );
}
