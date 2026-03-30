import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'
import { slacLog } from '@/utils/log'

export const useWorkStore = defineStore('work', () => {
  const items = ref([])

  async function load() {
    const { data } = await sb
      .from('configuracoes')
      .select('valor')
      .eq('user_id', uid())
      .eq('chave', 'work_items')
      .maybeSingle()
    items.value = data?.valor?.items || []
  }

  async function _save() {
    await sb.from('configuracoes').upsert({
      id: uid() + '_work_items',
      user_id: uid(),
      chave: 'work_items',
      valor: { items: items.value },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  }

  async function addItem(leadId, servico, tarefas = []) {
    items.value.unshift({
      id: 'w' + Date.now(),
      lead_id: leadId,
      servico: servico.trim(),
      status: 'ativo',
      notas: '',
      tarefas,
      created_at: new Date().toISOString()
    })
    await _save()
    slacLog('WRK-001', `Serviço criado: ${servico}`, { lead_id: leadId, servico })
  }

  async function updateItem(updated) {
    const prev = items.value.find(i => i.id === updated.id)
    const idx  = items.value.findIndex(i => i.id === updated.id)
    if (idx !== -1) items.value[idx] = { ...updated }
    await _save()
    if (prev?.status !== 'concluido' && updated.status === 'concluido') {
      slacLog('WRK-003', `Serviço concluído: ${updated.servico}`, { id: updated.id, lead_id: updated.lead_id, servico: updated.servico })
    } else {
      slacLog('WRK-002', `Serviço atualizado: ${updated.servico}`, { id: updated.id, lead_id: updated.lead_id })
    }
  }

  async function removeItem(id) {
    const item = items.value.find(i => i.id === id)
    items.value = items.value.filter(i => i.id !== id)
    await _save()
    slacLog('WRK-004', `Serviço removido: ${item?.servico || id}`, { id, servico: item?.servico, lead_id: item?.lead_id })
  }

  async function reorderItems(newOrder) {
    items.value = [...newOrder]
    await _save()
  }

  // IDs de leads com pelo menos 1 serviço ativo (para barra azul no kanban)
  const leadsComWork = computed(() =>
    new Set(items.value.filter(i => i.status === 'ativo').map(i => i.lead_id))
  )

  const ativos    = computed(() => items.value.filter(i => i.status === 'ativo'))
  const concluidos = computed(() => items.value.filter(i => i.status === 'concluido'))

  return { items, ativos, concluidos, leadsComWork, load, addItem, updateItem, removeItem, reorderItems }
})
