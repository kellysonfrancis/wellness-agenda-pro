import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SidebarBadges {
  [path: string]: number;
}

export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges>({});

  const fetchCounts = async () => {
    const results: SidebarBadges = {};

    // Lista de espera aguardando
    const { count: waitlistCount } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando");
    if (waitlistCount) results["/lista-espera"] = waitlistCount;

    // Inadimplência (pagamentos pendentes)
    const { count: inadCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    if (inadCount) results["/inadimplencia"] = inadCount;

    // Despesas não pagas
    const { count: despesasCount } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("pago", false);
    if (despesasCount) results["/despesas"] = despesasCount;

    // Agendamentos de hoje pendentes de confirmação
    const today = new Date().toISOString().slice(0, 10);
    const { count: agendaCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "reservado")
      .gte("inicio_em", `${today}T00:00:00`)
      .lte("inicio_em", `${today}T23:59:59`);
    if (agendaCount) results["/agenda"] = agendaCount;

    setBadges(results);
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return badges;
}
