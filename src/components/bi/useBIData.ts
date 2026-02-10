import { useMemo } from "react";
import type { PeriodFilter, CategoryFilter } from "./BIFilters";
import type { Payment, Appointment } from "@/types/clinic";
import {
  mockPayments, mockClients, mockAppointments,
  mockEntitlements, mockServices, mockPlans, getClientName,
} from "@/data/mockData";

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

function periodCutoff(period: PeriodFilter): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  if (period === "quarter") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
}

function getServiceCategory(serviceId: string) {
  return mockServices.find((s) => s.id === serviceId)?.categoria;
}

export function useBIData(period: PeriodFilter, category: CategoryFilter) {
  return useMemo(() => {
    const cutoff = periodCutoff(period);

    // Filter appointments by date (inicioEm) and category
    let filteredAppts = mockAppointments as Appointment[];
    if (cutoff) filteredAppts = filteredAppts.filter((a) => new Date(a.inicioEm) >= cutoff);
    if (category !== "all") filteredAppts = filteredAppts.filter((a) => getServiceCategory(a.serviceId) === category);

    // Filter payments by date
    let filteredPayments = mockPayments as Payment[];
    if (cutoff) filteredPayments = filteredPayments.filter((p) => new Date(p.criadoEm) >= cutoff);

    // Further filter payments by category
    if (category !== "all") {
      const apptIds = new Set(filteredAppts.map((a) => a.id));
      filteredPayments = filteredPayments.filter((p) => {
        if (p.appointmentId) return apptIds.has(p.appointmentId);
        if (p.entitlementId) {
          const ent = mockEntitlements.find((e) => e.id === p.entitlementId);
          if (ent) {
            const plan = mockPlans.find((pl) => pl.id === ent.productPlanId);
            return plan?.categoria === category;
          }
        }
        return false;
      });
    }

    // Revenue by month
    const revenueMap: Record<string, number> = {};
    months.forEach((m) => (revenueMap[m] = 0));
    filteredPayments.forEach((p) => {
      const m = months[new Date(p.criadoEm).getMonth()];
      revenueMap[m] = (revenueMap[m] || 0) + p.valorPago;
    });
    const revenue = months.map((m) => ({ mes: m, receita: revenueMap[m] }));

    // Category revenue
    const catRevMap: Record<string, number> = {};
    filteredAppts.forEach((a) => {
      const svc = mockServices.find((s) => s.id === a.serviceId);
      if (!svc) return;
      const payment = filteredPayments.find((p) => p.appointmentId === a.id);
      catRevMap[svc.categoria] = (catRevMap[svc.categoria] || 0) + (payment?.valorPago ?? svc.precoBase);
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
    const filteredClients = cutoff
      ? mockClients.filter((c) => new Date(c.criadoEm) >= cutoff)
      : mockClients;
    const leads = filteredClients.length;
    const withAppt = new Set(filteredAppts.map((a) => a.clientId)).size;
    const filteredEnts = cutoff
      ? mockEntitlements.filter((e) => new Date(e.criadoEm) >= cutoff)
      : mockEntitlements;
    const withPack = new Set(filteredEnts.map((e) => e.clientId)).size;
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
      clientTotals[p.clientId] = (clientTotals[p.clientId] || 0) + p.valorPago;
    });
    const ltv = Object.entries(clientTotals)
      .map(([id, total]) => ({ cliente: getClientName(id), ltv: total }))
      .sort((a, b) => b.ltv - a.ltv);

    // KPIs
    const totalRevenue = filteredPayments.reduce((s, p) => s + p.valorPago, 0);
    const paidCount = filteredPayments.filter((p) => p.valorPago > 0).length;
    const avgTicket = totalRevenue / (paidCount || 1);
    const activeClients = new Set(filteredAppts.map((a) => a.clientId)).size;

    return { revenue, catRev, payStatus, funnel, ltv, totalRevenue, avgTicket, activeClients };
  }, [period, category]);
}
