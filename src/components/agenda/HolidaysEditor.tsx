import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2, Save } from "lucide-react";
import { format } from "date-fns";

interface Holiday {
  id: string;
  data: string;
  descricao: string;
  recorrente: boolean;
}

export default function HolidaysEditor() {
  const queryClient = useQueryClient();

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("id, data, descricao, recorrente")
        .order("data");
      if (error) throw error;
      return data as Holiday[];
    },
  });

  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRecorrente, setNewRecorrente] = useState(false);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!newDate) throw new Error("Selecione uma data");
      const { error } = await supabase.from("holidays").insert({
        data: newDate,
        descricao: newDesc || "Feriado",
        recorrente: newRecorrente,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Essa data já está marcada como feriado");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      setNewDate("");
      setNewDesc("");
      setNewRecorrente(false);
      toast.success("Feriado adicionado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Feriado removido");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inputClass = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-5">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <CalendarOff className="h-4 w-4 text-primary" />
        Feriados e Dias Bloqueados
      </h2>
      <p className="text-xs text-muted-foreground">
        Marque datas como feriado para bloquear agendamentos. Feriados recorrentes se repetem todo ano.
      </p>

      {/* Add new holiday */}
      <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adicionar feriado</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Data</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Ex: Natal, Carnaval..."
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={newRecorrente}
            onChange={(e) => setNewRecorrente(e.target.checked)}
            className="rounded border-input text-primary focus:ring-ring/30"
          />
          Recorrente (repete todo ano)
        </label>
        <button
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !newDate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
      ) : holidays.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Nenhum feriado cadastrado
        </div>
      ) : (
        <div className="space-y-2">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-2.5 bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {format(new Date(h.data + "T12:00:00"), "dd/MM/yyyy")}
                </span>
                <span className="text-sm text-muted-foreground">{h.descricao}</span>
                {h.recorrente && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    Recorrente
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(h.id)}
                disabled={deleteMutation.isPending}
                className="text-destructive hover:text-destructive/80 p-1"
                title="Remover feriado"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
