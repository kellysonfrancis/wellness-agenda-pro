import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PeriodFilter, CategoryFilter } from "./BIFilters";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const catLabel: Record<string, string> = { pilates: "Pilates", fisioterapia: "Fisioterapia", estetica: "Estética" };
const statusLabel: Record<string, string> = { pago: "Pago", pendente: "Pendente", parcial: "Parcial", estornado: "Estornado", isento: "Isento" };

export const PIE_COLORS = [
  "hsl(172 66% 30%)",
  "hsl(38 92% 50%)",
  "hsl(205 80% 50%)",
  "hsl(152 60% 40%)",
  "hsl(0 72% 51%)",
];

function periodCutoff(period: PeriodFilter): string | null {
  if (period === "all") return null;
  const now = new Date();
  let d: Date;
  if (period === "month") d = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  else if (period === "quarter") d = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  else d = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return d.toISOString();
}

async function fetchBIRawData() {
  const [apptRes, payRes, clientRes, expRes, svcRes, planRes, entRes, bankRes, txRes] = await Promise.all([
    supabase.from("appointments").select("id, client_id, service_id, inicio_em, status"),
    supabase.from("payments").select("id, client_id, appointment_id, valor_pago, valor_total, status, created_at, metodo"),
    supabase.from("clients").select("id, nome, created_at"),
    supabase.from("expenses").select("id, descricao, valor, tipo, categoria, created_at"),
    supabase.from("services").select("id, nome, categoria, preco_base"),
    supabase.from("product_plans").select("id, nome, categoria"),
    supabase.from("client_entitlements").select("id, client_id, product_plan_id, status, created_at"),
    supabase.from("bank_accounts").select("id, nome, tipo, ativo, saldo_atual"),
    supabase.from("account_transactions").select("id, tipo, valor, conta_origem_id, conta_destino_id, created_at"),
  ]);

  return {
    appointments: apptRes.data ?? [],
    payments: payRes.data ?? [],
    clients: clientRes.data ?? [],
    expenses: expRes.data ?? [],
    services: svcRes.data ?? [],
    plans: planRes.data ?? [],
    entitlements: entRes.data ?? [],
    bankAccounts: bankRes.data ?? [],
    transactions: txRes.data ?? [],
  };
}

