import GlobalLayout from "@/components/layout/GlobalLayout";
import { Settings } from "lucide-react";
import { useState } from "react";

export default function Configuracoes() {
  const [cancelHours, setCancelHours] = useState(12);
  const [confirmStart, setConfirmStart] = useState(48);
  const [confirmEnd, setConfirmEnd] = useState(1);
  const [reminders, setReminders] = useState("24,2");

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
          <p className="text-xs text-muted-foreground">Integrações WhatsApp devem ser configuradas via variáveis de ambiente (WHATSAPP_PROVIDER, WHATSAPP_API_KEY, etc.)</p>
        </div>

        <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Salvar Configurações
        </button>
      </div>
    </GlobalLayout>
  );
}
