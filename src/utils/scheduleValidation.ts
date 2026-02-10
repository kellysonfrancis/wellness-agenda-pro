export interface CategorySchedule {
  dias_semana: number[];
  hora_inicio: number;
  hora_fim: number;
}

export function validateSchedule(
  startDate: Date,
  categoria: string,
  scheduleMap: Record<string, CategorySchedule>
): { valid: boolean; message?: string } {
  const sched = scheduleMap[categoria];
  if (!sched) return { valid: true };

  const dow = startDate.getDay(); // 0=dom
  if (!sched.dias_semana.includes(dow)) {
    return { valid: false, message: "Esta categoria não atende neste dia da semana" };
  }

  const hour = startDate.getHours();
  if (hour < sched.hora_inicio || hour >= sched.hora_fim) {
    return {
      valid: false,
      message: `Horário fora do permitido (${sched.hora_inicio}h - ${sched.hora_fim}h)`,
    };
  }

  return { valid: true };
}
