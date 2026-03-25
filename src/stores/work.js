import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'

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
  }

  async function updateItem(updated) {
    const idx = items.value.findIndex(i => i.id === updated.id)
    if (idx !== -1) items.value[idx] = { ...updated }
    await _save()
  }

  async function removeItem(id) {
    items.value = items.value.filter(i => i.id !== id)
    await _save()
  }

  // IDs de leads com pelo menos 1 serviço ativo (para barra azul no kanban)
  const leadsComWork = computed(() =>
    new Set(items.value.filter(i => i.status === 'ativo').map(i => i.lead_id))
  )

  const ativos    = computed(() => items.value.filter(i => i.status === 'ativo'))
  const concluidos = computed(() => items.value.filter(i => i.status === 'concluido'))

  return { items, ativos, concluidos, leadsComWork, load, addItem, updateItem, removeItem }
})
