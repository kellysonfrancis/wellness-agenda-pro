import type {
  Client, ProfessionalProfile, Service, ProductPlan,
  ClientEntitlement, Appointment, Payment, User, Expense
} from "@/types/clinic";

const today = new Date();
const fmt = (d: Date) => d.toISOString();
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600000);
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

const todayAt = (h: number, m = 0) => {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d;
};

export const mockUsers: User[] = [
  { id: "u1", nome: "Ana Silva", email: "admin@clinica.com", role: "admin", telefone: "11999990001" },
  { id: "u2", nome: "Beatriz Costa", email: "recepcao@clinica.com", role: "recepcao", telefone: "11999990002" },
  { id: "u3", nome: "Dr. Carlos Mendes", email: "carlos@clinica.com", role: "profissional", telefone: "11999990003" },
  { id: "u4", nome: "Dra. Fernanda Lima", email: "fernanda@clinica.com", role: "profissional", telefone: "11999990004" },
  { id: "u5", nome: "Maria Oliveira", email: "maria@email.com", role: "cliente", telefone: "11999990005" },
];

export const mockClients: Client[] = [
  { id: "c1", nome: "Maria Oliveira", telefone: "11999990005", email: "maria@email.com", criadoEm: fmt(addDays(today, -60)) },
  { id: "c2", nome: "João Santos", telefone: "11988880001", email: "joao@email.com", criadoEm: fmt(addDays(today, -45)) },
  { id: "c3", nome: "Carla Ferreira", telefone: "11977770001", criadoEm: fmt(addDays(today, -30)) },
  { id: "c4", nome: "Pedro Almeida", telefone: "11966660001", email: "pedro@email.com", criadoEm: fmt(addDays(today, -20)) },
  { id: "c5", nome: "Luciana Ribeiro", telefone: "11955550001", criadoEm: fmt(addDays(today, -10)) },
];

export const mockProfessionals: ProfessionalProfile[] = [
  { id: "p1", userId: "u3", nomeExibicao: "Dr. Carlos Mendes", especialidades: ["fisioterapia", "pilates"], ativo: true, criadoEm: fmt(addDays(today, -90)) },
  { id: "p2", userId: "u4", nomeExibicao: "Dra. Fernanda Lima", especialidades: ["estetica", "pilates"], ativo: true, criadoEm: fmt(addDays(today, -90)) },
];

export const mockServices: Service[] = [
  { id: "s1", categoria: "pilates", nome: "Pilates Solo", duracaoMin: 50, precoBase: 120, permitePacote: true, maxAlunos: 1, ativo: true },
  { id: "s2", categoria: "pilates", nome: "Pilates Duo", duracaoMin: 50, precoBase: 90, permitePacote: true, maxAlunos: 2, ativo: true },
  { id: "s8", categoria: "pilates", nome: "Pilates Grupo", duracaoMin: 50, precoBase: 65, permitePacote: true, maxAlunos: 6, ativo: true },
  { id: "s3", categoria: "fisioterapia", nome: "Fisioterapia Ortopédica", duracaoMin: 60, precoBase: 180, permitePacote: true, ativo: true },
  { id: "s4", categoria: "fisioterapia", nome: "RPG", duracaoMin: 50, precoBase: 200, permitePacote: true, ativo: true },
  { id: "s5", categoria: "estetica", nome: "Limpeza de Pele", duracaoMin: 90, precoBase: 250, permitePacote: true, ativo: true },
  { id: "s6", categoria: "estetica", nome: "Peeling Químico", duracaoMin: 45, precoBase: 350, permitePacote: true, ativo: true },
  { id: "s7", categoria: "estetica", nome: "Radiofrequência", duracaoMin: 40, precoBase: 280, permitePacote: false, ativo: true },
];

