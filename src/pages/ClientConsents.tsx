import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, FileSignature, Download } from "lucide-react";
import { renderTemplate, getClientIp, downloadConsentPdf } from "@/lib/consents";

interface Template { id: string; categoria: string; titulo: string; conteudo: string }
interface Signed { id: string; titulo: string; conteudo_assinado: string; assinante_nome: string; assinado_em: string; ip: string | null; user_agent: string | null; template_id: string | null }

export default function ClientConsents() {
  const { profile } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signed, setSigned] = useState<Signed[]>([]);
  const [open, setOpen] = useState<Template | null>(null);
  const [signerName, setSignerName] = useState(profile?.nome || "");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: c } = await supabase.from("clients").select("id").eq("user_id", u.user.id).maybeSingle();
      if (c) setClientId(c.id);
      const { data: t } = await supabase.from("consent_templates").select("*").eq("ativo", true).order("titulo");
      setTemplates((t as any) || []);
      if (c) {
        const { data: s } = await supabase.from("signed_consents").select("*").eq("client_id", c.id).order("assinado_em", { ascending: false });
        setSigned((s as any) || []);
      }
    })();
  }, [profile?.nome]);

  const signedIds = new Set(signed.map((s) => s.template_id));

  async function signNow() {
    if (!open || !clientId || !signerName.trim() || !agree) return toast.error("Confirme a leitura e informe seu nome");
    const conteudo = renderTemplate(open.conteudo, { nome: signerName, data: new Date().toLocaleDateString("pt-BR"), cliente: signerName });
    const ip = await getClientIp();
    const ua = navigator.userAgent;
    const assinado_em = new Date().toISOString();
    const { error } = await supabase.from("signed_consents").insert({
      client_id: clientId, template_id: open.id, titulo: open.titulo,
      conteudo_assinado: conteudo, assinante_nome: signerName, assinado_em, ip, user_agent: ua,
    });
    if (error) return toast.error(error.message);
    downloadConsentPdf({ titulo: open.titulo, conteudo, assinante: signerName, assinado_em, ip, user_agent: ua });
    toast.success("Termo assinado");
    setOpen(null); setAgree(false);
    const { data: s } = await supabase.from("signed_consents").select("*").eq("client_id", clientId).order("assinado_em", { ascending: false });
    setSigned((s as any) || []);
  }

  return (
    <GlobalLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Meus Termos</h1>

        <div>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Termos disponíveis</h2>
          <div className="space-y-2">
            {templates.length === 0 && <div className="text-sm text-muted-foreground">Nenhum termo disponível.</div>}
            {templates.map((t) => {
              const ja = signedIds.has(t.id);
              return (
                <div key={t.id} className="bg-card border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{t.titulo}</div>
                    <div className="text-xs text-muted-foreground capitalize">{t.categoria}{ja ? " • já assinado" : ""}</div>
                  </div>
                  <Button size="sm" variant={ja ? "outline" : "default"} onClick={() => setOpen(t)}>
                    <FileSignature className="w-3.5 h-3.5 mr-1" /> {ja ? "Reassinar" : "Ler e assinar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Termos assinados</h2>
          <div className="bg-card border rounded-lg divide-y">
            {signed.length === 0 && <div className="p-3 text-sm text-muted-foreground">Você ainda não assinou nenhum termo.</div>}
            {signed.map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{s.titulo}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.assinado_em).toLocaleString("pt-BR")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadConsentPdf({ titulo: s.titulo, conteudo: s.conteudo_assinado, assinante: s.assinante_nome, assinado_em: s.assinado_em, ip: s.ip, user_agent: s.user_agent })}>
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Dialog open={!!open} onOpenChange={(o) => { if (!o) { setOpen(null); setAgree(false); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{open?.titulo}</DialogTitle></DialogHeader>
            {open && (
              <div className="space-y-3">
                <div className="bg-muted/40 rounded p-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm">
                  {renderTemplate(open.conteudo, { nome: signerName || "{nome}", data: new Date().toLocaleDateString("pt-BR"), cliente: signerName || "{cliente}" })}
                </div>
                <div>
                  <label className="text-sm">Seu nome completo</label>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                  <span>Li e aceito o termo acima. Ao assinar, registro meu nome, data, IP e dispositivo como evidência da aceitação.</span>
                </label>
                <Button onClick={signNow} className="w-full" disabled={!agree || !signerName.trim()}>
                  <FileSignature className="w-4 h-4 mr-1" /> Assinar e baixar PDF
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </GlobalLayout>
  );
}