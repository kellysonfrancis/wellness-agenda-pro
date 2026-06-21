import { useState } from "react";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, AlertTriangle, Send, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Insights() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"resumo" | "alerta_abandono">("alerta_abandono");
  const [running, setRunning] = useState(false);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["clinical-insights", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_insights")
        .select("id, client_id, tipo, conteudo, gerado_em, clients(nome, telefone)")
        .eq("tipo", tab)
        .order("gerado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const runNow = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("check-abandonment", { body: {} });
    setRunning(false);
    if (error) { toast.error("Erro ao executar"); return; }
    toast.success("Execução concluída");
    qc.invalidateQueries({ queryKey: ["clinical-insights"] });
  };

  const sendReminder = useMutation({
    mutationFn: async (row: any) => {
      const phone = row.clients?.telefone;
      if (!phone) throw new Error("Cliente sem telefone");
      const text = `Olá ${row.clients?.nome?.split(" ")[0] || ""}! Sentimos sua falta na clínica 💙 Que tal agendar sua próxima sessão? Estamos à disposição.`;
      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: { tipo: "notificacao", phone, mensagem: text, categoria: "pilates" },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Mensagem enviada!"),
    onError: (e: any) => toast.error(e.message || "Erro ao enviar"),
  });

  return (
    <GlobalLayout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> Insights Clínicos</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumos de IA e alertas automáticos de abandono</p>
        </div>
        <button onClick={runNow} disabled={running} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Executar agora
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("alerta_abandono")} className={`px-3 py-1.5 rounded-lg text-sm border ${tab === "alerta_abandono" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
          <AlertTriangle className="h-3.5 w-3.5 inline mr-1" /> Alertas de Abandono
        </button>
        <button onClick={() => setTab("resumo")} className={`px-3 py-1.5 rounded-lg text-sm border ${tab === "resumo" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
          <Brain className="h-3.5 w-3.5 inline mr-1" /> Resumos IA
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando…</div>
      ) : insights.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          Nenhum {tab === "resumo" ? "resumo" : "alerta"} gerado ainda. Clique em "Executar agora" ou aguarde a rotina semanal.
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((row: any) => (
            <div key={row.id} className={`bg-card rounded-xl border shadow-sm p-4 ${row.tipo === "alerta_abandono" ? "border-amber-500/40" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{row.clients?.nome || "Cliente"}</span>
                    <span className="text-xs text-muted-foreground">· {new Date(row.gerado_em).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{row.conteudo}</p>
                </div>
                {row.tipo === "alerta_abandono" && row.clients?.telefone && (
                  <button
                    onClick={() => sendReminder.mutate(row)}
                    disabled={sendReminder.isPending}
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs inline-flex items-center gap-1.5"
                  >
                    <Send className="h-3 w-3" /> Enviar lembrete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlobalLayout>
  );
}