// supabase.js — Helper leve para Supabase REST API (sem SDK)
const SB_URL  = 'https://jqmnmudfxxdcjfradvcj.supabase.co'
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbW5tdWRmeHhkY2pmcmFkdmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDAxNTMsImV4cCI6MjA4OTYxNjE1M30.LKZz_djPhIc_PvdLxAAhLaV-BZxX70nGup-qODIDEF4'

async function sbFetch(path, method, body, token, extraHeaders = {}) {
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        SB_ANON,
    'Authorization': 'Bearer ' + token,
    ...extraHeaders,
  }
  const r = await fetch(SB_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`Supabase ${method} ${path} → ${r.status}: ${text}`)
  }
  // POST com return=minimal retorna 201 sem body
  if (r.status === 201 || r.headers.get('content-length') === '0') return null
  return r.json()
}

// Upsert em batch — merge atualiza direcao/status/mensagem sem sobrescrever lead_id
export async function upsertConversas(rows, token) {
  return sbFetch(
    '/rest/v1/conversas',
    'POST',
    rows,
    token,
    { 'Prefer': 'resolution=merge-duplicates,return=minimal' }
  )
}

// Insert de log de integridade
export async function insertLog(row, token) {
  return sbFetch(
    '/rest/v1/slacbridge_logs',
    'POST',
    [row],
    token,
    { 'Prefer': 'return=minimal' }
  )
}

// Verifica se mensagem existe na tabela conversas
// Retorna true se encontrada (Baileys capturou), false se não (baileys_miss)
export async function checkConversa(id, token) {
  const data = await sbFetch(
    `/rest/v1/conversas?id=eq.${encodeURIComponent(id)}&select=id`,
    'GET',
    null,
    token
  )
  return Array.isArray(data) && data.length > 0
}

// Busca últimos 50 logs do usuário
export async function fetchLogs(userId, token) {
  return sbFetch(
    `/rest/v1/slacbridge_logs?user_id=eq.${userId}&order=created_at.desc&limit=50`,
    'GET',
    null,
    token
  )
}
