import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Pausa { inicio: number; fim: number; }

function isDateHoliday(date: string, holidays: { data: string; recorrente: boolean }[]): boolean {
  const monthDay = date.slice(5);
  return holidays.some((h) => h.recorrente ? h.data.slice(5) === monthDay : h.data === date);
}

// Input sanitization helpers
function sanitizeName(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 100);
  // Allow letters (including accented), spaces, hyphens, apostrophes, periods
  if (!/^[\p{L}\s\-'.]+$/u.test(trimmed)) return null;
  if (trimmed.length < 2) return null;
  return trimmed;
}

function sanitizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function sanitizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 255).toLowerCase();
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(trimmed)) return null;
  return trimmed;
}

function isValidUUID(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function isValidDateString(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(val) && !isNaN(Date.parse(val));
}

// Rate limiting: 5 POST requests per IP per 15 minutes
async function checkRateLimit(client: any, ip: string): Promise<boolean> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  
  const { count } = await client
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .eq("endpoint", "public-booking")
    .gte("created_at", fifteenMinAgo);

  return (count ?? 0) >= 5;
}

async function recordRequest(client: any, ip: string): Promise<void> {
  await client.from("rate_limits").insert({ ip_address: ip, endpoint: "public-booking" });
  
  // Cleanup old entries (older than 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await client.from("rate_limits").delete().lt("created_at", oneHourAgo);
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || "unknown";
}

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

    // GET: List active services and professionals (with service links)
    if (req.method === "GET" && action === "options") {
      const [servicesRes, professionalsRes, profServicesRes] = await Promise.all([
        client.from("services").select("id, nome, categoria, duracao_min, preco_base, max_alunos").eq("ativo", true).order("nome"),
        client.from("professionals").select("id, nome_exibicao, especialidades").eq("ativo", true).order("nome_exibicao"),
        client.from("professional_services").select("professional_id, service_id"),
      ]);

      return new Response(JSON.stringify({
        services: servicesRes.data ?? [],
        professionals: professionalsRes.data ?? [],
        professional_services: profServicesRes.data ?? [],
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // GET: holidays list
    if (req.method === "GET" && action === "holidays") {
      const { data: holidays } = await client
        .from("holidays")
        .select("data, descricao, recorrente")
        .order("data");

      return new Response(JSON.stringify({ holidays: holidays ?? [] }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // GET: Available slots
    if (req.method === "GET" && action === "slots") {
      const date = url.searchParams.get("date");
      const serviceId = url.searchParams.get("service_id");
      const profissionalId = url.searchParams.get("profissional_id");

      if (!date || !serviceId || !profissionalId) {
        return new Response(JSON.stringify({ error: "date, service_id e profissional_id são obrigatórios" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate parameter formats
      if (!isValidDateString(date) || !isValidUUID(serviceId) || !isValidUUID(profissionalId)) {
        return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: holidays } = await client.from("holidays").select("data, recorrente");
      if (isDateHoliday(date, holidays ?? [])) {
        return new Response(JSON.stringify({ slots: [], duracao_min: 0, blocked: true, reason: "Feriado" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { data: svc } = await client.from("services").select("duracao_min, max_alunos, categoria").eq("id", serviceId).single();
      if (!svc) {
        return new Response(JSON.stringify({ error: "Serviço não encontrado" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Use professional schedules instead of category schedules
      const { data: profSchedules } = await client
        .from("professional_schedules")
        .select("dia_semana, hora_inicio, hora_fim, pausas, ativo")
        .eq("professional_id", profissionalId)
        .eq("ativo", true);

      const dateObj = new Date(date + "T12:00:00");
      const dayOfWeek = dateObj.getDay();

      let schedStart = 8;
      let schedEnd = 20;
      let pausas: Pausa[] = [];

      if (profSchedules && profSchedules.length > 0) {
        const daySched = profSchedules.find((s: any) => s.dia_semana === dayOfWeek);
        if (!daySched) {
          return new Response(JSON.stringify({ slots: [], duracao_min: svc.duracao_min, blocked: true, reason: "Profissional não atende neste dia" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        schedStart = daySched.hora_inicio;
        schedEnd = daySched.hora_fim;
        pausas = daySched.pausas && Array.isArray(daySched.pausas) ? daySched.pausas as Pausa[] : [];
      }

      const maxAlunos = svc.max_alunos ?? 1;
      const dayStart = `${date}T00:00:00`;
      const dayEnd = `${date}T23:59:59`;

      const { data: existing } = await client
        .from("appointments")
        .select("inicio_em, fim_em, service_id")
        .eq("profissional_id", profissionalId)
        .gte("inicio_em", dayStart)
        .lte("inicio_em", dayEnd)
        .not("status", "in", '("cancelado","faltou")');

      const slotCounts: Record<string, number> = {};
      (existing ?? []).forEach((a: any) => {
        if (a.service_id === serviceId) {
          const key = a.inicio_em;
          slotCounts[key] = (slotCounts[key] || 0) + 1;
        }
      });

      const slots: string[] = [];
      const duration = svc.duracao_min;

      for (let h = schedStart; h < schedEnd; h++) {
        const inBreak = pausas.some((p) => h >= p.inicio && h < p.fim);
        if (inBreak) continue;

        for (let m = 0; m < 60; m += 30) {
          const slotHour = h + m / 60;
          if (slotHour >= schedEnd) break;

          const slotEndHour = slotHour + duration / 60;
          const endInBreak = pausas.some((p) => slotEndHour > p.inicio && slotHour < p.fim);
          if (endInBreak) continue;

          const slotStart = `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
          const slotEnd = new Date(new Date(slotStart).getTime() + duration * 60000).toISOString();

          const hasConflict = (existing ?? []).some((a: any) => {
            if (a.service_id === serviceId) return false;
            const aStart = new Date(a.inicio_em).getTime();
            const aEnd = new Date(a.fim_em).getTime();
            const sStart = new Date(slotStart).getTime();
            const sEnd = new Date(slotEnd).getTime();
            return sStart < aEnd && sEnd > aStart;
          });

          if (hasConflict) continue;

          const count = slotCounts[slotStart] || 0;
          if (count >= maxAlunos) continue;

          slots.push(slotStart);
        }
      }

      return new Response(JSON.stringify({ slots, duracao_min: duration }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // POST: Create booking (with rate limiting and input sanitization)
    if (req.method === "POST") {
      const clientIP = getClientIP(req);

      // Rate limit check
      const isLimited = await checkRateLimit(client, clientIP);
      if (isLimited) {
        return new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." }), {
          status: 429, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const body = await req.json();
      const { nome, telefone, email, service_id, profissional_id, inicio_em } = body;

      if (!nome || !telefone || !service_id || !profissional_id || !inicio_em) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: nome, telefone, service_id, profissional_id, inicio_em" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate and sanitize inputs
      const nomeSafe = sanitizeName(String(nome));
      if (!nomeSafe) {
        return new Response(JSON.stringify({ error: "Nome inválido. Use apenas letras, espaços e hífens (mín. 2 caracteres)" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const telSafe = sanitizePhone(String(telefone));
      if (!telSafe) {
        return new Response(JSON.stringify({ error: "Telefone inválido" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const emailSafe = email ? sanitizeEmail(String(email)) : null;
      if (email && !emailSafe) {
        return new Response(JSON.stringify({ error: "Email inválido" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!isValidUUID(String(service_id)) || !isValidUUID(String(profissional_id))) {
        return new Response(JSON.stringify({ error: "IDs inválidos" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!isValidDateString(String(inicio_em))) {
        return new Response(JSON.stringify({ error: "Data/hora inválida" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Record rate limit
      await recordRequest(client, clientIP);

      const { data: svc } = await client.from("services").select("duracao_min, categoria").eq("id", service_id).single();
      if (!svc) {
        return new Response(JSON.stringify({ error: "Serviço não encontrado" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const bookingDate = String(inicio_em).slice(0, 10);
      const { data: holidays } = await client.from("holidays").select("data, recorrente");
      if (isDateHoliday(bookingDate, holidays ?? [])) {
        return new Response(JSON.stringify({ error: "Não é possível agendar em feriados" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate against professional schedule
      const { data: profScheds } = await client
        .from("professional_schedules")
        .select("dia_semana, hora_inicio, hora_fim, pausas")
        .eq("professional_id", profissional_id)
        .eq("ativo", true);

      if (profScheds && profScheds.length > 0) {
        const startDate = new Date(inicio_em);
        const dayOfWeek = startDate.getUTCDay();
        const hour = startDate.getUTCHours() + startDate.getUTCMinutes() / 60;
        const daySched = profScheds.find((s: any) => s.dia_semana === dayOfWeek);
        if (!daySched) {
          return new Response(JSON.stringify({ error: "Profissional não atende neste dia da semana" }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        if (hour < daySched.hora_inicio || hour >= daySched.hora_fim) {
          return new Response(JSON.stringify({ error: "Horário fora da janela permitida" }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        const pausas: Pausa[] = daySched.pausas && Array.isArray(daySched.pausas) ? daySched.pausas as Pausa[] : [];
        for (const pausa of pausas) {
          if (hour >= pausa.inicio && hour < pausa.fim) {
            return new Response(JSON.stringify({ error: "Horário de pausa" }), {
              status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        }
      }

      const fimEm = new Date(new Date(inicio_em).getTime() + svc.duracao_min * 60000).toISOString();

      let clientId: string;
      const { data: existingClient } = await client
        .from("clients")
        .select("id")
        .eq("telefone", telSafe)
        .limit(1)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await client
          .from("clients")
          .insert({ nome: nomeSafe, telefone: telSafe, email: emailSafe })
          .select("id")
          .single();

        if (clientError || !newClient) {
          return new Response(JSON.stringify({ error: "Erro ao cadastrar cliente" }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        clientId = newClient.id;
      }

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
        return new Response(JSON.stringify({ error: "Erro ao criar agendamento" }), {
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
    // Generic error - don't leak internal details
    console.error("public-booking error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
