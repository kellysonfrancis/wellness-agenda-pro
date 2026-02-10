
# Validacao de Horario por Categoria na Criacao de Agendamento

## Objetivo
Impedir que agendamentos sejam criados fora do horario permitido pela categoria do servico selecionado, validando dia da semana e faixa de horario conforme a tabela `category_schedules`.

## Pontos de validacao identificados

Existem 4 locais onde agendamentos sao criados e precisam de validacao:

1. **Agenda.tsx - handleSave** (criacao e edicao via modal)
2. **MakeupClassModal.tsx - handleSchedule** (reposicao de aula)
3. **public-booking edge function** (agendamento publico)
4. **PilatesMonthlyWizard / PackageScheduler** (agendamentos em lote -- ja usam slots filtrados, mas vale proteger)

## Mudancas planejadas

### 1. Criar funcao utilitaria de validacao
- Novo arquivo `src/utils/scheduleValidation.ts`
- Funcao `validateSchedule(date: Date, categoria: string, scheduleMap: Record<string, CategorySchedule>)` que retorna `{ valid: boolean; message?: string }`
- Verifica se o dia da semana esta em `dias_semana` e se a hora esta entre `hora_inicio` e `hora_fim`

### 2. Agenda.tsx - handleSave
- Antes de chamar `createAppointment` ou `updateAppointment`, buscar a categoria do servico selecionado no `serviceMap`
- Chamar `validateSchedule` e exibir toast de erro se invalido, bloqueando a operacao

### 3. MakeupClassModal.tsx - handleSchedule
- Buscar `category_schedules` do Supabase (ou receber via props)
- Validar antes de inserir o agendamento de reposicao

### 4. Edge function public-booking
- No POST de criacao, buscar o `category_schedules` para a categoria do servico
- Validar dia da semana e horario; retornar erro 400 se fora do permitido
- No GET de slots, filtrar os horarios gerados de acordo com `category_schedules`

## Detalhes tecnicos

### scheduleValidation.ts
```typescript
export function validateSchedule(
  startDate: Date,
  categoria: string,
  scheduleMap: Record<string, { dias_semana: number[]; hora_inicio: number; hora_fim: number }>
): { valid: boolean; message?: string } {
  const sched = scheduleMap[categoria];
  if (!sched) return { valid: true }; // sem restricao configurada
  const dow = startDate.getDay(); // 0=dom
  if (!sched.dias_semana.includes(dow)) {
    return { valid: false, message: "Esta categoria nao atende neste dia da semana" };
  }
  const hour = startDate.getHours();
  if (hour < sched.hora_inicio || hour >= sched.hora_fim) {
    return { valid: false, message: `Horario fora do permitido (${sched.hora_inicio}h - ${sched.hora_fim}h)` };
  }
  return { valid: true };
}
```

### Agenda.tsx (handleSave) - adicionar antes da criacao/atualizacao:
```typescript
const schedCheck = validateSchedule(startDate, svc.categoria, scheduleMap);
if (!schedCheck.valid) {
  toast({ title: "Horario nao permitido", description: schedCheck.message, variant: "destructive" });
  return;
}
```

### MakeupClassModal.tsx - receber `categorySchedules` via props e validar antes de salvar

### public-booking edge function:
- Buscar `category_schedules` para a categoria do servico
- No POST: validar dia/hora antes de inserir
- No GET slots: filtrar slots fora do horario da categoria
