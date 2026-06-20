## Integração WhatsApp via Evolution API

Vamos adicionar a **Evolution API** como um segundo provedor de WhatsApp, lado a lado com a Meta Cloud API que já existe. Cada "linha" cadastrada em `whatsapp_lines` poderá escolher entre `meta` e `evolution`.

### Antes de começar — você precisa hospedar a Evolution API

A Evolution API é open-source e roda no seu próprio servidor (não tem SaaS oficial). Opções comuns:

- **Docker em VPS** (Hostinger, DigitalOcean, Contabo, Hetzner — ~US$ 5–10/mês). O repositório oferece `docker-compose.yml` pronto.
- **Railway / Render / Fly.io** com a imagem `atendai/evolution-api`.
- **EasyPanel / Coolify** em VPS, com template pré-pronto da Evolution.

Você vai precisar ao final ter:
1. Uma **URL pública HTTPS** (ex.: `https://evo.seudominio.com`).
2. Uma **API Key global** (variável `AUTHENTICATION_API_KEY` definida no servidor).

Posso te orientar passo a passo com Docker em VPS quando você escolher onde hospedar. Enquanto isso, sigo construindo a integração no app.

---

### O que será implementado

#### 1. Banco de dados (1 migration)

Em `whatsapp_lines`:

- `provider text not null default 'meta'` — `'meta'` ou `'evolution'`.
- `evolution_url text` — URL base do servidor Evolution.
- `evolution_instance text` — nome da instância (ex.: `clinica-recepcao`).
- `evolution_api_key text` — API key (global ou da instância).
- `evolution_status text` — `disconnected | qr | connected`.
- `evolution_phone text` — número conectado (preenchido após pareamento).

Tornar `access_token` e `phone_number_id` **nullable** (hoje são obrigatórios — só fazem sentido para Meta).

Secret novo: `EVOLUTION_WEBHOOK_TOKEN` (token aleatório que validamos no webhook).

#### 2. Edge function nova: `evolution-manage`

POST autenticado (apenas admin). Ações:

- `create_instance` — chama `POST {url}/instance/create` com `{ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS", webhook: {...} }`. Registra o webhook do app automaticamente.
- `qrcode` — `GET {url}/instance/connect/{instance}` → devolve QR Code base64 para o front exibir.
- `status` — `GET {url}/instance/connectionState/{instance}` → atualiza `evolution_status` e `evolution_phone`.
- `logout` — `DELETE {url}/instance/logout/{instance}`.
- `delete` — `DELETE {url}/instance/delete/{instance}` + remove linha.

#### 3. Edge function nova: `evolution-webhook`

- Público (sem JWT), recebe eventos da Evolution: `messages.upsert`, `connection.update`, `qrcode.updated`.
- Valida via header `apikey` comparada ao `EVOLUTION_WEBHOOK_TOKEN`.
- Em `messages.upsert`: replica a lógica atual do `whatsapp-webhook` (SIM/NÃO → confirma/cancela agendamento, atualiza `whatsapp_log`).
- Em `connection.update`: atualiza `evolution_status` e `evolution_phone` na `whatsapp_lines`.

#### 4. `send-whatsapp` atualizado

Após escolher a `line` pela categoria, ramificar:

- `line.provider === 'meta'` → fluxo atual (Graph API).
- `line.provider === 'evolution'` → `POST {url}/message/sendText/{instance}` com `{ number, text }`. Para mídia (recibos PDF/imagem) → `POST /message/sendMedia/{instance}`. Log permanece igual em `whatsapp_log`.

#### 5. `save-whatsapp-config` atualizado

- Aceita `provider` no body.
- Para `evolution`: valida URL+API key chamando `GET {url}/instance/fetchInstances` antes de salvar; "test" envia texto para `test_phone`.
- Para `meta`: comportamento atual intocado.

#### 6. UI — `src/pages/Configuracoes.tsx`

Na tela de configuração de WhatsApp:

- Seletor "Provedor": **Meta Cloud API** | **Evolution API**.
- Se Meta: campos atuais (Token, Phone Number ID).
- Se Evolution: campos URL, Instância, API Key + botões:
  - "Criar instância e gerar QR Code" → abre modal com QR em base64 (polling de status a cada 3s, fecha quando `connected`).
  - "Reconectar" / "Desconectar" / "Excluir".
  - Indicador de status (Desconectado / Aguardando QR / Conectado: +55 11 9xxxx-xxxx).

### Detalhes técnicos

- Endpoints Evolution (v2): `/instance/create`, `/instance/connect/{name}`, `/instance/connectionState/{name}`, `/instance/logout/{name}`, `/instance/delete/{name}`, `/message/sendText/{name}`, `/message/sendMedia/{name}`. Autenticação por header `apikey: <API_KEY>`.
- Webhook URL registrada na criação da instância: `https://<project>.functions.supabase.co/evolution-webhook` com header `apikey: $EVOLUTION_WEBHOOK_TOKEN` (Evolution permite custom headers no webhook).
- O `phone` no envio segue o formato `5511999999999@s.whatsapp.net` — a função converte automaticamente a partir do telefone bruto.
- Mídia: aceita `base64` ou URL pública. Usaremos `mediatype: "image"` ou `"document"`.
- Nenhuma alteração no `whatsapp-webhook` da Meta — continua atendendo as linhas Meta.

### Arquivos afetados

- **Migration nova** — colunas em `whatsapp_lines`, nullability dos campos Meta.
- **Edge functions novas** — `supabase/functions/evolution-manage/index.ts`, `supabase/functions/evolution-webhook/index.ts`.
- **Edge functions editadas** — `send-whatsapp`, `save-whatsapp-config`.
- **Front** — `src/pages/Configuracoes.tsx` (componente de configuração WhatsApp) + novo componente de QR Code.
- **Secrets** — pedirei `EVOLUTION_WEBHOOK_TOKEN` quando passarmos para a implementação.

### Fora deste plano

- Recebimento de mensagens livres (chat completo) — só processamos SIM/NÃO como hoje.
- Disparo em massa / campanhas.
- Subir/operar o servidor da Evolution API por você (te oriento, mas a hospedagem é sua).
