import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, CheckCircle2, Copy, ExternalLink, Wand2, FlaskConical } from "lucide-react";

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/payment-webhook`;

const GUIDE = {
  asaas: {
    name: "Asaas",
    apiKeyUrl: "https://www.asaas.com/config/integrations",
    webhookUrl: "https://www.asaas.com/customerWebhook/index",
    steps: [
      "Entre no painel do Asaas em modo Sandbox (sandbox.asaas.com) ou Produção.",
      "Vá em Configurações → Integrações → Chave de API e copie sua API Key.",
      "Cole a API Key abaixo e defina um Webhook Secret (qualquer texto forte) — use o botão Gerar.",
      "Salve. Depois cadastre o Webhook no Asaas em Configurações → Webhooks com a URL abaixo e o mesmo Webhook Secret como token.",
      "Verifique se PIX e (se for o caso) Pix Automático estão habilitados na sua conta.",
    ],
  },
  mercadopago: {
    name: "Mercado Pago",
    apiKeyUrl: "https://www.mercadopago.com.br/developers/panel/app",
    webhookUrl: "https://www.mercadopago.com.br/developers/panel/app",
    steps: [
      "Acesse Mercado Pago → Suas integrações e abra (ou crie) sua aplicação.",
      "Em Credenciais, copie o Access Token (Teste para sandbox, Produção quando for live).",
      "Cole o Access Token na API Key abaixo e defina um Webhook Secret (use Gerar).",
      "Salve. Em Webhooks da sua aplicação, cadastre a URL abaixo, marque o evento 'payment' e cole o mesmo segredo em 'Assinatura secreta'.",
      "Confirme as taxas e se o Pix Automático está liberado para o seu CNPJ.",
    ],
  },
} as const;

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

  const copy = (txt: string, label = "Copiado") => {
    navigator.clipboard.writeText(txt).then(() => toast.success(label));
  };

  const genSecret = (prov: "asaas" | "mercadopago") => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    setDrafts((p) => ({ ...p, [prov]: { ...p[prov], webhook_secret: secret } }));
    toast.success("Webhook secret gerado — lembre de cadastrá-lo no painel do provedor");
  };

  const testConnection = async (prov: "asaas" | "mercadopago") => {
    const r = rows[prov];
    if (!r.has_api_key) { toast.error("Salve a API key primeiro"); return; }
    if (!r.is_active) { toast.error("Ative o provedor antes de testar"); return; }
    toast.message("Para testar de verdade: crie uma assinatura em sandbox via Venda Rápida com um plano recorrente e confirme o pagamento pelo link gerado.");
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Wand2 className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Como configurar (resumo prático)</p>
            <ol className="text-xs text-muted-foreground mt-1 list-decimal pl-4 space-y-0.5">
              <li>Escolha um provedor abaixo e comece em <b>Sandbox</b>.</li>
              <li>Cole a API Key do painel do provedor.</li>
              <li>Clique <b>Gerar</b> no Webhook Secret e copie o valor.</li>
              <li>Marque <b>Ativo</b> e salve.</li>
              <li>Copie a <b>URL do Webhook</b> abaixo e cadastre no painel do provedor (usando o mesmo secret).</li>
              <li>Teste com um cliente em Venda Rápida (plano recorrente → "Cobrar via assinatura").</li>
              <li>Quando estiver tudo ok, troque o modo para <b>Produção</b> e atualize as chaves.</li>
            </ol>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">URL do Webhook (cadastre no painel do provedor)</label>
          <div className="flex gap-2 mt-1">
            <input readOnly value={WEBHOOK_URL} className={input + " font-mono text-xs"} />
            <button onClick={() => copy(WEBHOOK_URL, "URL copiada")} className="px-3 rounded-lg border border-border hover:bg-muted text-sm inline-flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          </div>
        </div>
      </div>

      {(["asaas", "mercadopago"] as const).map((prov) => {
        const r = rows[prov];
        const d = drafts[prov];
        const g = GUIDE[prov];
        return (
          <div key={prov} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{g.name}</h3>
                {r.is_active && <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Ativo</span>}
                <a href={g.apiKeyUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Abrir painel <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={r.is_active} onChange={(e) => setRows((p) => ({ ...p, [prov]: { ...p[prov], is_active: e.target.checked } }))} />
                Ativo
              </label>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Passo-a-passo do {g.name}</summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1 text-muted-foreground">
                {g.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </details>

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
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Webhook Secret {r.has_webhook_secret && <span className="ml-1">(deixe em branco para manter)</span>}</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => genSecret(prov)} className="text-xs text-primary hover:underline">Gerar</button>
                  {d.webhook_secret && (
                    <button type="button" onClick={() => copy(d.webhook_secret, "Secret copiado")} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  )}
                </div>
              </div>
              <input type="text" className={input + " font-mono text-xs"} placeholder={r.has_webhook_secret ? "••••••••" : "Gere ou cole um segredo forte"} value={d.webhook_secret} onChange={(e) => setDrafts((p) => ({ ...p, [prov]: { ...p[prov], webhook_secret: e.target.value } }))} />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => save(prov)} disabled={saving === prov} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
                {saving === prov && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
              <button onClick={() => testConnection(prov)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm inline-flex items-center gap-2">
                <FlaskConical className="h-4 w-4" /> Como testar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}