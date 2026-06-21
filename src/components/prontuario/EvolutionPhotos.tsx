import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Send, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const SIGNED_TTL = 60 * 60; // 1h preview URLs in admin UI

interface PhotoRow {
  id: string;
  client_id: string;
  tipo: "antes" | "depois";
  path: string;
  consentimento: boolean;
  consentimento_redes: boolean;
  observacao: string | null;
  created_at: string;
}

export default function EvolutionPhotos({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<"antes" | "depois">("antes");
  const [observacao, setObservacao] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentRedes, setConsentRedes] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const { data: photos = [] } = useQuery({
    queryKey: ["evolution-photos", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("evolution_photos")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as PhotoRow[];
      const urls: Record<string, string> = {};
      for (const p of rows) {
        const { data: signed } = await supabase.storage.from("clinical-photos").createSignedUrl(p.path, SIGNED_TTL);
        if (signed?.signedUrl) urls[p.id] = signed.signedUrl;
      }
      setSignedUrls(urls);
      return rows;
    },
    enabled: !!clientId,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione uma foto");
      if (!consent) throw new Error("Consentimento obrigatório do cliente");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${clientId}/${tipo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("clinical-photos").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("evolution_photos").insert({
        client_id: clientId, tipo, path, consentimento: consent,
        consentimento_redes: consentRedes, observacao: observacao || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto adicionada");
      qc.invalidateQueries({ queryKey: ["evolution-photos", clientId] });
      setDialogOpen(false);
      setFile(null); setObservacao(""); setConsent(false); setConsentRedes(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePhoto = useMutation({
    mutationFn: async (p: PhotoRow) => {
      await supabase.storage.from("clinical-photos").remove([p.path]);
      const { error } = await (supabase as any).from("evolution_photos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto removida");
      qc.invalidateQueries({ queryKey: ["evolution-photos", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendToClient = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-evolution-link", {
        body: { client_id: clientId, send_whatsapp: true },
      });
      if (error) throw error;
      if (data?.whatsapp_sent === false) throw new Error("Não foi possível enviar via WhatsApp (verifique telefone/configuração)");
      return data;
    },
    onSuccess: () => toast.success("Evolução enviada ao cliente via WhatsApp"),
    onError: (e: Error) => toast.error(e.message),
  });

  // group antes/depois pairs by date
  const antes = photos.filter((p) => p.tipo === "antes");
  const depois = photos.filter((p) => p.tipo === "depois");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5" /> Dado sensível (LGPD) — bucket privado, links assinados
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => sendToClient.mutate()} disabled={sendToClient.isPending || photos.length === 0}>
            <Send className="h-4 w-4 mr-1" /> Enviar evolução ao cliente
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Camera className="h-4 w-4 mr-1" /> Nova foto
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          Nenhuma foto de evolução. Adicione fotos antes/depois com consentimento do cliente.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Column title="ANTES" items={antes} urls={signedUrls} onRemove={(p) => removePhoto.mutate(p)} />
          <Column title="DEPOIS" items={depois} urls={signedUrls} onRemove={(p) => removePhoto.mutate(p)} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova foto de evolução</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="antes">Antes</SelectItem>
                  <SelectItem value="depois">Depois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1" />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} className="mt-1" />
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={consent} onCheckedChange={(c) => setConsent(!!c)} className="mt-0.5" />
                <span><strong>Consentimento obrigatório:</strong> o cliente autorizou o registro fotográfico para fins clínicos.</span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={consentRedes} onCheckedChange={(c) => setConsentRedes(!!c)} className="mt-0.5" />
                <span className="text-muted-foreground">Autorizo uso anônimo em redes sociais (opcional)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => upload.mutate()} disabled={upload.isPending || !file || !consent}>
              <Upload className="h-4 w-4 mr-1" /> {upload.isPending ? "Enviando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Column({ title, items, urls, onRemove }: { title: string; items: PhotoRow[]; urls: Record<string, string>; onRemove: (p: PhotoRow) => void }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title} ({items.length})</h4>
      <div className="space-y-3">
        {items.length === 0 && <div className="text-xs text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center">Sem fotos</div>}
        {items.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {urls[p.id] ? (
              <img src={urls[p.id]} alt={`${title}`} className="w-full h-64 object-cover" />
            ) : (
              <div className="w-full h-64 bg-muted animate-pulse" />
            )}
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="text-xs">
                <p className="font-medium">{format(parseISO(p.created_at), "dd/MM/yyyy HH:mm")}</p>
                {p.observacao && <p className="text-muted-foreground">{p.observacao}</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Consent. clínico ✓ {p.consentimento_redes ? "· redes ✓" : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover foto?")) onRemove(p); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}