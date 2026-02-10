import jsPDF from "jspdf";
import { FileDown, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ReceiptData {
  id: string;
  clientName: string;
  valorTotal: number;
  valorPago: number;
  metodo: string;
  pagoEm: string | null;
  contaDestino?: string;
}

const metodoLabel: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateReceipt(data: ReceiptData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Header bar
  doc.setFillColor(30, 100, 80);
  doc.rect(0, 0, w, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGAMENTO", margin, y);
  y += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${data.id.slice(0, 8).toUpperCase()}`, margin, y);
  doc.text(
    `Emitido em: ${new Date().toLocaleDateString("pt-BR")}`,
    w - margin,
    y,
    { align: "right" }
  );

  // Reset colors
  doc.setTextColor(40, 40, 40);
  y = 55;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);

  // Client section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(data.clientName, margin, y);
  y += 14;

  // Payment details box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, w - 2 * margin, 60, 4, 4, "F");
  doc.setDrawColor(200, 210, 210);
  doc.roundedRect(margin, y, w - 2 * margin, 60, 4, 4, "S");

  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");

  const col1 = margin + 8;
  const col2 = w / 2 + 10;

  doc.text("VALOR TOTAL", col1, y);
  doc.text("VALOR PAGO", col2, y);
  y += 7;
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.text(`R$ ${fmt(data.valorTotal)}`, col1, y);
  doc.text(`R$ ${fmt(data.valorPago)}`, col2, y);

  y += 14;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.text("MÉTODO", col1, y);
  doc.text("DATA PAGAMENTO", col2, y);
  y += 7;
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.text(metodoLabel[data.metodo] || data.metodo, col1, y);
  doc.text(
    data.pagoEm ? new Date(data.pagoEm).toLocaleDateString("pt-BR") : "—",
    col2,
    y
  );

  y += 20;

  if (data.contaDestino) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("CONTA DESTINO", col1, y);
    y += 7;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(data.contaDestino, col1, y);
    y += 14;
  }

  // Footer
  y = 240;
  doc.setDrawColor(200, 210, 210);
  doc.line(margin, y, w - margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Este recibo é um comprovante de pagamento gerado eletronicamente.",
    w / 2,
    y,
    { align: "center" }
  );
  y += 5;
  doc.text(
    "Documento válido como comprovante fiscal simplificado.",
    w / 2,
    y,
    { align: "center" }
  );

  doc.save(`Recibo_${data.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast({ title: "Recibo gerado!", description: "PDF salvo com sucesso." });
}

interface ReceiptButtonProps {
  payment: {
    id: string;
    client?: { nome: string } | null;
    valor_total: number;
    valor_pago: number;
    metodo: string;
    pago_em: string | null;
    bank_account?: { nome: string } | null;
    client_id?: string;
    client_telefone?: string;
    appointment_id?: string | null;
  };
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "icon";
}

export default function ReceiptButton({ payment, variant = "ghost", size = "sm" }: ReceiptButtonProps) {
  const [sendingWa, setSendingWa] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    generateReceipt({
      id: payment.id,
      clientName: payment.client?.nome || "Cliente",
      valorTotal: Number(payment.valor_total),
      valorPago: Number(payment.valor_pago),
      metodo: payment.metodo,
      pagoEm: payment.pago_em,
      contaDestino: payment.bank_account?.nome || undefined,
    });
  };

  const handleSendWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();

    let telefone = payment.client_telefone;

    // If we don't have the phone, fetch it
    if (!telefone && payment.client_id) {
      const { data } = await supabase
        .from("clients")
        .select("telefone")
        .eq("id", payment.client_id)
        .maybeSingle();
      telefone = data?.telefone || undefined;
    }

    if (!telefone) {
      toast({ title: "Sem telefone", description: "Cliente não possui telefone cadastrado.", variant: "destructive" });
      return;
    }

    setSendingWa(true);
    try {
      // Determine category from appointment if available
      let categoria = "fisioterapia"; // default
      if (payment.appointment_id) {
        const { data: appt } = await supabase
          .from("appointments")
          .select("services!appointments_service_id_fkey(categoria)")
          .eq("id", payment.appointment_id)
          .maybeSingle();
        if (appt?.services) {
          categoria = (appt.services as any).categoria || "fisioterapia";
        }
      }

      const { error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          tipo: "recibo",
          destinatario: telefone,
          categoria,
          appointment_id: payment.appointment_id || null,
          dados: {
            cliente_nome: payment.client?.nome || "Cliente",
            valor: fmt(Number(payment.valor_pago)),
            metodo: metodoLabel[payment.metodo] || payment.metodo,
            data: payment.pago_em ? new Date(payment.pago_em).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"),
            referencia: payment.id.slice(0, 8).toUpperCase(),
          },
        },
      });

      if (error) throw error;
      toast({ title: "Recibo enviado!", description: `Recibo enviado por WhatsApp para ${payment.client?.nome}.` });
    } catch (err: any) {
      const msg = err?.message || "Erro ao enviar";
      toast({ title: "Erro WhatsApp", description: msg, variant: "destructive" });
    } finally {
      setSendingWa(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button variant={variant} size={size} onClick={handleClick} title="Gerar recibo PDF">
        <FileDown className="h-4 w-4 mr-1" />
        PDF
      </Button>
      <Button variant={variant} size={size} onClick={handleSendWhatsApp} disabled={sendingWa} title="Enviar recibo por WhatsApp">
        {sendingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />}
        WhatsApp
      </Button>
    </div>
  );
}
