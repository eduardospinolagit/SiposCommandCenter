import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC  = 'BOMZjUrFnkPqyKg6T2rHhXE8xTTNfR33jrgR7OmbNzD5aZSDE9zN2OjN7ELvhJYYsv0DQff7CUapkexxUxb2dPc'
const VAPID_PRIVATE = '6TB0NVCMWfrqetxRu_lneqjy4DisatDaoydUoG9iLHM'
const VAPID_SUBJECT = 'mailto:eduardospinolamkt@gmail.com'

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
}

function fromb64u(s: string): Uint8Array {
  const pad = '='.repeat((4 - s.length % 4) % 4)
  return Uint8Array.from(atob((s+pad).replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
}

// Importar chave VAPID via JWK (mais confiável que PKCS8 manual)
async function importVapidKey(): Promise<CryptoKey> {
  // Derivar x,y da chave pública a partir da privada não é possível sem a pública
  // Usamos a chave pública VAPID para extrair x e y (bytes 1-32 e 33-64 do ponto não comprimido)
  const pubBytes = fromb64u(VAPID_PUBLIC) // 65 bytes: 0x04 + x(32) + y(32)
  const x = b64u(pubBytes.slice(1, 33))
  const y = b64u(pubBytes.slice(33, 65))
  const d = VAPID_PRIVATE // já está em base64url

  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

async function vapidJwt(audience: string): Promise<string> {
  const enc = new TextEncoder()
  const header  = b64u(enc.encode(JSON.stringify({ typ:'JWT', alg:'ES256' })))
  const payload = b64u(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now()/1000) + 43200,
    sub: VAPID_SUBJECT,
  })))
  const key = await importVapidKey()
  const sig = await crypto.subtle.sign(
    { name:'ECDSA', hash:'SHA-256' },
    key,
    enc.encode(`${header}.${payload}`)
  )
  return `${header}.${payload}.${b64u(sig)}`
}

async function hkdf(salt: Uint8Array, ikm: ArrayBuffer, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name:'HKDF', hash:'SHA-256', salt, info }, key, len*8)
  return new Uint8Array(bits)
}

async function encryptPayload(p256dhB64: string, authB64: string, plaintext: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const clientPub  = fromb64u(p256dhB64)
  const authSecret = fromb64u(authB64)

  const clientKey = await crypto.subtle.importKey(
    'raw', clientPub,
    { name:'ECDH', namedCurve:'P-256' },
    false, []
  )

  const serverPair = await crypto.subtle.generateKey(
    { name:'ECDH', namedCurve:'P-256' },
    true, ['deriveBits']
  )
  const serverPubRaw  = new Uint8Array(await crypto.subtle.exportKey('raw', serverPair.publicKey))
  const sharedSecret  = await crypto.subtle.deriveBits(
    { name:'ECDH', public: clientKey },
    serverPair.privateKey, 256
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))

  // PRK
  const prkInfo = new Uint8Array([...enc.encode('WebPush: info\x00'), ...clientPub, ...serverPubRaw])
  const prk = await hkdf(authSecret, sharedSecret, prkInfo, 32)

  // CEK + Nonce
  const cek   = await hkdf(salt, prk, enc.encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdf(salt, prk, enc.encode('Content-Encoding: nonce\x00'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])

  const ptBytes = enc.encode(plaintext)
  const record  = new Uint8Array(ptBytes.length + 1)
  record.set(ptBytes)
  record[ptBytes.length] = 0x02

  const ciphered = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv:nonce }, aesKey, record))

  // aes128gcm header: salt(16) + rs(4 BE) + keylen(1) + serverPub(65) + ciphertext
  const rs = 4096
  const out = new Uint8Array(16 + 4 + 1 + serverPubRaw.length + ciphered.length)
  let off = 0
  out.set(salt, off); off += 16
  new DataView(out.buffer).setUint32(off, rs, false); off += 4
  out[off++] = serverPubRaw.length
  out.set(serverPubRaw, off); off += serverPubRaw.length
  out.set(ciphered, off)
  return out
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  title: string, body: string
): Promise<{ ok: boolean; status: number }> {
  const url      = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt      = await vapidJwt(audience)
  const payload  = JSON.stringify({ title, body, icon:'/icons/web-app-manifest-192x192.png', url:'/crm', tag:'slac-daily' })
  const cipher   = await encryptPayload(sub.p256dh, sub.auth, payload)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':    `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type':     'application/octet-stream',
      'TTL':              '86400',
      'Urgency':          'normal',
    },
    body: cipher,
  })
  console.log(`Push ${sub.endpoint.slice(0,50)} → ${res.status}`)
  return { ok: res.ok || res.status === 201, status: res.status }
}

Deno.serve(async (_req) => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const hoje    = new Date(); hoje.setHours(0,0,0,0)
  const hojeStr = hoje.toISOString().split('T')[0]

  const { data: subs, error: subErr } = await sb
    .from('push_subscriptions')
    .select('*')
    .eq('device', 'mobile')
  if (subErr) return new Response(JSON.stringify({ error: subErr.message }), { status:500 })
  if (!subs?.length) return new Response(JSON.stringify({ ok:true, enviados:0, msg:'Sem subscriptions' }))

  let enviados = 0
  const erros: string[] = []

  for (const sub of subs) {
    const uid = sub.user_id

    const { data: fuLeads } = await sb.from('leads').select('nome')
      .eq('user_id', uid).not('etapa','in','("fechado","perdido")')
      .lte('proximo_followup', hojeStr).not('proximo_followup','is',null).limit(5)

    const d3 = new Date(hoje); d3.setDate(d3.getDate()-3)
    const { data: pgtos } = await sb.from('financeiro').select('val')
      .eq('user_id', uid).eq('tipo','entrada').eq('st','pendente')
      .lte('data', d3.toISOString().split('T')[0]).limit(5)

    const linhas: string[] = []
    if (fuLeads?.length) {
      linhas.push(`⏰ ${fuLeads.length} follow-up${fuLeads.length>1?'s':''} pendente${fuLeads.length>1?'s':''}`)
      fuLeads.slice(0,3).forEach((l:{nome:string}) => linhas.push(`• ${l.nome}`))
    }
    if (pgtos?.length) {
      const total = pgtos.reduce((a:number,p:{val:number}) => a+Number(p.val), 0)
      linhas.push(`💰 R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})} a receber`)
    }
    if (!linhas.length) linhas.push('✅ Tudo em dia! Bom trabalho.')

    try {
      const r = await sendPush(sub, 'SLAC · Sano Lab', linhas.join('\n'))
      if (r.ok) {
        enviados++
      } else {
        erros.push(`status ${r.status}`)
        if (r.status === 410) await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    } catch(e) {
      erros.push(`erro: ${String(e)}`)
    }
  }

  return new Response(JSON.stringify({ ok:true, enviados, erros, total:subs.length }), {
    headers: { 'Content-Type':'application/json' }
  })
})