export const mockPlans: ProductPlan[] = [
  { id: "pp1", tipo: "mensal_recorrente", nome: "Pilates 2x/sem", categoria: "pilates", preco: 480, frequenciaPilates: "2x_semana", vigenciaMeses: 1, aulasPorMes: 8, ilimitado: false, descontoIndicacaoPct: 10, descontoFamiliarPct: 15, ativo: true },
  { id: "pp2", tipo: "mensal_recorrente", nome: "Pilates 3x/sem", categoria: "pilates", preco: 650, frequenciaPilates: "3x_semana", vigenciaMeses: 1, aulasPorMes: 12, ilimitado: false, descontoIndicacaoPct: 10, descontoFamiliarPct: 15, ativo: true },
  { id: "pp6", tipo: "mensal_recorrente", nome: "Pilates Avulsa", categoria: "pilates", preco: 120, frequenciaPilates: "avulsa", vigenciaMeses: 1, aulasPorMes: 1, ilimitado: false, ativo: true },
  { id: "pp7", tipo: "mensal_recorrente", nome: "Pilates Ilimitado", categoria: "pilates", preco: 750, vigenciaMeses: 6, ilimitado: true, termoFidelizacao: "Fidelidade de 6 meses", multaCancelamento: 500, descontoIndicacaoPct: 10, descontoFamiliarPct: 15, ativo: true },
  { id: "pp3", tipo: "pacote_creditos", nome: "Fisio 10 Sessões", categoria: "fisioterapia", preco: 1500, creditosTotal: 10, validadeDias: 120, ativo: true },
  { id: "pp4", tipo: "combo_itens", nome: "Combo Estética Facial", categoria: "estetica", preco: 800, itensCombo: JSON.stringify([{ serviceId: "s5", quantidade: 2 }, { serviceId: "s6", quantidade: 1 }]), validadeDias: 90, ativo: true },
  { id: "pp5", tipo: "creditos_estetica", nome: "5 Créditos Estética", categoria: "estetica", preco: 1200, creditosTotal: 5, validadeDias: 180, ativo: true },
];

export const mockEntitlements: ClientEntitlement[] = [
  { id: "e1", clientId: "c1", productPlanId: "pp1", status: "ativo", saldoCreditos: 5, inicioEm: fmt(addDays(today, -15)), expiraEm: fmt(addDays(today, 15)), criadoEm: fmt(addDays(today, -15)) },
  { id: "e2", clientId: "c2", productPlanId: "pp3", status: "ativo", saldoCreditos: 7, inicioEm: fmt(addDays(today, -30)), expiraEm: fmt(addDays(today, 90)), criadoEm: fmt(addDays(today, -30)) },
  { id: "e3", clientId: "c3", productPlanId: "pp5", status: "ativo", saldoCreditos: 4, inicioEm: fmt(addDays(today, -10)), expiraEm: fmt(addDays(today, 170)), criadoEm: fmt(addDays(today, -10)) },
];

export const mockAppointments: Appointment[] = [
  { id: "a1", clientId: "c1", serviceId: "s1", profissionalId: "p1", inicioEm: fmt(todayAt(8)), fimEm: fmt(todayAt(8, 50)), status: "confirmado", origem: "recepcao", entitlementId: "e1" },
  { id: "a2", clientId: "c2", serviceId: "s3", profissionalId: "p1", inicioEm: fmt(todayAt(10)), fimEm: fmt(todayAt(11)), status: "reservado", origem: "cliente", entitlementId: "e2" },
  { id: "a3", clientId: "c3", serviceId: "s5", profissionalId: "p2", inicioEm: fmt(todayAt(14)), fimEm: fmt(todayAt(15, 30)), status: "reservado", origem: "recepcao", entitlementId: "e3" },
  { id: "a4", clientId: "c4", serviceId: "s4", profissionalId: "p1", inicioEm: fmt(todayAt(16)), fimEm: fmt(todayAt(16, 50)), status: "confirmado", origem: "recepcao" },
  { id: "a5", clientId: "c1", serviceId: "s2", profissionalId: "p2", inicioEm: fmt(addHours(todayAt(9), 24)), fimEm: fmt(addHours(todayAt(9, 50), 24)), status: "reservado", origem: "cliente", entitlementId: "e1" },
  { id: "a6", clientId: "c5", serviceId: "s6", profissionalId: "p2", inicioEm: fmt(addHours(todayAt(11), 24)), fimEm: fmt(addHours(todayAt(11, 45), 24)), status: "reservado", origem: "recepcao" },
];

