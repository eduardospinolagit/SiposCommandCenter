import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC  = 'BOMZjUrFnkPqyKg6T2rHhXE8xTTNfR33jrgR7OmbNzD5aZSDE9zN2OjN7ELvhJYYsv0DQff7CUapkexxUxb2dPc'
const VAPID_PRIVATE = '6TB0NVCMWfrqetxRu_lneqjy4DisatDaoydUoG9iLHM'
const VAPID_SUBJECT = 'mailto:eduardospinolamkt@gmail.com'

function b64ToBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  const std = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(std), (c: string) => c.charCodeAt(0))
}

function bytesToB64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeVapidJwt(audience: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600
  const headerB64 = bytesToB64(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payloadB64 = bytesToB64(new TextEncoder().encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })))

  const keyBytes = b64ToBytes(VAPID_PRIVATE)
  const pkcs8Header = new Uint8Array([
    0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,
    0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,0x06,0x08,
    0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,
    0x27,0x30,0x25,0x02,0x01,0x01,0x04,0x20
  ])
  const pkcs8 = new Uint8Array(pkcs8Header.length + keyBytes.length)
  pkcs8.set(pkcs8Header)
  pkcs8.set(keyBytes, pkcs8Header.length)

  const key = await crypto.subtle.importKey(
    'pkcs8', pkcs8.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  )

  return `${headerB64}.${payloadB64}.${bytesToB64(new Uint8Array(sig))}`
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<{ ok: boolean; status: number }> {
  const url = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await makeVapidJwt(audience)
  const body = JSON.stringify(payload)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Type': 'application/json',
      'TTL': '86400',
      'Urgency': 'normal',
    },
    body,
  })

  console.log(`Push para ${sub.endpoint.substring(0,50)}... → ${res.status}`)
  return { ok: res.ok || res.status === 201, status: res.status }
}

Deno.serve(async (_req) => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeStr = hoje.toISOString().split('T')[0]

  const { data: subs, error: subErr } = await sb.from('push_subscriptions').select('*')
  if (subErr) return new Response(JSON.stringify({ error: subErr.message }), { status: 500 })
  if (!subs?.length) return new Response(JSON.stringify({ ok: true, enviados: 0, msg: 'Sem subscriptions' }), { status: 200 })

  let enviados = 0
  const erros: string[] = []

  for (const sub of subs) {
    const userId = sub.user_id

    const { data: fuLeads } = await sb
      .from('leads')
      .select('nome')
      .eq('user_id', userId)
      .not('etapa', 'in', '("fechado","perdido")')
      .lte('proximo_followup', hojeStr)
      .not('proximo_followup', 'is', null)
      .limit(5)

    const tresDiasAtras = new Date(hoje)
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3)
    const { data: pgtos } = await sb
      .from('financeiro')
      .select('val')
      .eq('user_id', userId)
      .eq('tipo', 'entrada')
      .eq('st', 'pendente')
      .lte('data', tresDiasAtras.toISOString().split('T')[0])
      .limit(5)

    const linhas: string[] = []
    if (fuLeads?.length) {
      linhas.push(`⏰ ${fuLeads.length} follow-up${fuLeads.length > 1 ? 's' : ''} pendente${fuLeads.length > 1 ? 's' : ''}`)
      fuLeads.slice(0, 3).forEach((l: { nome: string }) => linhas.push(`  • ${l.nome}`))
    }
    if (pgtos?.length) {
      const total = pgtos.reduce((a: number, p: { val: number }) => a + Number(p.val), 0)
      linhas.push(`💰 R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente${pgtos.length > 1 ? 's' : ''}`)
    }
    if (!linhas.length) linhas.push('✅ Tudo em dia! Bom trabalho.')

    try {
      const result = await sendPush(sub, {
        title: 'SLAC — Sano Lab',
        body: linhas.join('\n'),
        icon: '/icons/web-app-manifest-192x192.png',
        url: '/crm',
        tag: 'slac-daily',
      })
      if (result.ok) {
        enviados++
      } else {
        erros.push(`status ${result.status}`)
        if (result.status === 410 || result.status === 404) {
          await sb.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    } catch (e) {
      erros.push(String(e))
    }
  }

  return new Response(JSON.stringify({ ok: true, enviados, erros, total: subs.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
