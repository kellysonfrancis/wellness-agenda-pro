import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BIExportData {
  revenue: { mes: string; receita: number }[];
  revenueVsExpenses: { mes: string; receita: number; despesas: number; lucro: number }[];
  catRev: { name: string; value: number }[];
  payStatus: { name: string; value: number }[];
  expenseByCategory: { name: string; value: number }[];
  ltv: { cliente: string; ltv: number }[];
  cashFlowByAccount: { name: string; entradas: number; saidas: number; saldo: number }[];
  accountBalances: { name: string; saldo: number }[];
  totalRevenue: number;
  avgTicket: number;
  activeClients: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function exportToExcel(data: BIExportData) {
  const wb = XLSX.utils.book_new();

  // KPIs
  const kpis = [
    ["Métrica", "Valor"],
    ["Receita Total", fmt(data.totalRevenue)],
    ["Ticket Médio", fmt(data.avgTicket)],
    ["Clientes Ativos", data.activeClients],
    ["Despesas Totais", fmt(data.totalExpenses)],
    ["Lucro", fmt(data.profit)],
    ["Margem (%)", data.profitMargin.toFixed(1)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpis), "KPIs");

  // Revenue vs Expenses
  const rve = [["Mês", "Receita", "Despesas", "Lucro"], ...data.revenueVsExpenses.map((r) => [r.mes, r.receita, r.despesas, r.lucro])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rve), "Receita x Despesas");

  // Category revenue
  const cr = [["Categoria", "Valor"], ...data.catRev.map((r) => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cr), "Receita por Categoria");

  // Payment status
  const ps = [["Status", "Quantidade"], ...data.payStatus.map((r) => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ps), "Status Pagamentos");

  // Expense by category
  const ec = [["Categoria", "Valor"], ...data.expenseByCategory.map((r) => [r.name, r.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ec), "Despesas por Categoria");

  // LTV
  const ltvSheet = [["Cliente", "LTV"], ...data.ltv.map((r) => [r.cliente, r.ltv])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ltvSheet), "LTV");

  // Cash flow
  const cf = [["Conta", "Entradas", "Saídas", "Saldo"], ...data.cashFlowByAccount.map((r) => [r.name, r.entradas, r.saidas, r.saldo])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cf), "Fluxo de Caixa");

  XLSX.writeFile(wb, `BI_Relatorio_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToPDF(data: BIExportData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(16);
  doc.text("Relatório de Business Intelligence", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 10;

  // KPIs
  doc.setFontSize(12);
  doc.text("Indicadores Principais", 14, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    head: [["Métrica", "Valor"]],
    body: [
      ["Receita Total", `R$ ${fmt(data.totalRevenue)}`],
      ["Ticket Médio", `R$ ${fmt(data.avgTicket)}`],
      ["Clientes Ativos", String(data.activeClients)],
      ["Despesas Totais", `R$ ${fmt(data.totalExpenses)}`],
      ["Lucro", `R$ ${fmt(data.profit)}`],
      ["Margem", `${data.profitMargin.toFixed(1)}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 100, 80] },
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Revenue vs Expenses
  doc.setFontSize(12);
  doc.text("Receita × Despesas (Mensal)", 14, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    head: [["Mês", "Receita", "Despesas", "Lucro"]],
    body: data.revenueVsExpenses.map((r) => [r.mes, `R$ ${fmt(r.receita)}`, `R$ ${fmt(r.despesas)}`, `R$ ${fmt(r.lucro)}`]),
    theme: "grid",
    headStyles: { fillColor: [30, 100, 80] },
    styles: { fontSize: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Category revenue
  if (data.catRev.length > 0) {
    doc.setFontSize(12);
    doc.text("Receita por Categoria", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Valor"]],
      body: data.catRev.map((r) => [r.name, `R$ ${fmt(r.value)}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 100, 80] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expense by category
  if (data.expenseByCategory.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("Despesas por Categoria", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Valor"]],
      body: data.expenseByCategory.map((r) => [r.name, `R$ ${fmt(r.value)}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 100, 80] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // LTV
  if (data.ltv.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("LTV por Cliente", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Cliente", "LTV"]],
      body: data.ltv.map((r) => [r.cliente, `R$ ${fmt(r.ltv)}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 100, 80] },
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Cash flow
  if (data.cashFlowByAccount.length > 0) {
    if (y > 220) { doc.addPage(); y = 15; }
    doc.setFontSize(12);
    doc.text("Fluxo de Caixa por Conta", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Conta", "Entradas", "Saídas", "Saldo"]],
      body: data.cashFlowByAccount.map((r) => [r.name, `R$ ${fmt(r.entradas)}`, `R$ ${fmt(r.saidas)}`, `R$ ${fmt(r.saldo)}`]),
      theme: "grid",
      headStyles: { fillColor: [30, 100, 80] },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`BI_Relatorio_${new Date().toISOString().slice(0, 10)}.pdf`);
}
