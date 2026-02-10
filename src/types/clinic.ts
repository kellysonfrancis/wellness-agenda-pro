export type UserRole = "admin" | "recepcao" | "profissional" | "cliente";

export type Categoria = "pilates" | "fisioterapia" | "estetica";

export type AppointmentStatus =
  | "reservado"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "faltou"
  | "cancelado";

export type AppointmentOrigin = "recepcao" | "cliente" | "profissional";

export type PaymentStatus = "pendente" | "pago" | "parcial" | "estornado" | "isento";
export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "transferencia" | "outro";

export type PlanType = "mensal_recorrente" | "pacote_creditos" | "combo_itens" | "creditos_estetica";
export type EntitlementStatus = "ativo" | "pausado" | "encerrado" | "vencido";
export type RehabStatus = "ativo" | "encerrado";

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  telefone?: string;
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  dataNascimento?: string;
  observacoes?: string;
  criadoEm: string;
}

export interface ProfessionalProfile {
  id: string;
  userId: string;
  nomeExibicao: string;
  especialidades: Categoria[];
  ativo: boolean;
  criadoEm: string;
}

export interface Service {
  id: string;
  categoria: Categoria;
  nome: string;
  duracaoMin: number;
  precoBase: number;
  permitePacote: boolean;
  maxAlunos?: number | null; // capacidade máxima por horário (Pilates)
  ativo: boolean;
}

export type PilatesFrequency = "2x_semana" | "3x_semana" | "avulsa";

export interface ProductPlan {
  id: string;
  tipo: PlanType;
  nome: string;
  categoria: Categoria;
  preco: number;
  validadeDias?: number | null;
  creditosTotal?: number | null;
  itensCombo?: string | null;
  regrasRecorrencia?: string | null;
  frequenciaPilates?: PilatesFrequency | null;
  vigenciaMeses?: number | null;
  aulasPorMes?: number | null;
  ilimitado?: boolean;
  termoFidelizacao?: string | null;
  multaCancelamento?: number | null;
  descontoIndicacaoPct?: number | null; // % desconto por indicação
  descontoFamiliarPct?: number | null;  // % desconto familiar
  ativo: boolean;
}

export interface ClientEntitlement {
  id: string;
  clientId: string;
  productPlanId: string;
  status: EntitlementStatus;
  saldoCreditos?: number | null;
  saldoItensCombo?: string | null;
  inicioEm: string;
  expiraEm?: string | null;
  observacoes?: string | null;
  criadoEm: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  profissionalId: string;
  inicioEm: string;
  fimEm: string;
  status: AppointmentStatus;
  origem: AppointmentOrigin;
  entitlementId?: string | null;
  observacoes?: string | null;
}

export interface Payment {
  id: string;
  clientId: string;
  appointmentId?: string | null;
  entitlementId?: string | null;
  valorTotal: number;
  valorPago: number;
  status: PaymentStatus;
  metodo: PaymentMethod;
  pagoEm?: string | null;
  referencia?: string | null;
  criadoEm: string;
}

export interface RehabPlan {
  id: string;
  clientId: string;
  profissionalId: string;
  queixaPrincipal?: string;
  objetivos?: string;
  frequenciaSugerida?: string;
  sessoesPrevistas?: number;
  status: RehabStatus;
  criadoEm: string;
}

export interface ClinicSettings {
  cancelamentoHorasAntes: number;
  confirmacaoInicioHoras: number;
  confirmacaoFimHoras: number;
  lembreteHoras: number[];
}
