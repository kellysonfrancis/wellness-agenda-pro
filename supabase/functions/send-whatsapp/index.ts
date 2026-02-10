import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { tipo, destinatario, appointment_id, categoria, dados } = body;
    // tipo: 'lembrete' | 'confirmacao' | 'recibo'
    // destinatario: phone number (with country code, e.g. 5511999999999)
    // categoria: 'pilates' | 'fisioterapia' | 'estetica'
    // dados: object with message-specific data

    if (!tipo || !destinatario || !categoria) {
      return new Response(JSON.stringify({ error: "tipo, destinatario e categoria são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the WhatsApp line configured for this category
    const { data: lines, error: linesError } = await adminClient
      .from("whatsapp_lines")
      .select("*")
      .contains("categorias", [categoria]);

    if (linesError) throw linesError;

    if (!lines || lines.length === 0) {
      return new Response(JSON.stringify({ error: `Nenhuma linha WhatsApp configurada para a categoria "${categoria}"` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const line = lines[0];

    // Check if this message type is enabled on this line
    const typeEnabled = (tipo === "lembrete" && line.reminder_enabled) ||
                        (tipo === "confirmacao" && line.confirm_enabled) ||
                        (tipo === "recibo" && line.receipt_enabled);

    if (!typeEnabled) {
      return new Response(JSON.stringify({ error: `Tipo "${tipo}" não está habilitado na linha "${line.label}"` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the message based on type
    const messagePayload = buildMessage(tipo, destinatario, dados);

    // Send via Meta Cloud API
    const metaResponse = await fetch(`${META_API}/${line.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${line.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    });

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error("Meta API error:", JSON.stringify(metaData));

      // Log the error
      await adminClient.from("whatsapp_log").insert({
        line_id: line.id,
        tipo,
        destinatario,
        appointment_id: appointment_id || null,
        status: "erro",
        erro: JSON.stringify(metaData.error || metaData),
      });

      return new Response(JSON.stringify({
        error: "Falha ao enviar mensagem WhatsApp",
        details: metaData.error?.message || "Erro desconhecido da Meta API",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaMessageId = metaData.messages?.[0]?.id || null;

    // Log success
    await adminClient.from("whatsapp_log").insert({
      line_id: line.id,
      tipo,
      destinatario,
      appointment_id: appointment_id || null,
      status: "enviado",
      meta_message_id: metaMessageId,
    });

    return new Response(JSON.stringify({
      success: true,
      message_id: metaMessageId,
      line_label: line.label,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in send-whatsapp:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildMessage(tipo: string, destinatario: string, dados: any) {
  const phone = destinatario.replace(/\D/g, "");

  // Using template messages (required for business-initiated conversations)
  // If templates aren't set up yet, fall back to text messages (only works in 24h window)
  if (dados?.template_name) {
    return {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: dados.template_name,
        language: { code: dados.template_language || "pt_BR" },
        components: dados.template_components || [],
      },
    };
  }

  // Fallback: plain text messages (works only within 24h conversation window)
  let text = "";

  switch (tipo) {
    case "lembrete":
      text = `Olá${dados?.cliente_nome ? `, ${dados.cliente_nome}` : ""}! 🕐\n\n` +
        `Lembrete do seu agendamento:\n` +
        `📅 ${dados?.data || "Data não informada"}\n` +
        `⏰ ${dados?.horario || "Horário não informado"}\n` +
        `💆 ${dados?.servico || "Serviço"}\n` +
        `👩‍⚕️ ${dados?.profissional || ""}\n\n` +
        `Em caso de dúvidas, entre em contato conosco.`;
      break;

    case "confirmacao":
      text = `Olá${dados?.cliente_nome ? `, ${dados.cliente_nome}` : ""}! ✅\n\n` +
        `Por favor, confirme sua presença:\n` +
        `📅 ${dados?.data || "Data não informada"}\n` +
        `⏰ ${dados?.horario || "Horário não informado"}\n` +
        `💆 ${dados?.servico || "Serviço"}\n\n` +
        `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;
      break;

    case "recibo":
      text = `Olá${dados?.cliente_nome ? `, ${dados.cliente_nome}` : ""}! 🧾\n\n` +
        `Recibo de pagamento:\n` +
        `💰 Valor: R$ ${dados?.valor || "0,00"}\n` +
        `💳 Método: ${dados?.metodo || "Não informado"}\n` +
        `📅 Data: ${dados?.data || "Não informada"}\n` +
        `📝 Ref: ${dados?.referencia || ""}\n\n` +
        `Obrigado pela preferência! 😊`;
      break;

    default:
      text = dados?.mensagem || "Mensagem da clínica.";
  }

  return {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: text },
  };
}
