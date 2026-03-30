# WhatsApp Business × SLAC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar Z-API + Claude API + Apify ao SLAC para enviar mensagens WhatsApp diretamente do drawer do lead, gerar scripts personalizados por IA e receber respostas em tempo real.

**Architecture:** Frontend Vue 3 chama Edge Functions (nunca Z-API diretamente). `wa-send` envia mensagens, `gerar-script` orquestra scraping + IA, `wa-webhook` recebe respostas e persiste via Supabase Realtime. Store `wa.js` gerencia templates e expõe funções para o CRMView.

**Tech Stack:** Vue 3 + Pinia, Supabase Edge Functions (Deno), Z-API REST, Apify REST, Claude API (anthropic SDK), Supabase Realtime

---

## Mapa de arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `supabase/functions/wa-send/index.ts` | Envia mensagem via Z-API, salva em conversas |
| Criar | `supabase/functions/gerar-script/index.ts` | Apify scraping + Claude API → script |
| Criar | `supabase/functions/wa-webhook/index.ts` | Recebe webhook Z-API, persiste mensagem |
| Criar | `src/stores/wa.js` | Templates CRUD, chamadas às Edge Functions |
| Criar | `src/views/ConfiguracoesView.vue` | UI para Instance ID Z-API e script base |
| Modificar | `src/views/CRMView.vue` | Adiciona abas + aba WhatsApp no drawer |
| Modificar | `src/composables/useAppInit.js` | Listener Realtime para tabela conversas |

---

## Task 1: Migrations SQL no Supabase

**Arquivos:** Supabase SQL Editor (não gera arquivo local)

- [ ] **Passo 1: Abrir SQL Editor**

  Supabase Dashboard → seu projeto → SQL Editor → New query

- [ ] **Passo 2: Executar SQL de extensão da tabela `conversas`**

```sql
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS wa_message_id text;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS status        text DEFAULT 'sent';
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS media_url     text;

ALTER TABLE conversas ADD CONSTRAINT conversas_wa_message_id_unique
  UNIQUE (wa_message_id);
```

- [ ] **Passo 3: Executar SQL de criação da tabela `wa_templates`**

