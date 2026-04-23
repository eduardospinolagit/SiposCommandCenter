import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'

const DEFAULTS_SAIDA   = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Assinaturas', 'Vestuário', 'Outros']
const DEFAULTS_ENTRADA = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros']
const DEFAULT_COLORS   = ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#64748b']

export const useFinPessoalStore = defineStore('finPessoal', () => {
  const items       = ref([])
  const catsSaida   = ref([...DEFAULTS_SAIDA])
  const catsEntrada = ref([...DEFAULTS_ENTRADA])
  const catColors   = ref({}) // { 'Moradia': '#ff0000', ... }

  function colorFor(cat) {
    if (catColors.value[cat]) return catColors.value[cat]
    const all = [...catsSaida.value, ...catsEntrada.value]
    const idx = all.indexOf(cat)
    return DEFAULT_COLORS[idx >= 0 ? idx % DEFAULT_COLORS.length : 0]
  }

  async function load() {
    const [txRes, catRes] = await Promise.all([
      sb.from('fin_pessoal').select('*').eq('user_id', uid()).order('data', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('configuracoes').select('valor').eq('user_id', uid()).eq('chave', 'fin_pessoal_cats').maybeSingle()
    ])
    if (!txRes.error) items.value = txRes.data || []
    if (catRes.data?.valor) {
      catsSaida.value   = catRes.data.valor.saida   || [...DEFAULTS_SAIDA]
      catsEntrada.value = catRes.data.valor.entrada || [...DEFAULTS_ENTRADA]
      catColors.value   = catRes.data.valor.colors  || {}
    }
  }

  async function saveCats() {
    await sb.from('configuracoes').upsert({
      id:         uid() + '_fin_pessoal_cats',
      user_id:    uid(),
      chave:      'fin_pessoal_cats',
      valor:      { saida: catsSaida.value, entrada: catsEntrada.value, colors: catColors.value },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  }

  async function addCat(tipo, nome) {
    const lista = tipo === 'entrada' ? catsEntrada : catsSaida
    const n = nome.trim()
    if (!n || lista.value.includes(n)) return
    lista.value.push(n)
    await saveCats()
  }

  async function removeCat(tipo, nome) {
    const lista = tipo === 'entrada' ? catsEntrada : catsSaida
    lista.value = lista.value.filter(c => c !== nome)
    delete catColors.value[nome]
    await saveCats()
  }

  async function setColor(cat, color) {
    catColors.value = { ...catColors.value, [cat]: color }
    await saveCats()
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

  return {
    items, catsSaida, catsEntrada, catColors,
    load, upsert, remove,
    addCat, removeCat, setColor, colorFor,
    totalEntrada, totalSaida, saldo, fmt
  }
})
