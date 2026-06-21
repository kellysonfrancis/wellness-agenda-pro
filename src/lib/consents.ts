import jsPDF from "jspdf";

export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export async function getClientIp(): Promise<string> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip || "";
  } catch {
    return "";
  }
}

export function downloadConsentPdf(opts: {
  titulo: string;
  conteudo: string;
  assinante: string;
  assinado_em: string;
  ip?: string | null;
  user_agent?: string | null;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.titulo, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(opts.conteudo, width);
  for (const line of lines) {
    if (y > 780) { doc.addPage(); y = margin; }
    doc.text(line, margin, y);
    y += 15;
  }

  y += 20;
  if (y > 720) { doc.addPage(); y = margin; }
  doc.setDrawColor(180);
  doc.line(margin, y, margin + 260, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Assinatura eletrônica", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Assinante: ${opts.assinante}`, margin, y); y += 13;
  doc.text(`Assinado em: ${new Date(opts.assinado_em).toLocaleString("pt-BR")}`, margin, y); y += 13;
  if (opts.ip) { doc.text(`IP: ${opts.ip}`, margin, y); y += 13; }
  if (opts.user_agent) {
    const uaLines = doc.splitTextToSize(`User-Agent: ${opts.user_agent}`, width);
    uaLines.forEach((l: string) => { doc.text(l, margin, y); y += 12; });
  }

  doc.save(`${opts.titulo.replace(/\s+/g, "_")}_${opts.assinante.replace(/\s+/g, "_")}.pdf`);
}