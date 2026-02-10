import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Save, Plus, Trash2 } from "lucide-react";

interface Pausa {
  inicio: number;
  fim: number;
}

interface CategorySchedule {
  id: string;
  categoria: string;
  dias_semana: number[];
  hora_inicio: number;
  hora_fim: number;
  pausas: Pausa[];
}

const DIAS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const CAT_LABELS: Record<string, string> = {
  pilates: "Pilates",
  fisioterapia: "Fisioterapia",
  estetica: "Estética",
};

const HORAS = Array.from({ length: 17 }, (_, i) => i + 5);

export default function CategorySchedulesEditor() {
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery<CategorySchedule[]>({
    queryKey: ["category-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_schedules")
        .select("id, categoria, dias_semana, hora_inicio, hora_fim, pausas")
        .order("categoria");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        pausas: Array.isArray(row.pausas) ? row.pausas : [],
      })) as CategorySchedule[];
    },
  });

  const [edits, setEdits] = useState<Record<string, Partial<CategorySchedule>>>({});

  const getVal = (sched: CategorySchedule) => ({
    ...sched,
    ...edits[sched.id],
    pausas: edits[sched.id]?.pausas ?? sched.pausas ?? [],
  });

  const setEdit = (id: string, patch: Partial<CategorySchedule>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleDay = (id: string, current: number[], day: number) => {
    const has = current.includes(day);
    setEdit(id, { dias_semana: has ? current.filter((d) => d !== day) : [...current, day].sort() });
  };

  const addPausa = (id: string, currentPausas: Pausa[]) => {
    setEdit(id, { pausas: [...currentPausas, { inicio: 12, fim: 13 }] });
  };

  const updatePausa = (id: string, currentPausas: Pausa[], idx: number, field: "inicio" | "fim", value: number) => {
    const updated = currentPausas.map((p, i) => i === idx ? { ...p, [field]: value } : p);
    setEdit(id, { pausas: updated });
  };

  const removePausa = (id: string, currentPausas: Pausa[], idx: number) => {
    setEdit(id, { pausas: currentPausas.filter((_, i) => i !== idx) });
  };

  const saveMutation = useMutation({
    mutationFn: async (sched: CategorySchedule) => {
      const vals = getVal(sched);
      const { error } = await supabase
        .from("category_schedules")
        .update({
          dias_semana: vals.dias_semana,
          hora_inicio: vals.hora_inicio,
          hora_fim: vals.hora_fim,
          pausas: vals.pausas as any,
        })
        .eq("id", sched.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-schedules"] });
      toast.success("Horários atualizados!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = (sched: CategorySchedule) => {
    const vals = getVal(sched);
    if (vals.hora_inicio >= vals.hora_fim) {
      toast.error("Hora de início deve ser menor que hora de fim");
      return;
    }
    for (const p of vals.pausas) {
      if (p.inicio >= p.fim) {
        toast.error("Início da pausa deve ser menor que o fim");
        return;
      }
      if (p.inicio < vals.hora_inicio || p.fim > vals.hora_fim) {
        toast.error("Pausa deve estar dentro do horário de atendimento");
        return;
      }
    }
    saveMutation.mutate(sched);
  };

  if (isLoading) return null;

  const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-5">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Horários de Atendimento por Categoria
      </h2>
      <p className="text-xs text-muted-foreground">
        Defina os dias, horários e pausas para cada categoria. Na agenda, os horários fora do intervalo ficam bloqueados ao filtrar por categoria.
      </p>

      {schedules.map((sched) => {
        const vals = getVal(sched);
        return (
          <div key={sched.id} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
            <span className="text-sm font-semibold">{CAT_LABELS[sched.categoria] || sched.categoria}</span>

            <div>
              <label className="text-xs text-muted-foreground">Dias da semana</label>
              <div className="flex gap-1.5 mt-1">
                {DIAS.map((dia) => (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDay(sched.id, vals.dias_semana, dia.value)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      vals.dias_semana.includes(dia.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Hora início</label>
                <select
                  value={vals.hora_inicio}
                  onChange={(e) => setEdit(sched.id, { hora_inicio: Number(e.target.value) })}
                  className={inputClass}
                >
                  {HORAS.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hora fim</label>
                <select
                  value={vals.hora_fim}
                  onChange={(e) => setEdit(sched.id, { hora_fim: Number(e.target.value) })}
                  className={inputClass}
                >
                  {HORAS.map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                  <option value={22}>22:00</option>
                </select>
              </div>
            </div>

            {/* Pausas / Breaks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Pausas / Intervalos</label>
                <button
                  type="button"
                  onClick={() => addPausa(sched.id, vals.pausas)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Adicionar pausa
                </button>
              </div>
              {vals.pausas.length === 0 && (
                <p className="text-xs text-muted-foreground/70 italic">Nenhuma pausa configurada</p>
              )}
              {vals.pausas.map((pausa, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">De</label>
                    <select
                      value={pausa.inicio}
                      onChange={(e) => updatePausa(sched.id, vals.pausas, idx, "inicio", Number(e.target.value))}
                      className={inputClass}
                    >
                      {HORAS.map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Até</label>
                    <select
                      value={pausa.fim}
                      onChange={(e) => updatePausa(sched.id, vals.pausas, idx, "fim", Number(e.target.value))}
                      className={inputClass}
                    >
                      {HORAS.map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                      <option value={22}>22:00</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePausa(sched.id, vals.pausas, idx)}
                    className="p-2 text-destructive hover:text-destructive/80 mb-0.5"
                    title="Remover pausa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSave(sched)}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </div>
        );
      })}
    </div>
  );
}
