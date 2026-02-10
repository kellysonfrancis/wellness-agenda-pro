import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Save, Loader2, Palette, Link2, Image, Type, Copy, Check } from "lucide-react";

interface LandingConfig {
  id: string;
  nome_clinica: string;
  subtitulo: string;
  logo_url: string | null;
  banner_url: string | null;
  cor_primaria: string;
  cor_fundo: string;
  cor_texto: string;
  link_instagram: string | null;
}

export default function LandingConfigEditor() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from("landing_config" as any)
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) setConfig(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const filePath = `${path}.${ext}`;
    const { error } = await supabase.storage
      .from("landing-assets")
      .upload(filePath, file, { upsert: true });
    if (error) {
      toast.error("Erro no upload: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("landing-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadFile(file, "logo");
    if (url && config) {
      setConfig({ ...config, logo_url: url });
    }
    setUploadingLogo(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    const url = await uploadFile(file, "banner");
    if (url && config) {
      setConfig({ ...config, banner_url: url });
    }
    setUploadingBanner(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("landing_config" as any)
      .update({
        nome_clinica: config.nome_clinica,
        subtitulo: config.subtitulo,
        logo_url: config.logo_url,
        banner_url: config.banner_url,
        cor_primaria: config.cor_primaria,
        cor_fundo: config.cor_fundo,
        cor_texto: config.cor_texto,
        link_instagram: config.link_instagram,
      } as any)
      .eq("id", config.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações da landing page salvas!");
    }
    setSaving(false);
  };

  const publicUrl = `${window.location.origin}/agendar-publico`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!config) return <p className="text-sm text-muted-foreground">Erro ao carregar configurações.</p>;

  return (
    <div className="space-y-5">
      {/* Link compartilhável */}
      <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
        <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Link2 className="h-4 w-4 text-primary" /> Link de agendamento público
        </label>
        <div className="flex gap-2">
          <input readOnly value={publicUrl} className={`${inputClass} bg-muted/50 text-xs`} />
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Compartilhe este link no Instagram (bio, stories, DMs).</p>
      </div>

      {/* Nome e subtítulo */}
      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted-foreground flex items-center gap-1"><Type className="h-3.5 w-3.5" /> Nome da clínica</label>
          <input value={config.nome_clinica} onChange={(e) => setConfig({ ...config, nome_clinica: e.target.value })}
            className={inputClass} maxLength={60} placeholder="Nome da clínica" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Subtítulo</label>
          <input value={config.subtitulo || ""} onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
            className={inputClass} maxLength={100} placeholder="Pilates · Fisioterapia · Estética" />
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><Image className="h-3.5 w-3.5" /> Logo</label>
        <div className="flex items-center gap-4">
          {config.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border bg-card p-1" />
          ) : (
            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
              <Image className="h-6 w-6" />
            </div>
          )}
          <div>
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
              {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploadingLogo ? "Enviando..." : "Enviar logo"}
            </button>
            {config.logo_url && (
              <button onClick={() => setConfig({ ...config, logo_url: null })} className="text-xs text-destructive hover:underline mt-1 block">
                Remover logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Banner */}
      <div>
        <label className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><Image className="h-3.5 w-3.5" /> Imagem de banner (opcional)</label>
        {config.banner_url ? (
          <div className="relative">
            <img src={config.banner_url} alt="Banner" className="w-full h-32 object-cover rounded-lg border border-border" />
            <button onClick={() => setConfig({ ...config, banner_url: null })}
              className="absolute top-2 right-2 px-2 py-1 rounded bg-destructive/90 text-destructive-foreground text-xs hover:bg-destructive">
              Remover
            </button>
          </div>
        ) : (
          <div>
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            <button onClick={() => bannerRef.current?.click()} disabled={uploadingBanner}
              className="w-full py-6 rounded-lg border-2 border-dashed border-border hover:border-primary/30 transition-colors text-muted-foreground text-sm flex flex-col items-center gap-1">
              {uploadingBanner ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {uploadingBanner ? "Enviando..." : "Clique para enviar banner"}
            </button>
          </div>
        )}
      </div>

      {/* Cores */}
      <div>
        <label className="text-sm text-muted-foreground flex items-center gap-1 mb-3"><Palette className="h-3.5 w-3.5" /> Cores</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Primária</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={config.cor_primaria} onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                className="h-9 w-12 rounded border border-input cursor-pointer" />
              <input value={config.cor_primaria} onChange={(e) => setConfig({ ...config, cor_primaria: e.target.value })}
                className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-mono" maxLength={7} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fundo</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={config.cor_fundo} onChange={(e) => setConfig({ ...config, cor_fundo: e.target.value })}
                className="h-9 w-12 rounded border border-input cursor-pointer" />
              <input value={config.cor_fundo} onChange={(e) => setConfig({ ...config, cor_fundo: e.target.value })}
                className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-mono" maxLength={7} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Texto</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={config.cor_texto} onChange={(e) => setConfig({ ...config, cor_texto: e.target.value })}
                className="h-9 w-12 rounded border border-input cursor-pointer" />
              <input value={config.cor_texto} onChange={(e) => setConfig({ ...config, cor_texto: e.target.value })}
                className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-mono" maxLength={7} />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-border overflow-hidden">
        <p className="text-xs text-muted-foreground px-3 py-2 bg-muted/50">Pré-visualização</p>
        <div style={{ backgroundColor: config.cor_fundo }}>
          <div style={{ backgroundColor: config.cor_primaria }} className="py-6 px-4 text-center">
            {config.banner_url && (
              <img src={config.banner_url} alt="" className="w-full h-24 object-cover absolute inset-0 opacity-20" style={{ position: "relative" }} />
            )}
            {config.logo_url && (
              <img src={config.logo_url} alt="Logo" className="h-12 mx-auto mb-2 object-contain" />
            )}
            <h3 className="text-lg font-bold" style={{ color: "#fff" }}>{config.nome_clinica}</h3>
            <p className="text-xs opacity-80" style={{ color: "#fff" }}>{config.subtitulo}</p>
          </div>
          <div className="p-4 text-center" style={{ color: config.cor_texto }}>
            <p className="text-sm">Escolha o serviço, profissional, data e horário...</p>
          </div>
        </div>
      </div>

      {/* Link Instagram */}
      <div>
        <label className="text-sm text-muted-foreground">Link Instagram (opcional)</label>
        <input value={config.link_instagram || ""} onChange={(e) => setConfig({ ...config, link_instagram: e.target.value })}
          className={inputClass} maxLength={255} placeholder="https://instagram.com/suaclinica" />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar Configurações
      </button>
    </div>
  );
}
