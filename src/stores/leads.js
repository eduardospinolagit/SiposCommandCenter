import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'
import { slacLog } from '@/utils/log'

export const ETAPAS = [
  { id: 'contato',    label: 'Contato',      color: '#3b82f6' },
  { id: 'interesse',  label: 'Interesse',    color: '#f59e0b' },
  { id: 'demo',       label: 'Demo enviada', color: '#8b5cf6' },
  { id: 'negociacao', label: 'Negociação',   color: '#f97316' },
  { id: 'fechado',    label: 'Fechado',      color: '#22c55e' },
  { id: 'perdido',    label: 'Perdido',      color: '#555'    },
]

export const useLeadsStore = defineStore('leads', () => {
  const leads        = ref([])
  const conversas    = ref([])
  const undoStack    = ref([])
  const drawerLeadId = ref(null)


  async function load() {
    const { data, error } = await sb
      .from('leads').select('*')
      .eq('user_id', uid())
      .order('created_at', { ascending: false })
    if (error) { console.error(error); return }
    leads.value = data || []
  }

  async function loadConversas(leadId, { limit, offset, noStore } = {}) {
    const paged = limit !== undefined
    let q = sb.from('conversas').select('*')
      .eq('user_id', uid())
      .eq('lead_id', leadId)
      .order('data', { ascending: !paged })
    if (paged) q = q.range(offset || 0, (offset || 0) + limit - 1)
    const { data, error } = await q
    if (error) return []
    const result = paged ? [...(data || [])].reverse() : (data || [])
    if (!noStore) conversas.value = result
    return result
  }

  async function loadConversasByPhone(telefone, { limit, offset } = {}) {
    const phone = String(telefone).replace(/\D/g, '').replace(/^55/, '').slice(-10)
    const paged = limit !== undefined
    let q = sb.from('conversas').select('*')
      .eq('user_id', uid())
      .is('lead_id', null)
      .ilike('telefone', `%${phone}%`)
      .order('data', { ascending: !paged })
    if (paged) q = q.range(offset || 0, (offset || 0) + limit - 1)
    const { data, error } = await q
    if (error) return []
    return paged ? [...(data || [])].reverse() : (data || [])
  }

  // Loga evento de sistema na conversa (etapa/prioridade) — sem alterar ultima_direcao
  function _logEvent(leadId, mensagem) {
    if (!leadId) return
    const nova = {
      id: 'ev' + Date.now() + Math.random().toString(36).slice(2, 7),
      user_id: uid(), lead_id: leadId,
      canal: 'sistema', direcao: 'sistema',
      mensagem, data: new Date().toISOString()
    }
    sb.from('conversas').insert(nova).then(() => {})
    // Injeta na lista reativa se o drawer deste lead está aberto
    if (leadId === drawerLeadId.value) {
      conversas.value.push(nova)
    }
  }

  // ── Internal (não empurra undo stack) ──
  async function _upsert(payload) {
    const { error } = await sb.from('leads').upsert(
      { ...payload, user_id: uid() },
      { onConflict: 'id' }
    )
    if (error) throw error
    const idx = leads.value.findIndex(l => l.id === payload.id)
    if (idx !== -1) leads.value[idx] = { ...leads.value[idx], ...payload, user_id: uid() }
    else leads.value.unshift({ ...payload, user_id: uid() })
  }

  async function _remove(id) {
    leads.value = leads.value.filter(l => l.id !== id)
    sb.from('conversas').delete().eq('lead_id', id).then(() => {})
    sb.from('leads').delete().eq('id', id).eq('user_id', uid()).then(() => {})
  }

  const ETAPA_LABEL = { contato: 'Contato', interesse: 'Interesse', demo: 'Demo enviada', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido' }
  const PRI_LABEL   = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

  // ── Public (rastreia undo) ──
  async function upsert(payload) {
    const prev = leads.value.find(l => l.id === payload.id)
    undoStack.value.push({ action: 'upsert', prev: prev ? { ...prev } : null, id: payload.id })
    // Grava timestamp de entrada na etapa quando ela muda + loga evento
    const etapaChanged = payload.etapa && prev && prev.etapa !== payload.etapa
    const priChanged   = payload.prioridade && prev && prev.prioridade !== payload.prioridade
    if (etapaChanged) {
      payload = { ...payload, etapa_since: new Date().toISOString() }
      _logEvent(payload.id, `Etapa: ${ETAPA_LABEL[prev.etapa] || prev.etapa} → ${ETAPA_LABEL[payload.etapa] || payload.etapa}`)
      slacLog('CRM-004', `Etapa: ${ETAPA_LABEL[prev.etapa] || prev.etapa} → ${ETAPA_LABEL[payload.etapa] || payload.etapa}`, { lead_id: payload.id, nome: payload.nome || prev.nome, de: prev.etapa, para: payload.etapa })
    }
    if (priChanged) {
      _logEvent(payload.id, `Prioridade: ${PRI_LABEL[prev.prioridade] || prev.prioridade} → ${PRI_LABEL[payload.prioridade] || payload.prioridade}`)
      slacLog('CRM-005', `Prioridade: ${PRI_LABEL[prev.prioridade] || prev.prioridade} → ${PRI_LABEL[payload.prioridade] || payload.prioridade}`, { lead_id: payload.id, nome: payload.nome || prev.nome })
    }
    await _upsert(payload)
    if (!prev) {
      slacLog('CRM-001', `Lead criado: ${payload.nome}`, { lead_id: payload.id, nome: payload.nome, etapa: payload.etapa })
    } else if (!etapaChanged && !priChanged) {
      slacLog('CRM-002', `Lead atualizado: ${payload.nome || prev.nome}`, { lead_id: payload.id, nome: payload.nome || prev.nome })
    }
  }

  async function remove(id) {
    const lead = leads.value.find(l => l.id === id)
    if (lead) {
      // Desvincula conversas antes de deletar — evita cascade delete perder o histórico
      if (lead.telefone) {
        const tel = lead.telefone.replace(/\D/g, '').replace(/^55/, '')
        await sb.from('conversas')
          .update({ lead_id: null, telefone: tel })
          .eq('lead_id', id)
          .eq('user_id', uid())
      }
      undoStack.value.push({ action: 'remove', lead: { ...lead } })
      slacLog('CRM-003', `Lead removido: ${lead.nome}`, { lead_id: id, nome: lead.nome })
    }
    await _remove(id)
  }

  async function undo() {
    const entry = undoStack.value.pop()
    if (!entry) return
    if (entry.action === 'remove') {
      await _upsert(entry.lead)
      slacLog('CRM-007', `Lead restaurado via undo: ${entry.lead?.nome}`, { lead_id: entry.lead?.id })
    } else if (entry.action === 'upsert') {
      if (entry.prev) {
        await _upsert(entry.prev)
        slacLog('CRM-007', `Lead restaurado via undo: ${entry.prev?.nome}`, { lead_id: entry.prev?.id })
      } else {
        await _remove(entry.id)
        slacLog('CRM-007', 'Criação de lead desfeita via undo', { lead_id: entry.id })
      }
    }
  }

  async function addConversa(leadId, canal, direcao, mensagem) {
    const nova = {
      id: 'c' + Date.now(),
      user_id: uid(),
      lead_id: leadId,
      canal, direcao, mensagem,
      data: new Date().toISOString()
    }
    const { error } = await sb.from('conversas').insert(nova)
    if (error) throw error
    conversas.value.push(nova)
    // Atualiza indicador no lead
    const lead = leads.value.find(l => l.id === leadId)
    if (lead) {
      lead.ultima_direcao = direcao
      sb.from('leads').update({ ultima_direcao: direcao }).eq('id', leadId).then(() => {})
    }
    slacLog('CRM-006', `Conversa adicionada ao lead: ${lead?.nome || leadId}`, { lead_id: leadId, canal, direcao })
    return nova
  }

  function getById(id) {
    return leads.value.find(l => l.id === id)
  }

  const stats = computed(() => {
    const total = leads.value.length
    const fechados = leads.value.filter(l => l.etapa === 'fechado').length
    const negociando = leads.value.filter(l => l.etapa === 'negociacao' || l.etapa === 'demo').length
    const hoje = new Date()
    const fuHoje = leads.value.filter(l => {
      if (!l.proximo_followup) return false
      const d = new Date(l.proximo_followup)
      return d.toDateString() === hoje.toDateString() || d < hoje
    }).length
    const pipe = leads.value
      .filter(l => l.etapa !== 'perdido')
      .reduce((a, l) => a + Number(l.valor_estimado || 0), 0)
    return { total, fechados, negociando, fuHoje, pipe }
  })

  const followUpsAlerta = computed(() => {
    const hoje = new Date()
    return leads.value.filter(l => {
      if (!l.proximo_followup || l.etapa === 'fechado' || l.etapa === 'perdido') return false
      const d = new Date(l.proximo_followup)
      return d <= hoje
    }).sort((a, b) => new Date(a.proximo_followup) - new Date(b.proximo_followup))
  })

  return { leads, conversas, undoStack, drawerLeadId, load, loadConversas, loadConversasByPhone, upsert, remove, undo, addConversa, getById, stats, followUpsAlerta }
})
