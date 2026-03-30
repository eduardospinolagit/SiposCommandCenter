# WhatsApp Business × SLAC — Design Spec

**Data:** 2026-03-25
**Autor:** Eduardo Spinola / Sano Lab
**Status:** Aprovado (v2 — pós revisão)

---

## Visão geral

Integração completa do WhatsApp Business no SLAC CRM em 3 fases sequenciais. A Fase 1 cobre envio de mensagens (livre + templates + IA) e a infraestrutura base de recebimento. A Fase 2 cobre o Inbox. A Fase 3 cobre automação com bot.

Este spec cobre **Fase 1 completa** e a **infraestrutura base da Fase 2**.

---

## Stack

| Componente | Papel |
|-----------|-------|
| Z-API | Envio e recebimento de mensagens WhatsApp |
| Edge Function `wa-send` | Envia mensagem via Z-API (token nunca vai ao browser) |
| Edge Function `gerar-script` | Scraping + geração de script com IA |
| Edge Function `wa-webhook` | Recebe mensagens da Z-API, persiste no banco |
| Apify | Scraping de Instagram e Google Maps |
| Claude API | Adapta script base ao nicho do lead |
| n8n Cloud (Fase 3) | Automações avançadas e sequências |

**Custo mensal:** ~R$75–85 (Z-API ~R$70 + Claude API ~R$5–15; demais grátis)

---

## Arquitetura

```
SLAC (Vue 3)
  │
  ├─► Edge Function: wa-send ──────────────► Z-API ──► WhatsApp do lead
  │     (token nunca sai do servidor)
  │
  ├─► Edge Function: gerar-script
  │     ├─► Apify: Instagram Profile Scraper
  │     ├─► Apify: Google Maps Scraper
  │     └─► Claude API → script adaptado
  │
  └─► Supabase Realtime ◄── Edge Function: wa-webhook ◄── Z-API webhook
                                  └─► tabela conversas
```

**Regra de segurança:** o token Z-API nunca passa pelo browser. O frontend chama sempre uma Edge Function; a Edge Function chama a Z-API usando `ZAPI_TOKEN` como variável de ambiente.

---

## Modelo de dados

### Tabela `conversas` — colunas adicionadas

```sql
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS wa_message_id text;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS status        text DEFAULT 'sent';
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS media_url     text;

-- Evita duplicatas em caso de retry do webhook
ALTER TABLE conversas ADD CONSTRAINT conversas_wa_message_id_unique
  UNIQUE (wa_message_id);
```

Colunas existentes reutilizadas: `id`, `user_id`, `lead_id`, `canal` (= 'whatsapp'), `direcao` ('entrada'|'saida'), `mensagem`, `data`.

### Tabela nova `wa_templates`

```sql
CREATE TABLE wa_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  nome       text NOT NULL,
  etapa      text,
  corpo      text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wa_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_wa_templates" ON wa_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT ALL ON TABLE wa_templates TO authenticated;
```

### Configurações (tabela `configuracoes` existente)

| chave | valor shape | descrição |
|-------|------------|-----------|
| `wa_config` | `{ instance_id }` | Apenas o Instance ID (token vai como env var) |
| `script_base` | `{ texto }` | Script de vendas base para a IA adaptar |

### Variáveis de ambiente das Edge Functions (Supabase Dashboard → Settings → Edge Functions)

- `ZAPI_INSTANCE_ID`
- `ZAPI_TOKEN`
- `APIFY_TOKEN`
- `ANTHROPIC_API_KEY`
- `WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Edge Function: `wa-send`

**Trigger:** POST do SLAC ao clicar "Enviar no WhatsApp".

**Input:**
```json
{ "lead_id": "...", "telefone": "47999999999", "mensagem": "Oi João!" }
```

**Fluxo:**
1. Valida que `lead_id` e `telefone` estão presentes
2. Chama Z-API: `POST https://api.z-api.io/instances/{INSTANCE_ID}/token/{TOKEN}/send-text`
3. Captura `messageId` retornado pela Z-API
4. Insere em `conversas`: `{ canal: 'whatsapp', direcao: 'saida', wa_message_id, mensagem, lead_id, user_id, status: 'sent' }`
5. Retorna `{ ok: true, wa_message_id }`

---

## Edge Function: `gerar-script`

**Trigger:** POST do SLAC ao clicar "Gerar com IA".

**Input:**
```json
{ "lead_id": "...", "instagram": "@perfil", "negocio": "Barbearia do João", "cidade": "Brusque/SC" }
```

