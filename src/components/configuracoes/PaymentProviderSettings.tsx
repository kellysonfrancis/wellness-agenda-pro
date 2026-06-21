import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react";

type ProviderRow = {
  id?: string;
  provider: "asaas" | "mercadopago";
  mode: "sandbox" | "production";
  is_active: boolean;
  has_api_key: boolean;
  has_webhook_secret: boolean;
};

export default function PaymentProviderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, ProviderRow>>({
    asaas: { provider: "asaas", mode: "sandbox", is_active: false, has_api_key: false, has_webhook_secret: false },
    mercadopago: { provider: "mercadopago", mode: "sandbox", is_active: false, has_api_key: false, has_webhook_secret: false },
  });
  const [drafts, setDrafts] = useState<Record<string, { api_key: string; webhook_secret: string }>>({
    asaas: { api_key: "", webhook_secret: "" },
    mercadopago: { api_key: "", webhook_secret: "" },
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("save-payment-config", { body: { action: "status" } });
    if (!error && data?.settings) {
      const next = { ...rows };
      data.settings.forEach((s: ProviderRow) => { next[s.provider] = s; });
      setRows(next);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async (provider: "asaas" | "mercadopago") => {
    setSaving(provider);
    const r = rows[provider];
    const d = drafts[provider];
    const { error, data } = await supabase.functions.invoke("save-payment-config", {
      body: {
        provider,
        mode: r.mode,
        is_active: r.is_active,
        api_key: d.api_key || (r.has_api_key ? "__keep__" : ""),
        webhook_secret: d.webhook_secret || (r.has_webhook_secret ? "__keep__" : null),
      },
    });
    setSaving(null);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao salvar");
      return;
    }
    toast.success("Configuração salva");
    setDrafts((p) => ({ ...p, [provider]: { api_key: "", webhook_secret: "" } }));
    load();
  };

  const input = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Configure Asaas ou Mercado Pago para cobrar planos recorrentes. Apenas um provedor pode estar ativo por vez.
        As chaves são armazenadas com segurança e nunca retornam ao navegador.
      </p>

      {(["asaas", "mercadopago"] as const).map((prov) => {
        const r = rows[prov];
        const d = drafts[prov];
        return (
          <div key={prov} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-semibold capitalize">{prov === "mercadopago" ? "Mercado Pago" : "Asaas"}</h3>
                {r.is_active && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Ativo</span>}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={r.is_active} onChange={(e) => setRows((p) => ({ ...p, [prov]: { ...p[prov], is_active: e.target.checked } }))} />
                Ativo
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Modo</label>
                <select className={input} value={r.mode} onChange={(e) => setRows((p) => ({ ...p, [prov]: { ...p[prov], mode: e.target.value as any } }))}>
                  <option value="sandbox">Sandbox</option>
                  <option value="production">Produção</option>
                </select>
              </div>
              <div className="flex items-end text-xs text-muted-foreground">
                {r.has_api_key ? "🔒 API key configurada" : "Sem API key"}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">API Key {r.has_api_key && <span className="ml-1">(deixe em branco para manter)</span>}</label>
              <input type="password" className={input} placeholder={r.has_api_key ? "••••••••" : "Cole sua API key"} value={d.api_key} onChange={(e) => setDrafts((p) => ({ ...p, [prov]: { ...p[prov], api_key: e.target.value } }))} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Webhook Secret {r.has_webhook_secret && <span className="ml-1">(deixe em branco para manter)</span>}</label>
              <input type="password" className={input} placeholder={r.has_webhook_secret ? "••••••••" : (prov === "asaas" ? "Token cadastrado no painel Asaas" : "Segredo HMAC do Mercado Pago")} value={d.webhook_secret} onChange={(e) => setDrafts((p) => ({ ...p, [prov]: { ...p[prov], webhook_secret: e.target.value } }))} />
            </div>

            <button onClick={() => save(prov)} disabled={saving === prov} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {saving === prov && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </button>
          </div>
        );
      })}
    </div>
  );
}