import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, FileSignature, Download } from "lucide-react";
import { renderTemplate, getClientIp, downloadConsentPdf } from "@/lib/consents";

interface Template { id: string; categoria: string; titulo: string; conteudo: string; ativo: boolean }
interface Client { id: string; nome: string }
interface Signed { id: string; titulo: string; conteudo_assinado: string; assinante_nome: string; assinado_em: string; ip: string | null; user_agent: string | null; client_id: string; clients?: { nome: string } }

export default function ConsentTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [signed, setSigned] = useState<Signed[]>([]);
  const [form, setForm] = useState({ categoria: "pilates", titulo: "", conteudo: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [signOpen, setSignOpen] = useState<Template | null>(null);
  const [clientId, setClientId] = useState("");
  const [signerName, setSignerName] = useState("");
  const [agree, setAgree] = useState(false);

  async function load() {
    const [t, c, s] = await Promise.all([
      supabase.from("consent_templates").select("*").order("titulo"),
      supabase.from("clients").select("id, nome").order("nome"),
      supabase.from("signed_consents").select("*, clients(nome)").order("assinado_em", { ascending: false }).limit(50),
    ]);
    setTemplates((t.data as any) || []);
    setClients((c.data as any) || []);
    setSigned((s.data as any) || []);
  }
  useEffect(() => { load(); }, []);

  async function saveTemplate() {
    if (!form.titulo.trim() || !form.conteudo.trim()) return toast.error("Preencha título e conteúdo");
    const res = editing
      ? await supabase.from("consent_templates").update(form).eq("id", editing)
      : await supabase.from("consent_templates").insert(form);
    if (res.error) return toast.error(res.error.message);
    toast.success("Template salvo");
    setOpenForm(false); setEditing(null);
    setForm({ categoria: "pilates", titulo: "", conteudo: "" });
    load();
  }

  function openEdit(t: Template) {
    setEditing(t.id);
    setForm({ categoria: t.categoria, titulo: t.titulo, conteudo: t.conteudo });
    setOpenForm(true);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Excluir este template? Termos já assinados continuam preservados.")) return;
    const { error } = await supabase.from("consent_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function signNow() {
    if (!signOpen || !clientId || !signerName.trim() || !agree) {
      return toast.error("Selecione cliente, informe o nome e confirme a leitura");
    }
    const client = clients.find((c) => c.id === clientId);
    const conteudo = renderTemplate(signOpen.conteudo, {
      nome: signerName,
      data: new Date().toLocaleDateString("pt-BR"),
      cliente: client?.nome || signerName,
    });
    const ip = await getClientIp();
    const ua = navigator.userAgent;
    const assinado_em = new Date().toISOString();
    const { data, error } = await supabase.from("signed_consents").insert({
      client_id: clientId,
      template_id: signOpen.id,
      titulo: signOpen.titulo,
      conteudo_assinado: conteudo,
      assinante_nome: signerName,
      assinado_em,
      ip,
      user_agent: ua,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Termo assinado");
    downloadConsentPdf({ titulo: signOpen.titulo, conteudo, assinante: signerName, assinado_em, ip, user_agent: ua });
    setSignOpen(null); setClientId(""); setSignerName(""); setAgree(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Termos de Consentimento</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Templates editáveis com assinatura eletrônica</p>
        </div>
        <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) { setEditing(null); setForm({ categoria:"pilates",titulo:"",conteudo:"" }); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo template</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pilates">Pilates</SelectItem>
                      <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                      <SelectItem value="estetica">Estética</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              </div>
              <div>
                <Label>Conteúdo <span className="text-xs text-muted-foreground">(placeholders: {"{nome}"}, {"{data}"}, {"{cliente}"})</span></Label>
                <Textarea rows={12} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
              </div>
              <Button onClick={saveTemplate} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-card rounded-xl border border-border p-4 group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted"><FileText className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <h3 className="text-sm font-semibold">{t.titulo}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">{t.categoria}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.conteudo.slice(0, 140)}…</p>
            <div className="flex gap-2">
              <Button size="sm" variant="default" className="flex-1" onClick={() => setSignOpen(t)}><FileSignature className="w-3.5 h-3.5 mr-1" /> Assinar</Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Sign dialog */}
      <Dialog open={!!signOpen} onOpenChange={(o) => { if (!o) { setSignOpen(null); setClientId(""); setSignerName(""); setAgree(false); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{signOpen?.titulo}</DialogTitle></DialogHeader>
          {signOpen && (
            <div className="space-y-3">
              <div className="bg-muted/40 rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">
                {renderTemplate(signOpen.conteudo, { nome: signerName || "{nome}", data: new Date().toLocaleDateString("pt-BR"), cliente: clients.find((c)=>c.id===clientId)?.nome || "{cliente}" })}
              </div>
              <div><Label>Cliente</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); const c = clients.find((x)=>x.id===v); if (c && !signerName) setSignerName(c.nome); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nome do assinante</Label><Input value={signerName} onChange={(e) => setSignerName(e.target.value)} /></div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
                <span>Confirmo que li o termo acima e o aceito eletronicamente. Esta ação registra meu nome, data, IP e dispositivo como evidência.</span>
              </label>
              <Button onClick={signNow} className="w-full" disabled={!agree || !clientId || !signerName.trim()}>
                <FileSignature className="w-4 h-4 mr-1" /> Assinar e baixar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {signed.length > 0 && (
        <div className="pt-4">
          <h3 className="text-sm font-semibold mb-2">Últimas assinaturas</h3>
          <div className="bg-card rounded-xl border divide-y">
            {signed.map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{s.titulo}</div>
                  <div className="text-xs text-muted-foreground">{s.clients?.nome} • {s.assinante_nome} • {new Date(s.assinado_em).toLocaleString("pt-BR")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadConsentPdf({ titulo: s.titulo, conteudo: s.conteudo_assinado, assinante: s.assinante_nome, assinado_em: s.assinado_em, ip: s.ip, user_agent: s.user_agent })}>
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}