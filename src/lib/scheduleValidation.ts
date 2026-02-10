import { supabase } from "@/integrations/supabase/client";

interface Pausa {
  inicio: number;
  fim: number;
}

export interface CategorySchedule {
  categoria: string;
  dias_semana: number[];
  hora_inicio: number;
  hora_fim: number;
  pausas: Pausa[];
}

let cachedSchedules: CategorySchedule[] | null = null;

export async function fetchCategorySchedules(): Promise<CategorySchedule[]> {
  if (cachedSchedules) return cachedSchedules;
  const { data } = await supabase.from("category_schedules").select("categoria, dias_semana, hora_inicio, hora_fim, pausas");
  cachedSchedules = (data ?? []).map((row: any) => ({
    ...row,
    pausas: Array.isArray(row.pausas) ? row.pausas : [],
  })) as CategorySchedule[];
  setTimeout(() => { cachedSchedules = null; }, 60_000);
  return cachedSchedules;
}

/**
 * Validates if a date/time falls within the allowed schedule for a given category.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateAgainstSchedule(
  schedule: CategorySchedule | undefined,
  date: Date,
): string | null {
  if (!schedule) return null;

  const dayOfWeek = date.getDay();
  if (!schedule.dias_semana.includes(dayOfWeek)) {
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return `${dayNames[dayOfWeek]} não é um dia permitido para esta categoria`;
  }

  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < schedule.hora_inicio || hour >= schedule.hora_fim) {
    return `Horário fora da janela permitida (${schedule.hora_inicio}h - ${schedule.hora_fim}h)`;
  }

  // Check breaks
  for (const pausa of schedule.pausas || []) {
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
  categoria: string,
  date: Date,
): Promise<string | null> {
  const schedules = await fetchCategorySchedules();
  const schedule = schedules.find((s) => s.categoria === categoria);
  return validateAgainstSchedule(schedule, date);
}