export const mockPayments: Payment[] = [
  { id: "pay1", clientId: "c4", appointmentId: "a4", valorTotal: 200, valorPago: 200, status: "pago", metodo: "pix", pagoEm: fmt(addDays(today, -1)), criadoEm: fmt(addDays(today, -1)) },
  { id: "pay2", clientId: "c1", entitlementId: "e1", valorTotal: 480, valorPago: 480, status: "pago", metodo: "cartao", pagoEm: fmt(addDays(today, -15)), criadoEm: fmt(addDays(today, -15)) },
  { id: "pay3", clientId: "c2", entitlementId: "e2", valorTotal: 1500, valorPago: 750, status: "parcial", metodo: "pix", criadoEm: fmt(addDays(today, -30)) },
  { id: "pay4", clientId: "c6" as string, appointmentId: "a6", valorTotal: 350, valorPago: 0, status: "pendente", metodo: "pix", criadoEm: fmt(today) },
  { id: "pay5", clientId: "c3", entitlementId: "e3", valorTotal: 1200, valorPago: 1200, status: "pago", metodo: "transferencia", pagoEm: fmt(addDays(today, -10)), criadoEm: fmt(addDays(today, -10)) },
];

export const mockExpenses: Expense[] = [
  { id: "exp1", tipo: "fixa", categoria: "aluguel", descricao: "Aluguel da clínica", valor: 5000, dataVencimento: fmt(addDays(today, 5)), pago: true, pagoEm: fmt(addDays(today, -2)), recorrente: true, criadoEm: fmt(addDays(today, -30)) },
  { id: "exp2", tipo: "fixa", categoria: "salarios", descricao: "Folha de pagamento", valor: 12000, dataVencimento: fmt(addDays(today, 3)), pago: false, recorrente: true, criadoEm: fmt(addDays(today, -30)) },
  { id: "exp3", tipo: "fixa", categoria: "impostos", descricao: "SIMPLES Nacional", valor: 2800, dataVencimento: fmt(addDays(today, 10)), pago: false, recorrente: true, criadoEm: fmt(addDays(today, -30)) },
  { id: "exp4", tipo: "variavel", categoria: "materiais", descricao: "Cremes e óleos para estética", valor: 450, dataVencimento: fmt(addDays(today, -5)), pago: true, pagoEm: fmt(addDays(today, -5)), recorrente: false, criadoEm: fmt(addDays(today, -10)) },
  { id: "exp5", tipo: "variavel", categoria: "equipamentos", descricao: "Manutenção do reformer", valor: 800, dataVencimento: fmt(addDays(today, 7)), pago: false, recorrente: false, criadoEm: fmt(addDays(today, -3)) },
  { id: "exp6", tipo: "variavel", categoria: "marketing", descricao: "Anúncios Instagram", valor: 600, dataVencimento: fmt(addDays(today, 1)), pago: true, pagoEm: fmt(today), recorrente: false, criadoEm: fmt(addDays(today, -7)) },
  { id: "exp7", tipo: "fixa", categoria: "manutencao", descricao: "Limpeza e conservação", valor: 1200, dataVencimento: fmt(addDays(today, 15)), pago: false, recorrente: true, criadoEm: fmt(addDays(today, -30)) },
];

// helpers
export const getClientName = (id: string) => mockClients.find(c => c.id === id)?.nome ?? "—";
export const getServiceName = (id: string) => mockServices.find(s => s.id === id)?.nome ?? "—";
export const getProfessionalName = (id: string) => mockProfessionals.find(p => p.id === id)?.nomeExibicao ?? "—";
export const getPlanName = (id: string) => mockPlans.find(p => p.id === id)?.nome ?? "—";
