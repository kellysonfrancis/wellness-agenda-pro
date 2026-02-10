import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: List active services and professionals
    if (req.method === "GET" && action === "options") {
      const [servicesRes, professionalsRes] = await Promise.all([
        client.from("services").select("id, nome, categoria, duracao_min, preco_base, max_alunos").eq("ativo", true).order("nome"),
        client.from("professionals").select("id, nome_exibicao, especialidades").eq("ativo", true).order("nome_exibicao"),
      ]);

      return new Response(JSON.stringify({
        services: servicesRes.data ?? [],
        professionals: professionalsRes.data ?? [],
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // GET: Available slots for a given date, service, and professional
    if (req.method === "GET" && action === "slots") {
      const date = url.searchParams.get("date");
      const serviceId = url.searchParams.get("service_id");
      const profissionalId = url.searchParams.get("profissional_id");

      if (!date || !serviceId || !profissionalId) {
        return new Response(JSON.stringify({ error: "date, service_id e profissional_id são obrigatórios" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Get service duration
      const { data: svc } = await client.from("services").select("duracao_min, max_alunos").eq("id", serviceId).single();
      if (!svc) {
        return new Response(JSON.stringify({ error: "Serviço não encontrado" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const maxAlunos = svc.max_alunos ?? 1;

      // Get existing appointments for that professional on that date
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59`;

      const { data: existing } = await client
        .from("appointments")
        .select("inicio_em, fim_em, service_id")
        .eq("profissional_id", profissionalId)
        .gte("inicio_em", dayStart)
        .lte("inicio_em", dayEnd)
        .not("status", "in", '("cancelado","faltou")');

      // Count how many appointments exist per slot for the same service (for group classes)
      const slotCounts: Record<string, number> = {};
      (existing ?? []).forEach((a: any) => {
        if (a.service_id === serviceId) {
          const key = a.inicio_em;
          slotCounts[key] = (slotCounts[key] || 0) + 1;
        }
      });

      // Generate available slots (8:00 to 20:00)
      const slots: string[] = [];
      const duration = svc.duracao_min;

      for (let h = 8; h < 20; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slotStart = `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
          const slotEnd = new Date(new Date(slotStart).getTime() + duration * 60000).toISOString();

          // Check if professional has any conflicting appointment (different service)
          const hasConflict = (existing ?? []).some((a: any) => {
            if (a.service_id === serviceId) return false; // same service handled by capacity
            const aStart = new Date(a.inicio_em).getTime();
            const aEnd = new Date(a.fim_em).getTime();
            const sStart = new Date(slotStart).getTime();
            const sEnd = new Date(slotEnd).getTime();
            return sStart < aEnd && sEnd > aStart;
          });

          if (hasConflict) continue;

          // Check capacity for group classes
          const count = slotCounts[slotStart] || 0;
          if (count >= maxAlunos) continue;

          slots.push(slotStart);
        }
      }

      return new Response(JSON.stringify({ slots, duracao_min: duration }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // POST: Create booking
    if (req.method === "POST") {
      const { nome, telefone, email, service_id, profissional_id, inicio_em } = await req.json();

      if (!nome || !telefone || !service_id || !profissional_id || !inicio_em) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: nome, telefone, service_id, profissional_id, inicio_em" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate inputs
      const nomeTrim = String(nome).trim().slice(0, 100);
      const telTrim = String(telefone).replace(/\D/g, "").slice(0, 11);
      const emailTrim = email ? String(email).trim().slice(0, 255) : null;

      if (nomeTrim.length < 2) {
        return new Response(JSON.stringify({ error: "Nome deve ter pelo menos 2 caracteres" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      if (telTrim.length < 10) {
        return new Response(JSON.stringify({ error: "Telefone inválido" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Get service duration and category
      const { data: svc } = await client.from("services").select("duracao_min, categoria").eq("id", service_id).single();
      if (!svc) {
        return new Response(JSON.stringify({ error: "Serviço não encontrado" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate against category schedule
      const { data: schedules } = await client.from("category_schedules").select("dias_semana, hora_inicio, hora_fim").eq("categoria", svc.categoria);
      if (schedules && schedules.length > 0) {
        const schedule = schedules[0];
        const startDate = new Date(inicio_em);
        const dayOfWeek = startDate.getUTCDay();
        const hour = startDate.getUTCHours() + startDate.getUTCMinutes() / 60;
        if (!schedule.dias_semana.includes(dayOfWeek)) {
          return new Response(JSON.stringify({ error: "Dia da semana não permitido para esta categoria" }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        if (hour < schedule.hora_inicio || hour >= schedule.hora_fim) {
          return new Response(JSON.stringify({ error: `Horário fora da janela permitida (${schedule.hora_inicio}h - ${schedule.hora_fim}h)` }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      const fimEm = new Date(new Date(inicio_em).getTime() + svc.duracao_min * 60000).toISOString();

      // Find or create client
      let clientId: string;
      const { data: existingClient } = await client
        .from("clients")
        .select("id")
        .eq("telefone", telTrim)
        .limit(1)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await client
          .from("clients")
          .insert({ nome: nomeTrim, telefone: telTrim, email: emailTrim })
          .select("id")
          .single();

        if (clientError || !newClient) {
          return new Response(JSON.stringify({ error: "Erro ao cadastrar cliente" }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        clientId = newClient.id;
      }

      // Create appointment
      const { data: appt, error: apptError } = await client
        .from("appointments")
        .insert({
          client_id: clientId,
          service_id,
          profissional_id,
          inicio_em,
          fim_em: fimEm,
          status: "reservado",
          origem: "cliente",
        })
        .select("id")
        .single();

      if (apptError) {
        return new Response(JSON.stringify({ error: apptError.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ success: true, appointment_id: appt.id }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), {
      status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