```sql
CREATE TABLE IF NOT EXISTS wa_templates (
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

- [ ] **Passo 4: Verificar**

  Table Editor → confirmar colunas `wa_message_id`, `status`, `media_url` em `conversas` e tabela `wa_templates` criada.

- [ ] **Passo 5: Commit**

```bash
git add docs/superpowers/plans/2026-03-25-whatsapp-integration.md
git commit -m "docs: adiciona plano de implementação WhatsApp × SLAC"
```

---

## Task 2: Edge Function `wa-send`

**Arquivos:**
- Criar: `supabase/functions/wa-send/index.ts`

- [ ] **Passo 1: Criar o arquivo**

```typescript
// supabase/functions/wa-send/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZAPI_INSTANCE = Deno.env.get('ZAPI_INSTANCE_ID')!
const ZAPI_TOKEN    = Deno.env.get('ZAPI_TOKEN')!
const SB_URL        = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { lead_id, user_id, telefone, mensagem } = await req.json()
    if (!lead_id || !telefone || !mensagem || !user_id) {
      return json({ error: 'lead_id, user_id, telefone e mensagem são obrigatórios' }, 400)
    }

    // Normaliza telefone: mantém apenas dígitos, garante DDI 55
    const tel = telefone.replace(/\D/g, '')
    const telZapi = tel.startsWith('55') ? tel : '55' + tel

    // Chama Z-API para enviar
    const zapiRes = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: telZapi, message: mensagem }),
      }
    )

    if (!zapiRes.ok) {
      const err = await zapiRes.text()
      console.error('[wa-send] Z-API erro:', err)
      return json({ error: 'Falha ao enviar pelo WhatsApp', detail: err }, 502)
    }

    const zapiData = await zapiRes.json()
    const waMessageId = zapiData?.zaapId || zapiData?.messageId || null

    // Persiste em conversas
    const sb = createClient(SB_URL, SB_SERVICE)
    const { error: dbError } = await sb.from('conversas').insert({
      id: 'wa_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      user_id,
      lead_id,
      canal: 'whatsapp',
      direcao: 'enviado',
      mensagem,
      wa_message_id: waMessageId,
      status: 'sent',
      data: new Date().toISOString(),
    })

    if (dbError) {
      console.error('[wa-send] DB erro:', dbError)
      return json({ error: 'Mensagem enviada mas falhou ao salvar' }, 500)
    }

    return json({ ok: true, wa_message_id: waMessageId })
  } catch (e) {
    console.error('[wa-send] erro:', e)
    return json({ error: 'Erro interno' }, 500)
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Passo 2: Configurar variáveis de ambiente no Supabase**

  Supabase Dashboard → Settings → Edge Functions → adicionar:
  - `ZAPI_INSTANCE_ID` = seu Instance ID da Z-API
  - `ZAPI_TOKEN` = seu Token da Z-API
  - `SUPABASE_URL` = URL do projeto (já existe automaticamente)
  - `SUPABASE_SERVICE_ROLE_KEY` = service role key (já existe automaticamente)

- [ ] **Passo 3: Deploy**

```bash
npx supabase functions deploy wa-send --project-ref jqmnmudfxxdcjfradvcj
```

- [ ] **Passo 4: Verificar manualmente**

  No browser console (com sessão logada no SLAC):
```js
const { data: { session } } = await window.__sb.auth.getSession()
const res = await fetch('https://jqmnmudfxxdcjfradvcj.supabase.co/functions/v1/wa-send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + session.access_token
  },
  body: JSON.stringify({
    lead_id: 'test',
    user_id: session.user.id,
    telefone: '47999999999',
    mensagem: 'Teste de integração SLAC'
  })
})
console.log(await res.json())
```
  Esperado: `{ ok: true, wa_message_id: "..." }` e mensagem chegando no WhatsApp.

- [ ] **Passo 5: Commit**

```bash
git add supabase/functions/wa-send/index.ts
git commit -m "feat: edge function wa-send — envia mensagem via Z-API"
```

---

## Task 3: Edge Function `gerar-script`

**Arquivos:**
- Criar: `supabase/functions/gerar-script/index.ts`

- [ ] **Passo 1: Criar o arquivo**

```typescript
// supabase/functions/gerar-script/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const APIFY_TOKEN     = Deno.env.get('APIFY_TOKEN')!
const ANTHROPIC_KEY   = Deno.env.get('ANTHROPIC_API_KEY')!
const SB_URL          = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { user_id, instagram, negocio, cidade } = await req.json()
    if (!user_id || !negocio) {
      return json({ error: 'user_id e negocio são obrigatórios' }, 400)
    }

    // Busca script_base do usuário
    const sb = createClient(SB_URL, SB_SERVICE)
    const { data: configData } = await sb
      .from('configuracoes')
      .select('valor')
      .eq('user_id', user_id)
      .eq('chave', 'script_base')
      .maybeSingle()
    const scriptBase = configData?.valor?.texto || ''

    // Scraping paralelo: Instagram + Google Maps
    const [igData, gmData] = await Promise.allSettled([
      instagram ? buscarInstagram(instagram) : Promise.resolve(null),
      buscarGoogleMaps(negocio, cidade),
    ])

    const igInfo  = igData.status  === 'fulfilled' ? igData.value  : null
    const gmInfo  = gmData.status  === 'fulfilled' ? gmData.value  : null

    // Monta contexto para a IA
    const contexto = montarContexto({ negocio, cidade, instagram, igInfo, gmInfo })

    // Gera script com Claude
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Você é um especialista em vendas de sites para pequenos negócios locais.

SCRIPT BASE (seu template de prospecção):
${scriptBase || '(sem script base configurado — use seu melhor julgamento)'}

CONTEXTO DO LEAD:
${contexto}

Adapte o script base para este lead específico. Mantenha o mesmo tom e estrutura, mas personalize com detalhes reais do negócio deles. Seja direto e natural. Máximo 3 parágrafos curtos. Não use asteriscos ou formatação — texto puro apenas.`
      }]
    })

    const script = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return json({ script })
  } catch (e) {
    console.error('[gerar-script] erro:', e)
    return json({ error: 'Erro ao gerar script' }, 500)
  }
})

