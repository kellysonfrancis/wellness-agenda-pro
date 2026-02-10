import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Star, Save, GripVertical } from "lucide-react";

interface Testimonial {
  id: string;
  nome: string;
  depoimento: string;
  avaliacao: number;
  ativo: boolean;
  ordem: number;
  isNew?: boolean;
}

export default function TestimonialsEditor() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("landing_testimonials" as any)
      .select("*")
      .order("ordem");
    if (data) setItems((data as any[]).map(d => ({ ...d, isNew: false })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      nome: "",
      depoimento: "",
      avaliacao: 5,
      ativo: true,
      ordem: prev.length,
      isNew: true,
    }]);
  };

  const update = (id: string, patch: Partial<Testimonial>) =>
    setItems(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const remove = async (item: Testimonial) => {
    if (!item.isNew) {
      const { error } = await supabase.from("landing_testimonials" as any).delete().eq("id", item.id);
      if (error) { toast.error("Erro ao remover"); return; }
    }
    setItems(prev => prev.filter(t => t.id !== item.id));
    toast.success("Depoimento removido");
  };

  const handleSaveAll = async () => {
    const valid = items.filter(t => t.nome.trim() && t.depoimento.trim());
    if (valid.length === 0 && items.length > 0) {
      toast.error("Preencha nome e depoimento");
      return;
    }
    setSaving(true);

    for (const item of valid) {
      const payload = {
        nome: item.nome.trim(),
        depoimento: item.depoimento.trim(),
        avaliacao: item.avaliacao,
        ativo: item.ativo,
        ordem: item.ordem,
      } as any;

      if (item.isNew) {
        const { error } = await supabase.from("landing_testimonials" as any).insert({ ...payload, id: item.id });
        if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
      } else {
        const { error } = await supabase.from("landing_testimonials" as any).update(payload).eq("id", item.id);
        if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
      }
    }

    toast.success("Depoimentos salvos!");
    setSaving(false);
    fetchItems();
  };

  const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Nenhum depoimento cadastrado.
        </div>
      ) : (
        items.map((item, idx) => (
          <div key={item.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <GripVertical className="h-3 w-3" /> Depoimento {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={item.ativo} onChange={(e) => update(item.id, { ativo: e.target.checked })}
                    className="rounded border-input" />
                  Ativo
                </label>
                <button onClick={() => remove(item)} className="text-destructive hover:text-destructive/80 p-1" title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Nome do cliente</label>
              <input value={item.nome} onChange={(e) => update(item.id, { nome: e.target.value })}
                className={inputClass} maxLength={60} placeholder="Maria Silva" />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Depoimento</label>
              <textarea value={item.depoimento} onChange={(e) => update(item.id, { depoimento: e.target.value })}
                className={`${inputClass} min-h-[60px]`} maxLength={300} placeholder="Excelente atendimento, recomendo!" />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Avaliação</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => update(item.id, { avaliacao: star })}>
                    <Star className={`h-5 w-5 transition-colors ${star <= item.avaliacao ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))
      )}

      <button onClick={addItem}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        <Plus className="h-3.5 w-3.5" /> Adicionar depoimento
      </button>

      {items.length > 0 && (
        <button onClick={handleSaveAll} disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Depoimentos
        </button>
      )}
    </div>
  );
}
