import { supabase } from "@/integrations/supabase/client";

export interface CategorySchedule {
  categoria: string;
  dias_semana: number[];
  hora_inicio: number;
  hora_fim: number;
}

let cachedSchedules: CategorySchedule[] | null = null;

export async function fetchCategorySchedules(): Promise<CategorySchedule[]> {
  if (cachedSchedules) return cachedSchedules;
  const { data } = await supabase.from("category_schedules").select("categoria, dias_semana, hora_inicio, hora_fim");
  cachedSchedules = (data as CategorySchedule[]) ?? [];
  // Cache for 60s
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
  if (!schedule) return null; // No schedule configured = allow all

  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon...
  if (!schedule.dias_semana.includes(dayOfWeek)) {
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return `${dayNames[dayOfWeek]} não é um dia permitido para esta categoria`;
  }

  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < schedule.hora_inicio || hour >= schedule.hora_fim) {
    return `Horário fora da janela permitida (${schedule.hora_inicio}h - ${schedule.hora_fim}h)`;
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
