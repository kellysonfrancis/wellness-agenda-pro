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