export function useBIData(period: PeriodFilter, category: CategoryFilter) {
  const { data: raw, isLoading, error } = useQuery({
    queryKey: ["bi-data"],
    queryFn: fetchBIRawData,
    staleTime: 60_000,
  });

  const computed = useMemo(() => {
    if (!raw) return null;

    const cutoff = periodCutoff(period);
    const { appointments, payments, clients, expenses, services, plans, entitlements, bankAccounts, transactions } = raw;

    const svcMap = new Map(services.map((s) => [s.id, s]));
    const getServiceCategory = (serviceId: string) => svcMap.get(serviceId)?.categoria;
    const clientMap = new Map(clients.map((c) => [c.id, c.nome]));

    // Filter appointments
    let filteredAppts = appointments;
    if (cutoff) filteredAppts = filteredAppts.filter((a) => a.inicio_em >= cutoff);
    if (category !== "all") filteredAppts = filteredAppts.filter((a) => getServiceCategory(a.service_id) === category);

    // Filter payments
    let filteredPayments = payments;
    if (cutoff) filteredPayments = filteredPayments.filter((p) => p.created_at >= cutoff);
    if (category !== "all") {
      const apptIds = new Set(filteredAppts.map((a) => a.id));
      filteredPayments = filteredPayments.filter((p) => {
        if (p.appointment_id) return apptIds.has(p.appointment_id);
        return false;
      });
    }

    // Revenue by month
    const revenueMap: Record<string, number> = {};
    months.forEach((m) => (revenueMap[m] = 0));
    filteredPayments.forEach((p) => {
      const m = months[new Date(p.created_at).getMonth()];
      revenueMap[m] = (revenueMap[m] || 0) + Number(p.valor_pago);
    });
    const revenue = months.map((m) => ({ mes: m, receita: revenueMap[m] }));

    // Category revenue
    const catRevMap: Record<string, number> = {};
    filteredAppts.forEach((a) => {
      const svc = svcMap.get(a.service_id);
      if (!svc) return;
      const payment = filteredPayments.find((p) => p.appointment_id === a.id);
      catRevMap[svc.categoria] = (catRevMap[svc.categoria] || 0) + Number(payment?.valor_pago ?? svc.preco_base);
    });
    const catRev = Object.entries(catRevMap).map(([name, value]) => ({
      name: catLabel[name] || name, value,
    }));

    // Payment status
    const statusCounts: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    const payStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: statusLabel[name] || name, value,
    }));

    // Funnel
    const filteredClients = cutoff ? clients.filter((c) => c.created_at >= cutoff) : clients;
    const leads = filteredClients.length;
    const withAppt = new Set(filteredAppts.map((a) => a.client_id)).size;
    const filteredEnts = cutoff ? entitlements.filter((e) => e.created_at >= cutoff) : entitlements;
    const withPack = new Set(filteredEnts.map((e) => e.client_id)).size;
    const recurring = filteredEnts.filter((e) => e.status === "ativo").length;
    const funnel = [
      { name: "Cadastros", value: leads, fill: "hsl(172 66% 30%)" },
      { name: "Agendaram", value: withAppt, fill: "hsl(205 80% 50%)" },
      { name: "Compraram Pacote", value: withPack, fill: "hsl(38 92% 50%)" },
      { name: "Ativos", value: recurring, fill: "hsl(152 60% 40%)" },
    ];

    // LTV
    const clientTotals: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      clientTotals[p.client_id] = (clientTotals[p.client_id] || 0) + Number(p.valor_pago);
    });
    const ltv = Object.entries(clientTotals)
      .map(([id, total]) => ({ cliente: clientMap.get(id) || id.slice(0, 8), ltv: total }))
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 10);

    // KPIs
    const totalRevenue = filteredPayments.reduce((s, p) => s + Number(p.valor_pago), 0);
    const paidCount = filteredPayments.filter((p) => Number(p.valor_pago) > 0).length;
    const avgTicket = totalRevenue / (paidCount || 1);
    const activeClients = new Set(filteredAppts.map((a) => a.client_id)).size;

    // Expenses
    let filteredExpenses = expenses;
    if (cutoff) filteredExpenses = filteredExpenses.filter((e) => e.created_at >= cutoff);

    const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.valor), 0);
    const totalFixedExpenses = filteredExpenses.filter((e) => e.tipo === "fixa").reduce((s, e) => s + Number(e.valor), 0);
    const totalVariableExpenses = filteredExpenses.filter((e) => e.tipo === "variavel").reduce((s, e) => s + Number(e.valor), 0);
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Revenue vs Expenses by month
    const expenseMap: Record<string, number> = {};
    months.forEach((m) => (expenseMap[m] = 0));
    filteredExpenses.forEach((e) => {
      const m = months[new Date(e.created_at).getMonth()];
      expenseMap[m] = (expenseMap[m] || 0) + Number(e.valor);
    });
    const revenueVsExpenses = months.map((m) => ({
      mes: m, receita: revenueMap[m], despesas: expenseMap[m], lucro: revenueMap[m] - expenseMap[m],
    }));

    // Expense by category
    const expCatLabel: Record<string, string> = {
      aluguel: "Aluguel", salarios: "Salários", materiais: "Materiais",
      equipamentos: "Equipamentos", marketing: "Marketing",
      manutencao: "Manutenção", impostos: "Impostos", outros: "Outros",
    };
    const expByCat: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      expByCat[e.categoria] = (expByCat[e.categoria] || 0) + Number(e.valor);
    });
    const expenseByCategory = Object.entries(expByCat).map(([name, value]) => ({
      name: expCatLabel[name] || name, value,
    }));

    // Cash flow by account
    const filteredTx = cutoff ? transactions.filter((t) => t.created_at >= cutoff) : transactions;
    const accountFlowMap: Record<string, { name: string; entradas: number; saidas: number }> = {};
    bankAccounts.filter((a) => a.ativo).forEach((a) => {
      accountFlowMap[a.id] = { name: a.nome, entradas: 0, saidas: 0 };
    });
    filteredTx.forEach((t) => {
      if (t.tipo === "entrada" && t.conta_destino_id && accountFlowMap[t.conta_destino_id]) {
        accountFlowMap[t.conta_destino_id].entradas += Number(t.valor);
      }
      if (t.tipo === "saida" && t.conta_origem_id && accountFlowMap[t.conta_origem_id]) {
        accountFlowMap[t.conta_origem_id].saidas += Number(t.valor);
      }
      if (t.tipo === "transferencia") {
        if (t.conta_origem_id && accountFlowMap[t.conta_origem_id]) accountFlowMap[t.conta_origem_id].saidas += Number(t.valor);
        if (t.conta_destino_id && accountFlowMap[t.conta_destino_id]) accountFlowMap[t.conta_destino_id].entradas += Number(t.valor);
      }
    });
    const cashFlowByAccount = Object.values(accountFlowMap).map((a) => ({
      ...a, saldo: a.entradas - a.saidas,
    }));

    const accountBalances = bankAccounts.filter((a) => a.ativo).map((a) => ({
      name: a.nome, saldo: Number(a.saldo_atual),
    }));

    return {
      revenue, catRev, payStatus, funnel, ltv, totalRevenue, avgTicket, activeClients,
      totalExpenses, totalFixedExpenses, totalVariableExpenses, profit, profitMargin,
      revenueVsExpenses, expenseByCategory, cashFlowByAccount, accountBalances,
    };
  }, [raw, period, category]);

  return { data: computed, isLoading, error };
}
