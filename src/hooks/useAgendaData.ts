import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Categoria } from "@/types/clinic";

export interface DBClient {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
}

export interface DBService {
  id: string;
  categoria: string;
  nome: string;
  duracao_min: number;
  preco_base: number;
  permite_pacote: boolean;
  max_alunos: number | null;
  ativo: boolean;
}

export interface DBProfessional {
  id: string;
  nome_exibicao: string;
  especialidades: string[];
  ativo: boolean;
}

export interface DBAppointment {
  id: string;
  client_id: string;
  service_id: string;
  profissional_id: string;
  inicio_em: string;
  fim_em: string;
  status: string;
  origem: string;
  observacoes: string | null;
}

export function useAgendaData() {
  const [appointments, setAppointments] = useState<DBAppointment[]>([]);
  const [clients, setClients] = useState<DBClient[]>([]);
  const [services, setServices] = useState<DBService[]>([]);
  const [professionals, setProfessionals] = useState<DBProfessional[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [apptRes, clientRes, svcRes, profRes] = await Promise.all([
      supabase.from("appointments").select("*"),
      supabase.from("clients").select("id, nome, telefone, email"),
      supabase.from("services").select("*"),
      supabase.from("professionals").select("*"),
    ]);

    if (apptRes.data) setAppointments(apptRes.data as DBAppointment[]);
    if (clientRes.data) setClients(clientRes.data as DBClient[]);
    if (svcRes.data) setServices(svcRes.data as DBService[]);
    if (profRes.data) setProfessionals(profRes.data as DBProfessional[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription for new appointments
  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          const newAppt = payload.new as DBAppointment;
          setAppointments((prev) => {
            if (prev.some((a) => a.id === newAppt.id)) return prev;
            return [...prev, newAppt];
          });
          toast({ title: "Novo agendamento", description: "Um novo agendamento foi criado." });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload) => {
          const updated = payload.new as DBAppointment;
          setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "appointments" },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setAppointments((prev) => prev.filter((a) => a.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createAppointment = useCallback(async (data: {
    client_id: string;
    service_id: string;
    profissional_id: string;
    inicio_em: string;
    fim_em: string;
    observacoes?: string;
  }) => {
    const { data: result, error } = await supabase
      .from("appointments")
      .insert({
        client_id: data.client_id,
        service_id: data.service_id,
        profissional_id: data.profissional_id,
        inicio_em: data.inicio_em,
        fim_em: data.fim_em,
        status: "reservado" as any,
        origem: "recepcao" as any,
        observacoes: data.observacoes || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
      return null;
    }

    setAppointments((prev) => [...prev, result as DBAppointment]);
    return result;
  }, []);

  const updateAppointment = useCallback(async (id: string, data: {
    client_id?: string;
    service_id?: string;
    profissional_id?: string;
    inicio_em?: string;
    fim_em?: string;
    status?: string;
    observacoes?: string | null;
  }) => {
    const { data: result, error } = await supabase
      .from("appointments")
      .update(data as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao atualizar agendamento", description: error.message, variant: "destructive" });
      return null;
    }

    setAppointments((prev) => prev.map((a) => (a.id === id ? (result as DBAppointment) : a)));
    return result;
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir agendamento", description: error.message, variant: "destructive" });
      return false;
    }

    setAppointments((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, []);

  const getClientName = useCallback((id: string) => clients.find((c) => c.id === id)?.nome ?? "—", [clients]);
  const getServiceName = useCallback((id: string) => services.find((s) => s.id === id)?.nome ?? "—", [services]);
  const getProfessionalName = useCallback((id: string) => professionals.find((p) => p.id === id)?.nome_exibicao ?? "—", [professionals]);

  return {
    appointments,
    clients,
    services,
    professionals,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getClientName,
    getServiceName,
    getProfessionalName,
    refetch: fetchAll,
  };
}