async function buscarInstagram(handle: string) {
  const username = handle.replace('@', '')
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=20`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username] }),
    }
  )
  if (!runRes.ok) return null
  const data = await runRes.json()
  const p = data?.[0]
  if (!p) return null
  return {
    seguidores: p.followersCount,
    bio: p.biography,
    posts: p.postsCount,
    temSite: !!p.externalUrl,
  }
}

async function buscarGoogleMaps(negocio: string, cidade: string) {
  const query = `${negocio} ${cidade || ''}`.trim()
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=25`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: 1,
        language: 'pt',
      }),
    }
  )
  if (!runRes.ok) return null
  const data = await runRes.json()
  const p = data?.[0]
  if (!p) return null
  return {
    avaliacao: p.totalScore,
    avaliacoes: p.reviewsCount,
    categoria: p.categoryName,
    temSite: !!p.website,
    descricao: p.description,
  }
}

function montarContexto({ negocio, cidade, instagram, igInfo, gmInfo }: {
  negocio: string, cidade: string, instagram: string,
  igInfo: Record<string,unknown> | null, gmInfo: Record<string,unknown> | null
}) {
  const linhas = [
    `Negócio: ${negocio}`,
    cidade ? `Cidade: ${cidade}` : null,
  ]

  if (igInfo) {
    linhas.push(`Instagram (@${instagram?.replace('@','')}): ${igInfo.seguidores} seguidores, ${igInfo.posts} posts`)
    if (igInfo.bio)     linhas.push(`Bio: ${igInfo.bio}`)
    if (!igInfo.temSite) linhas.push('Ponto fraco: não tem site no Instagram')
  } else if (instagram) {
    linhas.push(`Instagram: @${instagram?.replace('@','')} (não foi possível buscar dados)`)
  }

  if (gmInfo) {
    linhas.push(`Google Maps: ${gmInfo.avaliacao}⭐ (${gmInfo.avaliacoes} avaliações), categoria: ${gmInfo.categoria}`)
    if (!gmInfo.temSite) linhas.push('Ponto fraco: não tem site no Google Maps')
    if (gmInfo.descricao) linhas.push(`Descrição: ${String(gmInfo.descricao).slice(0, 150)}`)
  }

  return linhas.filter(Boolean).join('\n')
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Passo 2: Adicionar variável de ambiente**

  Supabase Dashboard → Settings → Edge Functions:
  - `APIFY_TOKEN` = seu token da Apify
  - `ANTHROPIC_API_KEY` = sua chave da API do Claude

- [ ] **Passo 3: Deploy**

```bash
npx supabase functions deploy gerar-script --project-ref jqmnmudfxxdcjfradvcj
```

- [ ] **Passo 4: Verificar manualmente**

  No browser console (com sessão logada):
```js
const { data: { session } } = await window.__sb.auth.getSession()
const res = await fetch('https://jqmnmudfxxdcjfradvcj.supabase.co/functions/v1/gerar-script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + session.access_token
  },
  body: JSON.stringify({
    user_id: session.user.id,
    negocio: 'Barbearia do João',
    cidade: 'Brusque/SC',
    instagram: '@barbeariadojoao'
  })
})
console.log(await res.json())
```
  Esperado: `{ script: "Oi João! Vi que a Barbearia do João..." }`

- [ ] **Passo 5: Commit**

```bash
git add supabase/functions/gerar-script/index.ts
git commit -m "feat: edge function gerar-script — Apify + Claude API"
```

---

## Task 4: Edge Function `wa-webhook`

**Arquivos:**
- Criar: `supabase/functions/wa-webhook/index.ts`

- [ ] **Passo 1: Criar o arquivo**

```typescript
// supabase/functions/wa-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!
const SB_URL         = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Valida segredo
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== WEBHOOK_SECRET) {
    console.warn('[wa-webhook] secret inválido')
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const payload = await req.json()

    // Ignora mensagens enviadas pelo próprio número
    if (payload.fromMe) {
      return new Response('ok', { status: 200 })
    }

    // Normaliza telefone: remove 55 do início, mantém só dígitos
    const rawPhone  = String(payload.phone || '').replace(/\D/g, '')
    const telefone  = rawPhone.startsWith('55') ? rawPhone.slice(2) : rawPhone
    const mensagem  = payload.text?.message || payload.body || ''
    const waMessageId = payload.messageId || payload.id || null

    if (!telefone || !mensagem) {
      return new Response('ok', { status: 200 })
    }

    const sb = createClient(SB_URL, SB_SERVICE)

    // Busca lead pelo telefone (compara apenas dígitos)
    const { data: leads } = await sb
      .from('leads')
      .select('id, user_id')
      .or(`telefone.eq.${telefone},telefone.eq.55${telefone}`)
      .limit(1)

    if (!leads?.length) {
      console.log(`[wa-webhook] telefone não encontrado: ${telefone}`)
      return new Response('ok', { status: 200 })
    }

    const lead = leads[0]

    // Insere em conversas (ignora duplicata pelo constraint UNIQUE)
    const { error } = await sb.from('conversas').insert({
      id: 'wa_in_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      user_id: lead.user_id,
      lead_id: lead.id,
      canal: 'whatsapp',
      direcao: 'recebido',
      mensagem,
      wa_message_id: waMessageId,
      status: 'received',
      data: new Date().toISOString(),
    })

    if (error && !error.message.includes('unique')) {
      console.error('[wa-webhook] erro ao inserir:', error)
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('[wa-webhook] erro:', e)
    return new Response('ok', { status: 200 }) // sempre 200 para a Z-API não fazer retry
  }
})
```

- [ ] **Passo 2: Adicionar variável de ambiente**

  Supabase Dashboard → Settings → Edge Functions:
  - `WEBHOOK_SECRET` = uma string secreta qualquer (ex: gerar com `openssl rand -hex 20`)

- [ ] **Passo 3: Deploy**

```bash
npx supabase functions deploy wa-webhook --no-verify-jwt --project-ref jqmnmudfxxdcjfradvcj
```

- [ ] **Passo 4: Configurar webhook na Z-API**

  Z-API Dashboard → sua instância → Webhooks:
  - URL: `https://jqmnmudfxxdcjfradvcj.supabase.co/functions/v1/wa-webhook`
  - Header: `x-webhook-secret: {seu WEBHOOK_SECRET}`
  - Eventos: `ReceivedCallback`

- [ ] **Passo 5: Verificar via curl**

```bash
curl -X POST https://jqmnmudfxxdcjfradvcj.supabase.co/functions/v1/wa-webhook \
  -H "x-webhook-secret: SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "test_123",
    "phone": "5547999999999",
    "text": { "message": "Oi, vi o site de vocês!" },
    "fromMe": false
  }'
```
  Esperado: `ok` com status 200 e linha nova em `conversas` no Supabase.

- [ ] **Passo 6: Commit**

```bash
git add supabase/functions/wa-webhook/index.ts
git commit -m "feat: edge function wa-webhook — recebe mensagens Z-API"
```

---

## Task 5: Store `wa.js`

**Arquivos:**
- Criar: `src/stores/wa.js`

- [ ] **Passo 1: Criar o store**

```js
// src/stores/wa.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'

export const useWaStore = defineStore('wa', () => {
  const templates = ref([])
  const config    = ref({ instance_id: '' })
  const scriptBase = ref('')

  async function loadTemplates() {
    const { data, error } = await sb
      .from('wa_templates').select('*')
      .eq('user_id', uid())
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return }
    templates.value = data || []
  }

  async function saveTemplate(t) {
    const row = { ...t, user_id: uid() }
    const { data, error } = await sb
      .from('wa_templates').upsert(row, { onConflict: 'id' })
      .select().single()
    if (error) throw error
    const idx = templates.value.findIndex(x => x.id === data.id)
    if (idx !== -1) templates.value[idx] = data
    else templates.value.push(data)
    return data
  }

  async function deleteTemplate(id) {
    await sb.from('wa_templates').delete().eq('id', id).eq('user_id', uid())
    templates.value = templates.value.filter(t => t.id !== id)
  }

  async function loadConfig() {
    const { data } = await sb
      .from('configuracoes').select('chave, valor')
      .eq('user_id', uid())
      .in('chave', ['wa_config', 'script_base'])
    const waConf  = data?.find(r => r.chave === 'wa_config')
    const script  = data?.find(r => r.chave === 'script_base')
    config.value.instance_id = waConf?.valor?.instance_id || ''
    scriptBase.value = script?.valor?.texto || ''
  }

  async function saveConfig(instanceId, script) {
    const userId = uid()
    await Promise.all([
      sb.from('configuracoes').upsert({
        id: userId + '_wa_config', user_id: userId,
        chave: 'wa_config', valor: { instance_id: instanceId },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }),
      sb.from('configuracoes').upsert({
        id: userId + '_script_base', user_id: userId,
        chave: 'script_base', valor: { texto: script },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }),
    ])
    config.value.instance_id = instanceId
    scriptBase.value = script
  }

  async function enviarMensagem(leadId, userId, telefone, mensagem) {
    const { data, error } = await sb.functions.invoke('wa-send', {
      body: { lead_id: leadId, user_id: userId, telefone, mensagem }
    })
    if (error) throw error
    if (!data?.ok) throw new Error(data?.error || 'Falha ao enviar')
    return data
  }

  async function gerarScript(userId, instagram, negocio, cidade) {
    const { data, error } = await sb.functions.invoke('gerar-script', {
      body: { user_id: userId, instagram, negocio, cidade }
    })
    if (error) throw error
    if (!data?.script) throw new Error(data?.error || 'Falha ao gerar script')
    return data.script
  }

  return {
    templates, config, scriptBase,
    loadTemplates, saveTemplate, deleteTemplate,
    loadConfig, saveConfig, enviarMensagem, gerarScript,
  }
})
```

- [ ] **Passo 2: Verificar no browser**

  Abrir SLAC no dev, console:
```js
const wa = window.__pinia._s.get('wa') // só para debug — remover depois
```

- [ ] **Passo 3: Commit**

```bash
git add src/stores/wa.js
git commit -m "feat: store wa — templates, config e wrappers de Edge Functions"
```

---

## Task 6: ConfiguracoesView.vue

**Arquivos:**
- Criar: `src/views/ConfiguracoesView.vue`

- [ ] **Passo 1: Criar a view**

```vue
<!-- src/views/ConfiguracoesView.vue -->
<template>
  <div class="page-layout">
    <div class="page-header">
      <div>
        <h1 class="page-title">Configurações</h1>
        <p class="page-subtitle">Integrações e preferências do SLAC</p>
      </div>
    </div>

    <div class="card" style="max-width:560px">
      <div class="card-header">
        <h2 class="card-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent)"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp Business
        </h2>
      </div>
      <div style="padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
        <div class="form-group">
          <label class="form-label">Instance ID (Z-API)</label>
          <input v-model="instanceId" class="form-input" placeholder="Ex: 3C4F2A1B..." />
          <p class="text-muted text-sm" style="margin-top:.35rem">Encontre em: Z-API Dashboard → sua instância → Instance ID</p>
        </div>
        <div class="form-group">
          <label class="form-label">Script base de prospecção</label>
          <textarea v-model="scriptBase" class="form-textarea" rows="8"
            placeholder="Cole aqui seu script de vendas. A IA vai adaptar este texto para cada lead com base no Instagram e Google do negócio deles..." />
          <p class="text-muted text-sm" style="margin-top:.35rem">Use {{nome}}, {{negocio}}, {{cidade}} como variáveis opcionais.</p>
        </div>
        <button class="btn btn-primary" style="align-self:flex-start" @click="salvar">
          Salvar configurações
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useWaStore } from '@/stores/wa'
import { useSaving } from '@/composables/useSaving'

const wa      = useWaStore()
const { run } = useSaving()

const instanceId = ref('')
const scriptBase = ref('')

onMounted(async () => {
  await wa.loadConfig()
  instanceId.value = wa.config.instance_id
  scriptBase.value = wa.scriptBase
})

async function salvar() {
  await run(
    () => wa.saveConfig(instanceId.value, scriptBase.value),
    'Configurações salvas'
  )
}
</script>
```

- [ ] **Passo 2: Verificar no browser**

  Navegar para `/configuracoes` — deve mostrar a página sem erros, preencher e salvar.
  Conferir no Supabase → configuracoes → linhas `wa_config` e `script_base` criadas.

- [ ] **Passo 3: Commit**

```bash
git add src/views/ConfiguracoesView.vue
git commit -m "feat: ConfiguracoesView — Instance ID Z-API e script base"
```

---

## Task 7: Realtime para `conversas` em `useAppInit.js`

**Arquivos:**
- Modificar: `src/composables/useAppInit.js`

- [ ] **Passo 1: Adicionar listener da tabela `conversas` no canal Realtime existente**

  No arquivo `src/composables/useAppInit.js`, dentro do bloco `realtimeChannel = sb.channel(...)`, adicionar após o listener de `configuracoes`:

```js
.on('postgres_changes', {
  event: 'INSERT', schema: 'public', table: 'conversas',
  filter: 'user_id=eq.' + auth.user.id
}, (payload) => {
  const nova = payload.new
  // Adiciona ao array só se for do lead com drawer aberto
  if (nova.lead_id === leads.drawerLeadId) {
    leads.conversas.push(nova)
  }
})
```

- [ ] **Passo 2: Expor `drawerLeadId` na store `leads.js`**

  Em `src/stores/leads.js`, adicionar um `ref` para o lead aberto:

```js
// Adicionar junto às outras refs
const drawerLeadId = ref(null)
```

  E exportar no `return`:
```js
return { leads, conversas, undoStack, drawerLeadId, load, loadConversas, ... }
```

- [ ] **Passo 3: Setar `drawerLeadId` no CRMView ao abrir drawer**

  Em `src/views/CRMView.vue`, na função que abre o drawer (onde chama `leads.loadConversas(id)`), adicionar:
```js
leads.drawerLeadId = lead.id
```

  E ao fechar o drawer:
```js
leads.drawerLeadId = null
```

- [ ] **Passo 4: Verificar**

  Abrir drawer de um lead no SLAC, enviar uma mensagem de teste pelo WhatsApp para o número cadastrado — a mensagem deve aparecer no drawer sem recarregar.

- [ ] **Passo 5: Commit**

```bash
git add src/composables/useAppInit.js src/stores/leads.js
git commit -m "feat: realtime para conversas WhatsApp no drawer"
```

---

## Task 8: Aba WhatsApp no drawer do CRMView

**Arquivos:**
- Modificar: `src/views/CRMView.vue`

Esta é a tarefa mais extensa. Consiste em:
1. Adicionar sistema de abas ao drawer
2. Reorganizar conteúdo existente nas abas "Dados" e "Histórico"
3. Criar aba "WhatsApp" com chat + templates + IA

- [ ] **Passo 1: Adicionar `drawerTab` ref e importar store wa**

  No `<script setup>` do CRMView.vue, adicionar:
```js
import { useWaStore } from '@/stores/wa'
const wa = useWaStore()
const drawerTab = ref('dados') // 'dados' | 'whatsapp' | 'historico'

// Estado da aba WhatsApp
const waMensagem = ref('')
const waGerandoScript = ref(false)
const waEnviando = ref(false)
const waTemplateId = ref('')
```

- [ ] **Passo 2: Carregar templates ao abrir drawer**

  Na função que abre o drawer (onde chama `leads.loadConversas`), adicionar:
```js
drawerTab.value = 'dados'
leads.drawerLeadId = lead.id
waMensagem.value = ''
waTemplateId.value = ''
await Promise.all([
  leads.loadConversas(lead.id),
  wa.loadTemplates(),
])
```

- [ ] **Passo 3: Adicionar as abas no template do drawer**

  Logo após `<div class="drawer-header">`, antes do `<div class="drawer-body">`, adicionar:
```html
<div class="drawer-tabs">
  <button class="drawer-tab" :class="{ active: drawerTab === 'dados' }"    @click="drawerTab = 'dados'">Dados</button>
  <button class="drawer-tab" :class="{ active: drawerTab === 'whatsapp' }" @click="drawerTab = 'whatsapp'">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    WhatsApp
  </button>
  <button class="drawer-tab" :class="{ active: drawerTab === 'historico' }" @click="drawerTab = 'historico'">Histórico</button>
</div>
```

- [ ] **Passo 4: Envolver conteúdo existente com `v-show`**

  - Todo o conteúdo do drawer-body (seções Informações, Funil, Follow-up, Notas, Script rápido): envolver com `<div v-show="drawerTab === 'dados'">`
  - Seção "Conversas" (a existente): mover para `v-show="drawerTab === 'historico'"`

- [ ] **Passo 5: Adicionar aba WhatsApp**

  Adicionar após as seções existentes, dentro do `drawer-body`:
```html
<div v-show="drawerTab === 'whatsapp'" class="wa-tab">
  <!-- Conversa -->
  <div class="wa-msgs" ref="waMsgsRef">
    <div v-if="!waMensagens.length" class="wa-empty">
      Nenhuma mensagem ainda. Envie a primeira!
    </div>
    <div v-for="m in waMensagens" :key="m.id"
         class="wa-msg" :class="m.direcao === 'enviado' ? 'wa-out' : 'wa-in'">
      <div class="wa-bubble">{{ m.mensagem }}</div>
      <div class="wa-time">{{ fmtDataHora(m.data) }}</div>
    </div>
  </div>

  <!-- Composer -->
  <div class="wa-composer">
    <!-- Template selector -->
    <div class="wa-toolbar">
      <select v-model="waTemplateId" class="form-select wa-select"
              @change="aplicarTemplate" :disabled="waGerandoScript">
        <option value="">📋 Template...</option>
        <option v-for="t in waTemplatesFiltrados" :key="t.id" :value="t.id">
          {{ t.nome }}
        </option>
      </select>
      <button class="btn btn-ghost btn-sm wa-ia-btn"
              @click="gerarComIA" :disabled="waGerandoScript || waEnviando">
        <span v-if="waGerandoScript">Gerando...</span>
        <span v-else>✨ Gerar com IA</span>
      </button>
    </div>
    <textarea v-model="waMensagem" class="form-textarea wa-textarea"
              :placeholder="waGerandoScript ? 'Analisando perfil do negócio...' : 'Digite a mensagem...'"
              :disabled="waGerandoScript" rows="4" />
    <button class="btn btn-primary wa-send-btn"
            @click="enviarWhatsApp"
            :disabled="!waMensagem.trim() || waEnviando || waGerandoScript">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      {{ waEnviando ? 'Enviando...' : 'Enviar no WhatsApp' }}
    </button>
  </div>
</div>
```

- [ ] **Passo 6: Adicionar computed e funções WhatsApp no `<script setup>`**

```js
// Conversas filtradas só WhatsApp
const waMensagens = computed(() =>
  leads.conversas.filter(c => c.canal === 'whatsapp')
    .sort((a, b) => new Date(a.data) - new Date(b.data))
)

// Templates filtrados pela etapa atual do lead
const waTemplatesFiltrados = computed(() => {
  const etapaAtual = form.value.etapa
  return wa.templates.filter(t => !t.etapa || t.etapa === etapaAtual)
})

// Aplica template selecionado ao campo de mensagem
function aplicarTemplate() {
  if (!waTemplateId.value) return
  const t = wa.templates.find(x => x.id === waTemplateId.value)
  if (!t) return
  let corpo = t.corpo
  corpo = corpo.replace(/\{\{nome\}\}/g, form.value.nome || '')
  corpo = corpo.replace(/\{\{negocio\}\}/g, form.value.negocio || '')
  corpo = corpo.replace(/\{\{cidade\}\}/g, form.value.cidade || '')
  waMensagem.value = corpo
}

async function gerarComIA() {
  const lead = leads.getById(currentLeadId.value)
  if (!lead) return
  waGerandoScript.value = true
  try {
    const script = await wa.gerarScript(
      auth.user.id,
      lead.instagram,
      lead.negocio || lead.nome,
      lead.cidade
    )
    waMensagem.value = script
  } catch (e) {
    toast('Erro ao gerar script. Verifique as configurações.', 'error')
  } finally {
    waGerandoScript.value = false
  }
}

async function enviarWhatsApp() {
  const lead = leads.getById(currentLeadId.value)
  if (!lead || !lead.telefone) { toast('Lead sem telefone cadastrado', 'warn'); return }
  if (!waMensagem.value.trim()) return
  waEnviando.value = true
  try {
    await wa.enviarMensagem(lead.id, auth.user.id, lead.telefone, waMensagem.value.trim())
    waMensagem.value = ''
    waTemplateId.value = ''
    toast('Mensagem enviada!', 'ok')
  } catch (e) {
    toast('Erro ao enviar. Verifique a integração Z-API.', 'error')
  } finally {
    waEnviando.value = false
  }
}
```

- [ ] **Passo 7: Adicionar CSS das abas e da aba WhatsApp no `<style scoped>` do CRMView**

```css
/* ── Drawer tabs ── */
.drawer-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--elevated);
  padding: 0 1rem;
  gap: 4px;
}
.drawer-tab {
  display: flex; align-items: center; gap: 6px;
  padding: .625rem .75rem; font-size: .8rem; font-weight: 600;
  color: var(--text-tertiary); background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.drawer-tab:hover { color: var(--text-secondary); }
.drawer-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

/* ── Aba WhatsApp ── */
.wa-tab { display: flex; flex-direction: column; height: 100%; }
.wa-msgs {
  flex: 1; overflow-y: auto; padding: 1rem;
  display: flex; flex-direction: column; gap: .5rem;
  min-height: 180px; max-height: 260px;
}
.wa-empty { color: var(--text-tertiary); font-size: .82rem; text-align: center; padding: 2rem 0; }
.wa-msg { display: flex; flex-direction: column; max-width: 82%; }
.wa-out { align-self: flex-end; align-items: flex-end; }
.wa-in  { align-self: flex-start; align-items: flex-start; }
.wa-bubble {
  padding: .5rem .75rem; border-radius: 12px; font-size: .83rem; line-height: 1.5;
}
.wa-out .wa-bubble { background: rgba(34,197,94,.15); color: var(--accent); border-bottom-right-radius: 3px; }
.wa-in  .wa-bubble { background: var(--bg-overlay); color: var(--text-primary); border-bottom-left-radius: 3px; }
.wa-time { font-size: .72rem; color: var(--text-tertiary); margin-top: 2px; }
.wa-composer { padding: .75rem 1rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: .5rem; }
.wa-toolbar { display: flex; gap: .5rem; }
.wa-select  { flex: 1; font-size: .78rem; }
.wa-ia-btn  { font-size: .78rem; white-space: nowrap; }
.wa-textarea { font-size: .83rem; resize: none; }
.wa-send-btn { width: 100%; justify-content: center; gap: .5rem; }
```

- [ ] **Passo 8: Verificar no browser**

  - Abrir drawer de um lead
  - Clicar na aba "WhatsApp"
  - Selecionar template → mensagem preenche
  - Clicar "✨ Gerar com IA" → aguardar → campo preenche com script personalizado
  - Clicar "Enviar no WhatsApp" → mensagem chega no WhatsApp do número cadastrado
  - Aba "Dados" e "Histórico" continuam funcionando normalmente

- [ ] **Passo 9: Commit**

```bash
git add src/views/CRMView.vue src/stores/leads.js
git commit -m "feat: aba WhatsApp no drawer do CRM — chat + templates + IA"
```

---

## Task 9: Deploy final e smoke test completo

- [ ] **Passo 1: Build de produção**

```bash
npm run build
```

  Esperado: sem erros de compilação.

- [ ] **Passo 2: Verificar todas as Edge Functions deployadas**

```bash
npx supabase functions list --project-ref jqmnmudfxxdcjfradvcj
```

  Esperado: `wa-send`, `gerar-script`, `wa-webhook`, `notify-daily` listados.

- [ ] **Passo 3: Smoke test completo (manual)**

  1. Ir para `/configuracoes` → preencher Instance ID e script base → salvar → toast "Configurações salvas"
  2. Ir para CRM → abrir drawer de um lead com telefone e Instagram preenchidos
  3. Clicar aba "WhatsApp"
  4. Clicar "✨ Gerar com IA" → script aparece em ~10-15s
  5. Editar script se quiser → clicar "Enviar no WhatsApp" → mensagem chega no número
  6. Responder pelo WhatsApp → em ~5s a resposta aparece no drawer
  7. Clicar aba "Dados" → tudo normal
  8. Clicar aba "Histórico" → conversas antigas listadas

- [ ] **Passo 4: Push e deploy Vercel**

```bash
git push origin main
```

  Auto-deploy no Vercel em ~1 min.

- [ ] **Passo 5: Testar em produção**

  Acessar `sanolab-advanced-crm.vercel.app` → repetir smoke test com lead real.
