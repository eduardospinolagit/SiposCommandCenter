import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'

export const useFinPessoalStore = defineStore('finPessoal', () => {
  const items = ref([])

  const CATS_SAIDA = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Assinaturas', 'Vestuário', 'Outros']
  const CATS_ENTRADA = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros']

  async function load() {
    const { data, error } = await sb
      .from('fin_pessoal')
      .select('*')
      .eq('user_id', uid())
      .order('data', { ascending: false })
    if (!error) items.value = data || []
  }

  async function upsert(tx) {
    const payload = {
      id:        tx.id || ('fp_' + Date.now()),
      user_id:   uid(),
      tipo:      tx.tipo,
      descricao: tx.descricao,
      cat:       tx.cat,
      val:       Number(tx.val),
      data:      tx.data,
      st:        tx.st || 'pago',
      obs:       tx.obs || null,
    }
    const { error } = await sb.from('fin_pessoal').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    await load()
    return payload
  }

  async function remove(id) {
    const { error } = await sb.from('fin_pessoal').delete().eq('id', id).eq('user_id', uid())
    if (error) throw error
    items.value = items.value.filter(t => t.id !== id)
  }

  const totalEntrada = computed(() =>
    items.value.filter(t => t.tipo === 'entrada' && t.st === 'pago').reduce((s, t) => s + Number(t.val), 0)
  )
  const totalSaida = computed(() =>
    items.value.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.val), 0)
  )
  const saldo = computed(() => totalEntrada.value - totalSaida.value)

  function fmt(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  }

  function gastosPorCat() {
    const c = {}
    items.value.filter(t => t.tipo === 'saida').forEach(t => {
      c[t.cat] = (c[t.cat] || 0) + Number(t.val)
    })
    return c
  }

  return { items, CATS_SAIDA, CATS_ENTRADA, load, upsert, remove, totalEntrada, totalSaida, saldo, fmt, gastosPorCat }
})
