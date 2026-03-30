import { useFinStore } from '@/stores/fin'
import { useLeadsStore } from '@/stores/leads'
import { useWorkStore } from '@/stores/work'
import { useAuthStore } from '@/stores/auth'
import { useWaStore } from '@/stores/wa'
import { sb } from '@/lib/supabase'

let initializedForUser = null
let realtimeChannel = null
let waStatusTimer = null
let waChatsTimer = null
let _sdrLastCheck = null

// Lock global para SDR (evita resposta dupla por polling sobreposto)
const _sdrLocks = {}

// Processa SDR globalmente — funciona com SlacZap aberto ou fechado
async function _sdrProcess(nova, wa, auth, leads) {
  if (!nova?.lead_id && !nova?.telefone) return
  if (!wa.sdrConfig.enabled) return
  if (!wa.sdrIsInHours()) return

  const sdrLead = nova.lead_id
    ? (leads.leads.find(l => l.id === nova.lead_id) || {
        id: nova.lead_id, telefone: nova.telefone, nome: nova.contato_nome,
      })
    : { id: null, telefone: nova.telefone, nome: nova.contato_nome }

  if (sdrLead.etapa && !wa.sdrConfig.etapas.includes(sdrLead.etapa)) return

  const ck = wa.sdrChatKey(sdrLead)
  if (!wa.sdrChats[ck]?.active) return
  if (_sdrLocks[ck]) return
  const count = wa.sdrChats[ck]?.msgCount || 0
  if (count >= wa.sdrConfig.limiteMsg) { wa.toggleSdrChat(sdrLead); return }

  _sdrLocks[ck] = true
  try {
    let q = sb.from('conversas')
      .select('direcao, mensagem, data')
      .eq('canal', 'whatsapp')
      .eq('user_id', auth.user.id)
      .order('data', { ascending: false })
      .limit(20)
    if (sdrLead.id)            q = q.eq('lead_id', sdrLead.id)
    else if (sdrLead.telefone) q = q.eq('telefone', sdrLead.telefone.replace(/\D/g, ''))
    const { data: rows, error: qErr } = await q
    if (qErr) throw qErr

    const msgs = (rows || []).reverse()
      .filter(m => m.mensagem && !['[IMG]','[AUDIO]','[VIDEO]','[DOC:'].some(p => m.mensagem.startsWith(p)))
      .slice(-20)
      .map(m => ({ direcao: m.direcao, mensagem: m.mensagem }))

    if (!msgs.length) return

    const { data, error } = await sb.functions.invoke('sdr-responder', {
      body: {
        messages:   msgs,
        leadInfo:   { nome: sdrLead.nome, negocio: sdrLead.negocio, categoria: sdrLead.categoria, etapa: sdrLead.etapa },
        scriptBase: wa.scriptBase || '',
      }
    })
    if (error) throw new Error(error.message || JSON.stringify(error))
    if (data?.error) throw new Error(data.error)

    console.log('[SDR] acao:', data?.acao, '| lead:', sdrLead.nome)
    if (data?.acao === 'responder' && data?.mensagem) {
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000))
      await wa.enviarMensagem(sdrLead.id, auth.user.id, sdrLead.telefone, data.mensagem)
      await wa.sdrIncrementMsg(sdrLead)
      wa.sdrAddLog({ chatKey: ck, leadNome: sdrLead.nome, acao: 'respondeu', msg: data.mensagem })
    } else if (data?.acao === 'escalar') {
      await wa.toggleSdrChat(sdrLead)
      wa.sdrAddLog({ chatKey: ck, leadNome: sdrLead.nome, acao: 'escalou', msg: data.motivo || 'Atenção humana necessária' })
    }
  } catch (e) {
    console.error('[SDR global] erro:', e.message || e)
  } finally {
    delete _sdrLocks[ck]
  }
}

// Polling SDR: busca mensagens recebidas desde o último check
async function _sdrPoll(wa, auth, leads) {
  if (!wa.sdrConfig.enabled) return
  if (!wa.sdrIsInHours()) return

  const since = _sdrLastCheck
  _sdrLastCheck = new Date().toISOString()
  if (!since) return // primeiro ciclo só registra o timestamp

  const { data: novas, error } = await sb
    .from('conversas')
    .select('*')
    .eq('canal', 'whatsapp')
    .eq('direcao', 'recebido')
    .eq('user_id', auth.user.id)
    .gt('data', since)

  if (error || !novas?.length) return

  console.log('[SDR poll] mensagens novas:', novas.length)
  for (const nova of novas) {
    _sdrProcess(nova, wa, auth, leads).catch(() => {})
  }
}

