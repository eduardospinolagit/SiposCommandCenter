// background.js — Service Worker (module)
// Responsabilidades: JWT do servidor Baileys, estado global, writes no Supabase

import { upsertConversas, insertLog, checkConversa, fetchLeads } from './supabase.js'

const BRIDGE_URL  = 'http://localhost:3001/bridge-token'
const RETRY_MS    = 15000

// ── Cache de leads: tail (últimos 8 dígitos do telefone) → lead_id ──
// Construído uma vez por sync para que as mensagens já sejam salvas com lead_id correto
let _leadsCache = null       // Map<tail, leadId> | null
let _leadsCacheAt = 0        // timestamp da última build

async function buildLeadsCache() {
  if (!state.token || !state.userId) return
  const now = Date.now()
  if (_leadsCache && now - _leadsCacheAt < 5 * 60 * 1000) return // válido 5min
  try {
    const leads = await fetchLeads(state.userId, state.token)
    _leadsCache = new Map()
    for (const l of (Array.isArray(leads) ? leads : [])) {
      const tail = l.telefone?.replace(/\D/g, '').slice(-8)
      if (tail) _leadsCache.set(tail, l.id)
    }
    _leadsCacheAt = now
    console.log('[SLAC Bridge] Cache de leads construído —', _leadsCache.size, 'leads com telefone')
  } catch (e) {
    console.warn('[SLAC Bridge] Erro ao buscar leads:', e.message)
  }
}

function resolveLeadId(phone) {
  if (!_leadsCache || !phone) return null
  const tail = phone.replace(/\D/g, '').slice(-8)
  return _leadsCache.get(tail) || null
}

// ── Estado global ──
const state = {
  waReady:       false,   // WPP carregado e pronto
  serverOnline:  false,   // servidor Baileys acessível
  syncRunning:   false,
  syncPaused:    false,
  syncProgress:  0,
  syncTotal:     0,
  syncChatName:  '',
  syncDone:      false,
  syncMsgCount:  0,
  failCount:     0,       // falhas Baileys no dia de hoje
  monitorActive: false,
  token:         null,
  userId:        null,
}

// ── failCount persistido por dia ──
async function loadTodayFailCount() {
  const { failData } = await chrome.storage.local.get('failData')
  const today = new Date().toDateString()
  if (!failData || failData.date !== today) return 0
  return failData.count || 0
}

async function incrementFailCount() {
  const today = new Date().toDateString()
  const count = await loadTodayFailCount()
  const next  = count + 1
  await chrome.storage.local.set({ failData: { date: today, count: next } })
  state.failCount = next
}

// ── Fetch JWT do servidor Baileys ──
async function fetchToken() {
  try {
    const r = await fetch(BRIDGE_URL)
    state.serverOnline = true
    if (r.status === 401) {
      // Servidor online mas SLAC ainda não enviou o token — tenta de novo
      setTimeout(fetchToken, RETRY_MS)
      return
    }
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const { token, userId } = await r.json()
    state.token   = token
    state.userId  = userId
    await chrome.storage.local.set({ token, userId })
    console.log('[SLAC Bridge] Token obtido — userId:', userId?.slice(0, 8))
  } catch {
    state.serverOnline = false
    state.token   = null
    state.userId  = null
    setTimeout(fetchToken, RETRY_MS)
  }
}

// ── Envia mensagem para a tab do WhatsApp Web ──
async function sendToContent(msg) {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, msg) } catch {}
  }
}

// ── Handlers de mensagens ──
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handle = async () => {
    switch (msg.type) {

      case 'GET_STATE':
        return { ...state }

      case 'WPP_READY':
        state.waReady = true
        return { ok: true }

      case 'WPP_TIMEOUT':
        state.waReady = false
        return { ok: true }

      case 'SYNC_PROGRESS':
        state.syncRunning  = true
        state.syncDone     = false
        state.syncProgress = msg.progress
        state.syncTotal    = msg.total
        state.syncChatName = msg.chatName || ''
        return { ok: true }

      case 'SYNC_DONE':
        state.syncRunning  = false
        state.syncDone     = true
        state.syncMsgCount = msg.msgCount || 0
        return { ok: true }

      case 'SAVE_MSGS': {
        if (!state.token || !state.userId) return { error: 'sem token' }
        try {
          const rows = msg.msgs.map(m => {
            const lead_id = resolveLeadId(m.telefone)
            const row = { ...m, user_id: state.userId }
            if (lead_id) {
              // Lead encontrado: inclui lead_id e limpa telefone
              // merge-duplicates vai atualizar lead_id e telefone no registro existente
              row.lead_id  = lead_id
              row.telefone = null
            }
            // Se não achou lead: NÃO inclui lead_id no payload
            // merge-duplicates só atualiza campos presentes → não sobrescreve lead_id existente
            return row
          })
          await upsertConversas(rows, state.token)
          state.syncMsgCount += rows.length
        } catch (e) {
          console.error('[SLAC Bridge] Erro upsert conversas:', e.message)
        }
        return { ok: true }
      }

      case 'CHECK_INTEGRITY': {
        if (!state.token || !state.userId) return { ok: true }
        try {
          const exists = await checkConversa(msg.id, state.token)
          if (!exists) {
            await insertLog({
              user_id:       state.userId,
              wa_message_id: msg.id,
              telefone:      msg.telefone || null,
              direcao:       msg.direcao  || null,
              erro:          'baileys_miss',
              detalhes:      null,
            }, state.token)
            await incrementFailCount()
            console.warn('[SLAC Bridge] Baileys miss detectado:', msg.id)
          }
        } catch (e) {
          console.error('[SLAC Bridge] Erro check integrity:', e.message)
        }
        return { ok: true }
      }

      case 'START_SYNC':
        state.syncRunning  = true
        state.syncDone     = false
        state.syncProgress = 0
        state.syncTotal    = 0
        state.syncMsgCount = 0
        state.syncPaused   = false
        await chrome.storage.local.set({ syncPaused: false })
        // Reconstrói cache de leads antes de iniciar — garante lead_id correto no upsert
        _leadsCache = null
        await buildLeadsCache()
        await sendToContent({ type: 'DO_SYNC' })
        return { ok: true }

      case 'PAUSE_SYNC':
        state.syncPaused = true
        await chrome.storage.local.set({ syncPaused: true })
        return { ok: true }

      case 'RESUME_SYNC':
        state.syncPaused = false
        await chrome.storage.local.set({ syncPaused: false })
        return { ok: true }

      case 'TOGGLE_MONITOR':
        state.monitorActive = !state.monitorActive
        await chrome.storage.local.set({ monitorActive: state.monitorActive })
        await sendToContent({ type: 'TOGGLE_MONITOR', active: state.monitorActive })
        return { ok: true }

      default:
        return { error: 'unknown: ' + msg.type }
    }
  }
  handle().then(sendResponse)
  return true // mantém canal aberto para async
})

// ── Alarme de refresh de token (45min) ──
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshToken') fetchToken()
})

// ── Inicialização ──
async function init() {
  // Restaura estado persistido
  const stored = await chrome.storage.local.get(['token', 'userId', 'monitorActive'])
  if (stored.token)  { state.token = stored.token; state.userId = stored.userId }
  state.monitorActive = stored.monitorActive || false
  state.failCount     = await loadTodayFailCount()

  // Busca token fresco do servidor Baileys
  await fetchToken()

  // Configura refresh periódico
  await chrome.alarms.clearAll()
  chrome.alarms.create('refreshToken', { periodInMinutes: 45 })
}

chrome.runtime.onInstalled.addListener(init)
chrome.runtime.onStartup.addListener(init)
