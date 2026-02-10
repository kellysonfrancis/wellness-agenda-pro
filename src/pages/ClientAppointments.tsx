import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import GlobalLayout from "@/components/layout/GlobalLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarCheck, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  reservado: "Reservado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  faltou: "Falta",
  cancelado: "Cancelado",
};

const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  reservado: "secondary",
  confirmado: "default",
  em_atendimento: "default",
  concluido: "outline",
  faltou: "destructive",
  cancelado: "destructive",
};

export default function ClientAppointments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Get client record linked to this user's email
  const { data: client } = useQuery({
    queryKey: ["my-client-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("email", user?.email || "")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["my-appointments", client?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, inicio_em, fim_em, status, observacoes, services(nome, categoria), professionals(nome_exibicao)")
        .eq("client_id", client!.id)
        .order("inicio_em", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelado" as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      setCancelId(null);
      toast.success("Agendamento cancelado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const now = new Date();
  const future = useMemo(() => appointments.filter((a: any) => new Date(a.inicio_em) >= now && a.status !== "cancelado"), [appointments]);
  const past = useMemo(() => appointments.filter((a: any) => new Date(a.inicio_em) < now || a.status === "cancelado"), [appointments]);

  return (
    <GlobalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-primary" /> Meus Agendamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Veja seus próximos atendimentos e histórico</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : !client ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum cadastro de cliente encontrado para seu email.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Próximos */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
              <Clock className="h-4 w-4" /> Próximos ({future.length})
            </h2>
            {future.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground text-center">
                Nenhum agendamento futuro.
              </div>
            ) : (
              <div className="space-y-3">
                {future.map((a: any) => (
                  <div key={a.id} className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{(a.services as any)?.nome || "Serviço"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.inicio_em).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(a.inicio_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {(a.professionals as any)?.nome_exibicao || "Profissional"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{(a.services as any)?.categoria}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadge[a.status] || "secondary"}>
                        {statusLabel[a.status] || a.status}
                      </Badge>
                      {(a.status === "reservado" || a.status === "confirmado") && (
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancelId(a.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anteriores */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Histórico ({past.length})
            </h2>
            {past.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-5 text-sm text-muted-foreground text-center">
                Nenhum agendamento anterior.
              </div>
            ) : (
              <div className="space-y-3">
                {past.map((a: any) => (
                  <div key={a.id} className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-70">
                    <div>
                      <p className="text-sm font-medium">{(a.services as any)?.nome || "Serviço"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.inicio_em).toLocaleDateString("pt-BR")} · {(a.professionals as any)?.nome_exibicao}
                      </p>
                    </div>
                    <Badge variant={statusBadge[a.status] || "secondary"}>
                      {statusLabel[a.status] || a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja cancelar este agendamento? Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button>
            <Button variant="destructive" onClick={() => cancelId && cancelMutation.mutate(cancelId)} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlobalLayout>
  );
}
