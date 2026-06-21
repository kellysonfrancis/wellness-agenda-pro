import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

type Assessment = {
  id: string;
  data: string;
  peso: number | null;
  altura: number | null;
  medidas: Record<string, number> | null;
  observacoes: string | null;
};

const MEDIDAS_KEYS = [
  { k: "cintura", label: "Cintura" },
  { k: "quadril", label: "Quadril" },
  { k: "abdomen", label: "Abdômen" },
  { k: "torax", label: "Tórax" },
  { k: "braco", label: "Braço" },
  { k: "coxa", label: "Coxa" },
];

export default function PhysicalAssessments({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Assessment[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    data: new Date().toISOString().slice(0, 10),
    peso: "", altura: "", observacoes: "",
    medidas: {} as Record<string, string>,
  });

  const load = async () => {
    const { data } = await (supabase as any)
      .from("physical_assessments")
      .select("*")
      .eq("client_id", clientId)
      .order("data", { ascending: false });
    setItems((data || []) as Assessment[]);
  };

  useEffect(() => { if (clientId) load(); }, [clientId]);

  const save = async () => {
    setSaving(true);
    const medidas: Record<string, number> = {};
    for (const k of Object.keys(form.medidas || {})) {
      const v = parseFloat(form.medidas[k]);
      if (!isNaN(v)) medidas[k] = v;
    }
    const payload = {
      client_id: clientId,
      data: form.data,
      peso: form.peso ? parseFloat(form.peso) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
      medidas: Object.keys(medidas).length ? medidas : null,
      observacoes: form.observacoes || null,
    };
    const { error } = await (supabase as any).from("physical_assessments").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Avaliação salva!");
    setOpen(false);
    setForm({ data: new Date().toISOString().slice(0, 10), peso: "", altura: "", observacoes: "", medidas: {} });
    load();
  };

  const chartData = [...items].reverse().map((a) => ({
    data: format(parseISO(a.data), "dd/MM"),
    peso: a.peso,
    cintura: a.medidas?.cintura,
    quadril: a.medidas?.quadril,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Avaliação Física</h3>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova avaliação</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8 bg-card border border-border rounded-xl">
          Sem avaliações registradas.
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Evolução</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(170 15% 88%)" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="hsl(205 80% 50%)" />
                <Line type="monotone" dataKey="cintura" name="Cintura (cm)" stroke="hsl(0 72% 51%)" />
                <Line type="monotone" dataKey="quadril" name="Quadril (cm)" stroke="hsl(152 60% 40%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{format(parseISO(a.data), "dd/MM/yyyy")}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.peso ? `${a.peso} kg` : ""} {a.altura ? `· ${a.altura} m` : ""}
                  </span>
                </div>
                {a.medidas && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {Object.entries(a.medidas).map(([k, v]) => (
                      <span key={k}><b className="capitalize">{k}:</b> {v} cm</span>
                    ))}
                  </div>
                )}
                {a.observacoes && <p className="text-xs mt-1 text-muted-foreground">{a.observacoes}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-xl border border-border shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Nova avaliação física</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div><Label className="text-xs">Peso (kg)</Label><Input type="number" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></div>
                <div><Label className="text-xs">Altura (m)</Label><Input type="number" step="0.01" value={form.altura} onChange={(e) => setForm({ ...form, altura: e.target.value })} /></div>
              </div>
              <div>
                <Label className="text-xs">Medidas (cm)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {MEDIDAS_KEYS.map((m) => (
                    <div key={m.k} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground">{m.label}</span>
                      <Input type="number" step="0.1" value={form.medidas[m.k] || ""} onChange={(e) => setForm({ ...form, medidas: { ...form.medidas, [m.k]: e.target.value } })} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Salvando..." : "Salvar"}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}