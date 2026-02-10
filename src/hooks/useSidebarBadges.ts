import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SidebarBadges {
  [path: string]: number;
}

export function useSidebarBadges() {
  const [badges, setBadges] = useState<SidebarBadges>({});
  const [changedPaths, setChangedPaths] = useState<Set<string>>(new Set());
  const prevRef = useRef<SidebarBadges>({});

  const fetchCounts = useCallback(async () => {
    const results: SidebarBadges = {};

    const { count: waitlistCount } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando");
    if (waitlistCount) results["/lista-espera"] = waitlistCount;

    const { count: inadCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    if (inadCount) results["/inadimplencia"] = inadCount;

    const { count: despesasCount } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("pago", false);
    if (despesasCount) results["/despesas"] = despesasCount;

    const today = new Date().toISOString().slice(0, 10);
    const { count: agendaCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "reservado")
      .gte("inicio_em", `${today}T00:00:00`)
      .lte("inicio_em", `${today}T23:59:59`);
    if (agendaCount) results["/agenda"] = agendaCount;

    // Detect which paths changed
    const prev = prevRef.current;
    const changed = new Set<string>();
    const allPaths = new Set([...Object.keys(prev), ...Object.keys(results)]);
    allPaths.forEach((p) => {
      if ((prev[p] || 0) !== (results[p] || 0)) changed.add(p);
    });

    prevRef.current = results;
    setBadges(results);

    if (changed.size > 0) {
      setChangedPaths(changed);
      // Clear pulse after animation duration
      setTimeout(() => setChangedPaths(new Set()), 1500);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return { badges, changedPaths };
}
