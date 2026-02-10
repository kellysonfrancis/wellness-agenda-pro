import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, DollarSign, X } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "appointment" | "payment";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => [n, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          const row = payload.new as any;
          const n: Notification = {
            id: `appt-${row.id}`,
            type: "appointment",
            title: "Novo agendamento",
            description: `Agendamento criado para ${new Date(row.inicio_em).toLocaleDateString("pt-BR")} às ${new Date(row.inicio_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
            timestamp: row.created_at,
            read: false,
          };
          addNotification(n);
          toast.info("Novo agendamento criado", { description: n.description });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload) => {
          const row = payload.new as any;
          const old = payload.old as any;
          if (row.status !== old.status) {
            const statusLabels: Record<string, string> = {
              confirmado: "confirmado",
              cancelado: "cancelado",
              faltou: "marcado como falta",
              concluido: "concluído",
              em_atendimento: "em atendimento",
            };
            const label = statusLabels[row.status] || row.status;
            const n: Notification = {
              id: `appt-upd-${row.id}-${Date.now()}`,
              type: "appointment",
              title: `Agendamento ${label}`,
              description: `Status alterado para "${label}"`,
              timestamp: row.updated_at || new Date().toISOString(),
              read: false,
            };
            addNotification(n);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payments" },
        (payload) => {
          const row = payload.new as any;
          const valor = Number(row.valor_pago).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const n: Notification = {
            id: `pay-${row.id}`,
            type: "payment",
            title: "Novo pagamento",
            description: `Pagamento de ${valor} registrado`,
            timestamp: row.created_at,
            read: false,
          };
          addNotification(n);
          toast.success("Pagamento registrado", { description: n.description });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotification]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h4 className="text-sm font-semibold">Notificações</h4>
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                    Marcar lidas
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Bell className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 border-b border-border last:border-0 flex gap-3 transition-colors ${
                      n.read ? "opacity-60" : "bg-primary/5"
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.type === "appointment" ? (
                        <Calendar className="h-4 w-4 text-primary" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(parseISO(n.timestamp), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
