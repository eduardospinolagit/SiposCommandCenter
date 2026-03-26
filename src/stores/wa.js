import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'

const BASE_URL = 'http://localhost:3001'

export const useWaStore = defineStore('wa', () => {
  const templates  = ref([])
  const config     = ref({ instance_id: '' })
  const scriptBase = ref('')
  const chats      = ref([]) // [{lead, lastMsg, lastAt, lastDirecao}]

  // ── Conexão local ──
  const connected      = ref(false)
  const hasQr          = ref(false)
  const qrImage        = ref(null)       // dark mode (verde sobre preto)
  const qrImageLight   = ref(null)       // light mode (preto sobre branco)
  const serverOnline   = ref(false)
  let _lastTokenSent = 0

  async function sendToken() {
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.access_token) return
      await fetch(BASE_URL + '/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.access_token }),
      })
      _lastTokenSent = Date.now()
    } catch {}
  }

  async function checkStatus() {
    try {
      const r = await fetch(BASE_URL + '/status')
      const d = await r.json()
      serverOnline.value  = true
      const wasConnected  = connected.value
      connected.value     = d.connected
      hasQr.value         = d.hasQr
      qrImage.value       = d.qrImage      || null
      qrImageLight.value  = d.qrImageLight || null
      // Envia JWT ao tray quando conecta ou a cada 45min (antes do token expirar)
      if (d.connected && (!wasConnected || Date.now() - _lastTokenSent > 45 * 60 * 1000)) {
        await sendToken()
      }
    } catch {
      serverOnline.value  = false
      connected.value     = false
      hasQr.value         = false
      qrImage.value       = null
      qrImageLight.value  = null
    }
  }

  async function disconnect() {
    try { await fetch(BASE_URL + '/disconnect', { method: 'POST' }) } catch {}
    connected.value = false
    hasQr.value     = false
    qrImage.value   = null
  }

  async function loadChats() {
    const { data: convs, error: convErr } = await sb
      .from('conversas')
      .select('lead_id, mensagem, data, direcao, telefone, contato_nome')
      .eq('canal', 'whatsapp')
      .eq('user_id', uid())
      .order('data', { ascending: false })
    console.log('[loadChats] convs:', convs?.length, '| error:', convErr?.message)
    if (!convs?.length) { chats.value = []; return }

    const leadMap  = new Map() // lead_id  → última conversa
    const phoneMap = new Map() // telefone → última conversa (sem lead)
    for (const c of convs) {
      if (c.lead_id) { if (!leadMap.has(c.lead_id))   leadMap.set(c.lead_id, c) }
      else if (c.telefone) { if (!phoneMap.has(c.telefone)) phoneMap.set(c.telefone, c) }
    }
    console.log('[loadChats] leadMap:', leadMap.size, '| phoneMap:', phoneMap.size)

    const result = []

    // Contatos com lead no CRM
    if (leadMap.size) {
      const { data: leadsData, error: leadsErr } = await sb
        .from('leads').select('id, nome, telefone, etapa')
        .in('id', [...leadMap.keys()]).eq('user_id', uid())
      console.log('[loadChats] leadsData:', leadsData?.length, '| error:', leadsErr?.message)
      for (const l of (leadsData || [])) {
        const c = leadMap.get(l.id)
        result.push({ lead: l, lastMsg: c?.mensagem || '', lastAt: c?.data || '', lastDirecao: c?.direcao || '' })
      }
    }

    // Contatos sem lead (inbox direto do WhatsApp)
    for (const [phone, c] of phoneMap) {
      result.push({
        lead: { id: null, nome: c.contato_nome || phone, telefone: phone, etapa: null },
        lastMsg: c.mensagem || '', lastAt: c.data || '', lastDirecao: c.direcao || '',
      })
    }

    chats.value = result.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
  }

  async function loadTemplates() {
    const { data, error } = await sb
      .from('wa_templates').select('*')
      .eq('user_id', uid())
      .order('created_at', { ascending: true })
    if (error) { console.error('[wa] loadTemplates:', error); return }
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
    const waConf = data?.find(r => r.chave === 'wa_config')
    const script = data?.find(r => r.chave === 'script_base')
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

  async function enviarArquivo(leadId, userId, telefone, tipo, arquivo, arquivoNome, caption) {
    const endpoint = tipo === 'image' ? '/send-image' : tipo === 'audio' ? '/send-audio' : '/send-document'
    const body = { telefone, lead_id: leadId, user_id: userId }
    if (tipo === 'image')    { body.imagem = arquivo; body.caption = caption || '' }
    else if (tipo === 'audio')    { body.audio = arquivo }
    else                     { body.documento = arquivo; body.nome = arquivoNome; body.mimetype = '' }
    const r = await fetch(BASE_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Falha ao enviar arquivo')
    return data
  }

  async function enviarMensagem(leadId, userId, telefone, mensagem) {
    const r = await fetch(BASE_URL + '/send-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, mensagem, lead_id: leadId, user_id: userId }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Falha ao enviar')
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
    templates, config, scriptBase, chats,
    connected, hasQr, qrImage, qrImageLight, serverOnline,
    checkStatus, disconnect, sendToken,
    loadTemplates, saveTemplate, deleteTemplate,
    loadConfig, saveConfig, loadChats,
    enviarMensagem, enviarArquivo, gerarScript,
  }
})