export async function useAppInit() {
  const auth = useAuthStore()
  const fin = useFinStore()
  const leads = useLeadsStore()
  const work = useWorkStore()
  const wa = useWaStore()

  if (!auth.user) return
  if (initializedForUser === auth.user.id) return
  initializedForUser = auth.user.id

  // Carrega dados em paralelo — inclui config SDR para que o agente funcione globalmente
  await Promise.all([
    fin.load(),
    leads.load(),
    work.load(),
    wa.checkStatus().catch(() => {}),
    wa.loadChats().catch(() => {}),
    wa.loadSdrConfig().catch(() => {}),
    wa.loadConfig().catch(() => {}),         // scriptBase necessário para o SDR
    wa.loadFuAutoConfig().catch(() => {}),
  ])

  // Marca ponto de partida do SDR poll (não reprocessa mensagens antigas)
  _sdrLastCheck = new Date().toISOString()

  // Timer 1 (15s): status da conexão WA + SDR poll
  if (waStatusTimer) clearInterval(waStatusTimer)
  waStatusTimer = setInterval(async () => {
    try { await wa.checkStatus() } catch {}
    try { await _sdrPoll(wa, auth, leads) } catch {}
  }, 15000)

  // Timer 2 (60s): atualiza lista de chats — Realtime cobre os eventos instantâneos
  if (waChatsTimer) clearInterval(waChatsTimer)
  waChatsTimer = setInterval(async () => {
    try { await wa.loadChats() } catch {}
  }, 60000)

  // Realtime — canal global permanente
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel)
  }

  // Garante que o token JWT do usuário está no WebSocket Realtime antes de subscrever
  const { data: { session } } = await sb.auth.getSession()
  if (session?.access_token) sb.realtime.setAuth(session.access_token)

  realtimeChannel = sb.channel('slac-db-' + auth.user.id)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'financeiro',
      filter: 'user_id=eq.' + auth.user.id
    }, () => fin.load())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'leads',
      filter: 'user_id=eq.' + auth.user.id
    }, () => leads.load())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'configuracoes',
      filter: 'user_id=eq.' + auth.user.id
    }, () => {
      fin.loadMeta()
      wa.loadSdrConfig({ includeChats: false }).catch(() => {})
      wa.loadConfig().catch(() => {})
    })
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'conversas',
    }, async (payload) => {
      const nova = payload.new
      // Filtra no callback — filtro server-side com uuid estava bloqueando eventos
      if (nova.user_id !== auth.user.id) return
      console.log('[Realtime] nova conversa INSERT:', { canal: nova.canal, direcao: nova.direcao, lead_id: nova.lead_id })
      if (nova.lead_id === leads.drawerLeadId) {
        leads.conversas.push(nova)
      }
      // Atualiza indicador de última interação no lead
      if (nova.lead_id && nova.direcao) {
        const lead = leads.leads.find(l => l.id === nova.lead_id)
        if (lead) lead.ultima_direcao = nova.direcao
      }
      if (nova.canal === 'whatsapp' && nova.direcao === 'recebido') {
        const key = nova.lead_id || nova.telefone || ''
        wa.storeIncrementUnread(key)
        try { await wa.loadChats() } catch {}
        // Atualiza timestamp do poll para não reprocessar via polling
        _sdrLastCheck = new Date().toISOString()
        _sdrProcess(nova, wa, auth, leads).catch(() => {})
      }
    })
    .subscribe((status, err) => {
      console.log('[Realtime] status do canal:', status, err || '')
    })

  // Canal Broadcast Realtime — tray envia evento após cada INSERT em conversas
  // Um único canal global; SlacZapView faz watch em wa.lastWaMsg (evita conflito de canais)
  sb.channel(`wa-${auth.user.id}`)
    .on('broadcast', { event: 'nova_mensagem' }, async ({ payload: nova }) => {
      console.log('[Broadcast] nova mensagem:', { direcao: nova.direcao, lead_id: nova.lead_id })
      wa.lastWaMsg = nova   // SlacZapView reage via watch
      if (nova.lead_id === leads.drawerLeadId) {
        leads.conversas.push(nova)
      }
      // Atualiza indicador de última interação no lead
      if (nova.lead_id && nova.direcao) {
        const lead = leads.leads.find(l => l.id === nova.lead_id)
        if (lead) lead.ultima_direcao = nova.direcao
      }
      const key = nova.lead_id || nova.telefone || ''
      wa.storeIncrementUnread(key)
      try { await wa.loadChats() } catch {}
      _sdrLastCheck = new Date().toISOString()
      _sdrProcess(nova, wa, auth, leads).catch(() => {})
    })
    .subscribe()

  // BroadcastChannel: recebe leads da aba de Prospecção
  try {
    const bc = new BroadcastChannel('slac_crm')
    bc.onmessage = (e) => {
      if (e.data?.type === 'lead_novo') leads.load()
    }
  } catch {}
}