**Fluxo:**
1. Busca `script_base` em `configuracoes` via `SUPABASE_SERVICE_ROLE_KEY`
2. Chama Apify — Instagram Profile Scraper (bio, seguidores, posts recentes)
3. Chama Apify — Google Maps Scraper (avaliações, categoria, tem site?)
4. Monta contexto: nicho + presença digital + pontos fracos identificados
5. Chama Claude API com `script_base` + contexto → script personalizado
6. Retorna `{ script: "..." }`

---

## Edge Function: `wa-webhook`

**Trigger:** POST da Z-API ao receber mensagem de qualquer lead.

**Input (Z-API payload):**
```json
{
  "messageId": "...",
  "phone": "5547999999999",
  "text": { "message": "Olá!" },
  "fromMe": false,
  "momment": 1234567890
}
```

**Fluxo:**
1. Valida header `x-webhook-secret` contra `WEBHOOK_SECRET` → 401 se inválido
2. Ignora mensagens `fromMe: true`
3. Normaliza telefone: remove `55` do início, mantém apenas dígitos → `47999999999`
4. Busca lead pelo telefone normalizado na tabela `leads`
5. Se lead não encontrado: loga `[wa-webhook] telefone não encontrado: {telefone}` e retorna 200 (não falha o webhook)
6. Verifica se `wa_message_id` já existe em `conversas` (evita duplicata de retry)
7. Insere em `conversas`: `{ canal: 'whatsapp', direcao: 'entrada', wa_message_id, mensagem, lead_id, user_id }`
8. Retorna `200 OK`

Supabase Realtime propaga via o listener de `conversas` adicionado em `useAppInit.js` (ver seção abaixo).

---

## Atualização em `useAppInit.js`

Adicionar listener da tabela `conversas` no canal Realtime existente:

```js
.on('postgres_changes', {
  event: 'INSERT', schema: 'public', table: 'conversas',
  filter: 'user_id=eq.' + auth.user.id
}, (payload) => {
  // Adiciona ao array só se for do lead com drawer aberto
  const nova = payload.new
  if (leads.conversas.length && leads.conversas[0]?.lead_id === nova.lead_id) {
    leads.conversas.push(nova)
  }
})
```

---

## UI — Drawer do lead (CRMView.vue)

### Nova aba "WhatsApp"

Adicionar terceira aba no drawer:
```
[Dados] [WhatsApp] [Histórico]
```

**Conteúdo da aba WhatsApp:**
- Lista de mensagens filtrada por `lead_id` e `canal = 'whatsapp'`
- Saída alinhada à direita (verde), entrada à esquerda (cinza)
- Status `sent` exibido como ✓ (status de entregue/lido fica para Fase 2, requer webhook adicional da Z-API)
- Dropdown de templates filtrado pela etapa atual do lead
- Botão "✨ Gerar com IA" → chama Edge Function `gerar-script`
- Loading state: "Analisando perfil..." com spinner, campo desabilitado
- Campo de texto editável (pré-preenchido pelo template ou IA)
- Botão "Enviar" → chama Edge Function `wa-send` → salva conversa → atualiza lista

---

## UI — ConfiguracoesView.vue (view nova)

Criar nova view em `/src/views/ConfiguracoesView.vue` (já existe a rota `/configuracoes` no router).

Seção "WhatsApp" com campos:
- Instance ID da Z-API (salvo em `configuracoes` chave `wa_config`)
- Script base (textarea — salvo em `configuracoes` chave `script_base`)
- Botão Salvar com feedback via `useSaving`

**Nota:** o token Z-API nunca aparece nesta UI — é configurado apenas como variável de ambiente no Supabase Dashboard.

---

## Fases futuras (fora deste spec)

**Fase 2 — Inbox:** Nova view `WhatsAppInboxView.vue`. Lista conversas ativas com preview, badge de não lidas, status de entregue/lido (via webhook de status da Z-API). A infraestrutura (webhook + Realtime) já estará pronta.

**Fase 3 — Bot:** n8n recebe webhook Z-API, decide resposta automática via Claude API, atualiza etapa do lead no Supabase.

---

## Critérios de sucesso da Fase 1

- [ ] Enviar mensagem livre → aparece no WhatsApp do lead, salva em `conversas`
- [ ] Selecionar template → preenche campo → editar → enviar
- [ ] "Gerar com IA" com lead com Instagram → script personalizado em <20s
- [ ] Resposta do lead chega via webhook → aparece na aba WhatsApp sem recarregar
- [ ] Token Z-API nunca aparece no DevTools do browser
- [ ] Credenciais configuráveis em `/configuracoes` sem tocar no código
- [ ] Webhook duplicado não gera mensagem duplicada no drawer
