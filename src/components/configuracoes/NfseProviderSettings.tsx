import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, CheckCircle2, Copy, ExternalLink, Wand2 } from "lucide-react";

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nfse-webhook`;

const GUIDE = {
  enotas: {
    name: "eNotas",
    apiKeyUrl: "https://app.enotas.com.br/",
    steps: [
      "Crie conta no eNotas e cadastre sua empresa (CNPJ, certificado A1 e credenciais da prefeitura).",
      "Em Integrações → API, copie sua API Key e o ID da Empresa.",
      "Cole abaixo, marque Ativo e salve.",
      "Em Webhooks do eNotas, cadastre a URL abaixo (eventos NFS-e). Use o secret abaixo no header x-webhook-token (ou query ?token=).",
      "Teste em homologação antes de mudar para produção.",
    ],
  },
  focus: {
    name: "Focus NFe",
    apiKeyUrl: "https://app.focusnfe.com.br/",
    steps: [
      "Crie conta no Focus NFe, cadastre a empresa e suba o certificado A1 + credenciais da prefeitura.",
      "Em API → Tokens, gere o Token de homologação (sandbox) e copie.",
      "Cole abaixo (Empresa ID = CNPJ do prestador), marque Ativo e salve.",
      "Em Webhooks, cadastre a URL abaixo. Use o secret no header x-webhook-token (ou query ?token=).",
      "Teste em homologação. Quando estiver tudo ok, gere o token de produção.",
    ],
  },
} as const;

type Row = {
  provider: "enotas" | "focus";
  mode: "sandbox" | "production";
  is_active: boolean;
  has_api_key: boolean;
  has_webhook_secret: boolean;
  empresa_id: string;
};

export default function NfseProviderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({
    enotas: { provider: "enotas", mode: "sandbox", is_active: false, has_api_key: false, has_webhook_secret: false, empresa_id: "" },
    focus: { provider: "focus", mode: "sandbox", is_active: false, has_api_key: false, has_webhook_secret: false, empresa_id: "" },
  });
  const [drafts, setDrafts] = useState<Record<string, { api_key: string; webhook_secret: string; empresa_id: string }>>({
    enotas: { api_key: "", webhook_secret: "", empresa_id: "" },
    focus: { api_key: "", webhook_secret: "", empresa_id: "" },
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("save-nfse-config", { body: { action: "status" } });
    if (data?.settings) {
      const next = { ...rows };
      data.settings.forEach((s: Row) => { next[s.provider] = s; });
      setRows(next);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async (provider: "enotas" | "focus") => {
    setSaving(provider);
    const r = rows[provider]; const d = drafts[provider];
    const { error, data } = await supabase.functions.invoke("save-nfse-config", {
      body: {
        provider, mode: r.mode, is_active: r.is_active,
        api_key: d.api_key || (r.has_api_key ? "__keep__" : ""),
        webhook_secret: d.webhook_secret || (r.has_webhook_secret ? "__keep__" : null),
        empresa_id: d.empresa_id || r.empresa_id || null,
      },
    });
    setSaving(null);
    if (error || data?.error) { toast.error(data?.error || error?.message || "Erro ao salvar"); return; }
    toast.success("Configuração salva");
    setDrafts((p) => ({ ...p, [provider]: { api_key: "", webhook_secret: "", empresa_id: "" } }));
    load();
  };

  const input = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";
  const copy = (txt: string, label = "Copiado") => navigator.clipboard.writeText(txt).then(() => toast.success(label));
  const genSecret = (prov: "enotas" | "focus") => {
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    const s = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    setDrafts((p) => ({ ...p, [prov]: { ...p[prov], webhook_secret: s } }));
    toast.success("Secret gerado — cadastre o mesmo valor no painel do provedor");
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Wand2 className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Passos para emitir NFS-e</p>
            <ol className="text-xs text-muted-foreground mt-1 list-decimal pl-4 space-y-0.5">
              <li>Crie conta no eNotas ou Focus NFe e cadastre sua empresa (CNPJ).</li>
              <li>Suba o certificado digital <b>A1</b> e as credenciais da prefeitura (NFS-e é municipal).</li>
              <li>Copie a API Key (e o ID da empresa, no eNotas) do painel.</li>
              <li>Cole abaixo, marque <b>Ativo</b> e salve.</li>
              <li>Cadastre a URL do webhook no painel do provedor, usando o mesmo secret.</li>
              <li>Teste em sandbox/homologação antes de trocar para produção.</li>
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

      {(["enotas", "focus"] as const).map((prov) => {
        const r = rows[prov]; const d = drafts[prov]; const g = GUIDE[prov];
        return (
          <div key={prov} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
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
                  <option value="sandbox">Sandbox / Homologação</option>
                  <option value="production">Produção</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{prov === "enotas" ? "ID da Empresa (eNotas)" : "CNPJ Prestador (Focus)"}</label>
                <input className={input} placeholder={r.empresa_id || "Identificador da empresa no provedor"} value={d.empresa_id} onChange={(e) => setDrafts((p) => ({ ...p, [prov]: { ...p[prov], empresa_id: e.target.value } }))} />
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
            </div>
          </div>
        );
      })}
    </div>
  );
}