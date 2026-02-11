import { supabase } from "@/integrations/supabase/client";

interface Pausa {
  inicio: number;
  fim: number;
}

export interface ProfessionalSchedule {
  professional_id: string;
  dia_semana: number;
  hora_inicio: number;
  hora_fim: number;
  pausas: Pausa[];
  ativo: boolean;
}

let cachedSchedules: ProfessionalSchedule[] | null = null;

export async function fetchProfessionalSchedules(): Promise<ProfessionalSchedule[]> {
  if (cachedSchedules) return cachedSchedules;
  const { data } = await supabase
    .from("professional_schedules")
    .select("professional_id, dia_semana, hora_inicio, hora_fim, pausas, ativo");
  cachedSchedules = (data ?? []).map((row: any) => ({
    ...row,
    pausas: Array.isArray(row.pausas) ? row.pausas : [],
  })) as ProfessionalSchedule[];
  setTimeout(() => { cachedSchedules = null; }, 60_000);
  return cachedSchedules;
}

/**
 * Validates if a date/time falls within the allowed schedule for a given professional.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateAgainstSchedule(
  schedules: ProfessionalSchedule[],
  professionalId: string,
  date: Date,
): string | null {
  const profSchedules = schedules.filter(
    (s) => s.professional_id === professionalId && s.ativo
  );

  // If no schedules configured, allow (backwards compat)
  if (profSchedules.length === 0) return null;

  const dayOfWeek = date.getDay();
  const daySchedule = profSchedules.find((s) => s.dia_semana === dayOfWeek);

  if (!daySchedule) {
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return `${dayNames[dayOfWeek]} não é um dia de atendimento deste profissional`;
  }

  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < daySchedule.hora_inicio || hour >= daySchedule.hora_fim) {
    return `Horário fora do expediente (${daySchedule.hora_inicio}h - ${daySchedule.hora_fim}h)`;
  }

  for (const pausa of daySchedule.pausas || []) {
    if (hour >= pausa.inicio && hour < pausa.fim) {
      return `Horário de pausa (${pausa.inicio}h - ${pausa.fim}h)`;
    }
  }

  return null;
}

/**
 * Convenience: fetch schedules + validate in one call.
 */
export async function validateAppointmentSchedule(
  professionalId: string,
  date: Date,
): Promise<string | null> {
  const schedules = await fetchProfessionalSchedules();
  return validateAgainstSchedule(schedules, professionalId, date);
}

/**
 * Check capacity: how many appointments exist for a given service+professional at a specific time.
 * Returns null if within capacity, or an error message if over the limit.
 */
export async function validateCapacity(
  serviceId: string,
  professionalId: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string,
): Promise<string | null> {
  // Fetch the service to get max_alunos
  const { data: svc } = await supabase
    .from("services")
    .select("max_alunos, nome, categoria")
    .eq("id", serviceId)
    .single();

  if (!svc) return null;

  let maxCapacity = svc.max_alunos;

  // If no service-level limit, check category-level limit
  if (!maxCapacity) {
    const { data: cat } = await supabase
      .from("categories")
      .select("max_alunos")
      .eq("slug", svc.categoria)
      .single();
    maxCapacity = (cat as any)?.max_alunos ?? null;
  }

  // If still no limit, for fisioterapia/estetica default to 1 per professional
  const effectiveMax = maxCapacity ?? (["fisioterapia", "estetica"].includes(svc.categoria) ? 1 : null);

  if (!effectiveMax) return null; // No limit

  // Count existing appointments at the same time slot
  let query = supabase
    .from("appointments")
    .select("id")
    .eq("service_id", serviceId)
    .eq("profissional_id", professionalId)
    .in("status", ["reservado", "confirmado", "em_atendimento"])
    .lt("inicio_em", endTime)
    .gt("fim_em", startTime);

  if (excludeAppointmentId) {
    query = query.neq("id", excludeAppointmentId);
  }

  const { data: existing } = await query;
  const count = existing?.length ?? 0;

  if (count >= effectiveMax) {
    return effectiveMax === 1
      ? `Este horário já está ocupado para ${svc.nome}. Apenas 1 atendimento por vez.`
      : `Capacidade máxima atingida (${count}/${effectiveMax} vagas ocupadas).`;
  }

  return null;
}
