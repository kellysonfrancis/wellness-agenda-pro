import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DBEntitlement {
  id: string;
  client_id: string;
  product_plan_id: string;
  status: string;
  saldo_creditos: number | null;
  inicio_em: string;
  expira_em: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface DBPlan {
  id: string;
  tipo: string;
  nome: string;
  categoria: string;
  preco: number;
  validade_dias: number | null;
  creditos_total: number | null;
  frequencia_pilates: string | null;
  vigencia_meses: number | null;
  aulas_por_mes: number | null;
  ilimitado: boolean;
  ativo: boolean;
}

export interface DBMakeupClass {
  id: string;
  entitlement_id: string;
  client_id: string;
  original_appointment_id: string;
  makeup_appointment_id: string | null;
  prazo_limite: string;
  status: string;
  created_at: string;
}

export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<DBEntitlement[]>([]);
  const [plans, setPlans] = useState<DBPlan[]>([]);
  const [makeupClasses, setMakeupClasses] = useState<DBMakeupClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [entRes, planRes, makeupRes] = await Promise.all([
      supabase.from("client_entitlements").select("*").order("created_at", { ascending: false }),
      supabase.from("product_plans").select("*").eq("ativo", true).order("nome"),
      supabase.from("makeup_classes").select("*").order("created_at", { ascending: false }),
    ]);
    if (entRes.data) setEntitlements(entRes.data as DBEntitlement[]);
    if (planRes.data) setPlans(planRes.data as DBPlan[]);
    if (makeupRes.data) setMakeupClasses(makeupRes.data as DBMakeupClass[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createEntitlement = useCallback(async (data: {
    client_id: string;
    product_plan_id: string;
    saldo_creditos?: number;
    inicio_em?: string;
    expira_em?: string | null;
    observacoes?: string;
  }) => {
    const { data: result, error } = await supabase
      .from("client_entitlements")
      .insert(data as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar vínculo", description: error.message, variant: "destructive" });
      return null;
    }
    setEntitlements((prev) => [result as DBEntitlement, ...prev]);
    return result as DBEntitlement;
  }, []);

  const updateEntitlement = useCallback(async (id: string, data: Partial<DBEntitlement>) => {
    const { data: result, error } = await supabase
      .from("client_entitlements")
      .update(data as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return null;
    }
    setEntitlements((prev) => prev.map((e) => e.id === id ? result as DBEntitlement : e));
    return result;
  }, []);

  const createMakeupClass = useCallback(async (data: {
    entitlement_id: string;
    client_id: string;
    original_appointment_id: string;
    prazo_limite: string;
  }) => {
    const { data: result, error } = await supabase
      .from("makeup_classes")
      .insert(data as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar reposição", description: error.message, variant: "destructive" });
      return null;
    }
    setMakeupClasses((prev) => [result as DBMakeupClass, ...prev]);
    return result;
  }, []);

  const updateMakeupClass = useCallback(async (id: string, data: Partial<DBMakeupClass>) => {
    const { data: result, error } = await supabase
      .from("makeup_classes")
      .update(data as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao atualizar reposição", description: error.message, variant: "destructive" });
      return null;
    }
    setMakeupClasses((prev) => prev.map((m) => m.id === id ? result as DBMakeupClass : m));
    return result;
  }, []);

  return {
    entitlements, plans, makeupClasses, loading,
    createEntitlement, updateEntitlement,
    createMakeupClass, updateMakeupClass,
    refetch: fetchAll,
  };
}
