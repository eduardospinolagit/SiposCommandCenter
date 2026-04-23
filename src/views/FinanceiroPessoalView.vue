<template>
  <div class="page-layout">

    <div class="page-header">
      <div>
        <h1 class="page-title">Finanças Pessoais</h1>
        <p class="page-subtitle">Controle de gastos e receitas pessoais</p>
      </div>
      <div class="page-actions">
        <select v-model="mesFil" class="form-select" style="width:auto;font-size:.85rem">
          <option value="">Todo período</option>
          <option v-for="m in mesesDisponiveis" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>
        <button class="btn btn-secondary" @click="abrirModal('saida')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Despesa
        </button>
        <button class="btn btn-primary" @click="abrirModal('entrada')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Receita
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid kpi-grid--3">
      <div class="kpi-card">
        <span class="kpi-label">Receitas</span>
        <span class="kpi-value kpi-value--accent">{{ fp.fmt(recMes) }}</span>
        <span class="kpi-sub">{{ listaFiltrada.filter(t=>t.tipo==='entrada').length }} entradas</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Despesas</span>
        <span class="kpi-value kpi-value--danger">{{ fp.fmt(saiMes) }}</span>
        <span class="kpi-sub">{{ listaFiltrada.filter(t=>t.tipo==='saida').length }} saídas</span>
      </div>
      <div class="kpi-card" :class="saldoMes >= 0 ? '' : 'kpi-card--neg'">
        <span class="kpi-label">Saldo</span>
        <span class="kpi-value" :style="{ color: saldoMes >= 0 ? 'var(--accent)' : 'var(--status-danger)' }">
          {{ fp.fmt(saldoMes) }}
        </span>
        <span class="kpi-sub">{{ saldoMes >= 0 ? 'superávit' : 'déficit' }}</span>
      </div>
    </div>

    <!-- Gráfico despesas por categoria -->
    <div class="card chart-card" v-if="listaFiltrada.some(t=>t.tipo==='saida')">
      <h3 class="chart-title">Despesas por categoria</h3>
      <div class="chart-wrap"><canvas ref="chartCat"></canvas></div>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Transações</h3>
        <div style="display:flex;gap:.5rem">
          <select v-model="tipoFil" class="form-select" style="width:auto;font-size:.82rem">
            <option value="">Todos tipos</option>
            <option value="entrada">Receitas</option>
            <option value="saida">Despesas</option>
          </select>
          <select v-model="catFil" class="form-select" style="width:auto;font-size:.82rem">
            <option value="">Todas categorias</option>
            <option v-for="c in catsDisponiveis" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>

      <div v-if="listaFiltrada.length === 0" class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <p>Nenhuma transação encontrada</p>
        <button class="btn btn-primary btn-sm" @click="abrirModal('saida')">Adicionar primeira despesa</button>
      </div>

      <div v-else class="table-wrapper">
        <table class="fp-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Status</th>
              <th style="text-align:right">Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in listaFiltrada" :key="t.id" class="fp-row" @click="editarTx(t)">
              <td class="fp-date">{{ fmtData(t.data) }}</td>
              <td class="fp-desc">{{ t.descricao }}</td>
              <td><span class="badge">{{ t.cat }}</span></td>
              <td>
                <span class="badge" :class="t.st === 'pago' ? 'badge-accent' : 'badge-warning'">
                  {{ t.st === 'pago' ? 'Pago' : 'Pendente' }}
                </span>
              </td>
              <td class="fp-val" :style="{ color: t.tipo === 'entrada' ? 'var(--accent)' : 'var(--status-danger)' }">
                {{ t.tipo === 'entrada' ? '+' : '-' }}{{ fp.fmt(t.val) }}
              </td>
              <td>
                <button class="btn-icon btn-ghost" @click.stop="confirmarRemover(t)" title="Remover">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Drawer -->
    <div v-show="drawer" class="drawer-bg" @click="drawer = false"></div>
    <div v-show="drawer" class="drawer">
      <div class="drawer-header">
        <h3 class="drawer-title">{{ form.id ? 'Editar' : (form.tipo === 'entrada' ? 'Nova receita' : 'Nova despesa') }}</h3>
        <button class="btn-icon btn-ghost" @click="drawer = false">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="drawer-body">
        <div class="drawer-section">
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select v-model="form.tipo" class="form-select">
              <option value="saida">Despesa</option>
              <option value="entrada">Receita</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Descrição</label>
            <input v-model="form.descricao" class="form-input" placeholder="Ex: Aluguel, Mercado..." />
          </div>
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <select v-model="form.cat" class="form-select">
              <option v-for="c in (form.tipo === 'entrada' ? fp.CATS_ENTRADA : fp.CATS_SAIDA)" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valor (R$)</label>
            <input v-model="form.val" class="form-input" type="number" min="0" step="0.01" placeholder="0,00" />
          </div>
          <div class="form-group">
            <label class="form-label">Data</label>
            <input v-model="form.data" class="form-input" type="date" />
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.st" class="form-select">
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Observação</label>
            <textarea v-model="form.obs" class="form-textarea" rows="2" placeholder="Opcional..."></textarea>
          </div>
        </div>
      </div>
      <div class="drawer-footer">
        <button class="btn btn-ghost" @click="drawer = false">Cancelar</button>
        <button class="btn btn-primary" @click="salvar" :disabled="saving">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, inject, onMounted } from 'vue'
import { useFinPessoalStore } from '@/stores/finPessoal'

const fp    = useFinPessoalStore()
const toast = inject('toast')

onMounted(fp.load)

// Filtros
const mesFil  = ref('')
const tipoFil = ref('')
const catFil  = ref('')

const mesesDisponiveis = computed(() => {
  const set = new Set(fp.items.map(t => t.data?.slice(0, 7)).filter(Boolean))
  return [...set].sort((a, b) => b.localeCompare(a)).map(v => ({
    val: v,
    label: new Date(v + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }))
})

const listaFiltrada = computed(() => {
  let l = fp.items
  if (mesFil.value) l = l.filter(t => t.data?.startsWith(mesFil.value))
  if (tipoFil.value) l = l.filter(t => t.tipo === tipoFil.value)
  if (catFil.value) l = l.filter(t => t.cat === catFil.value)
  return l
})

const catsDisponiveis = computed(() => [...new Set(listaFiltrada.value.map(t => t.cat))].sort())

const recMes  = computed(() => listaFiltrada.value.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.val), 0))
const saiMes  = computed(() => listaFiltrada.value.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.val), 0))
const saldoMes = computed(() => recMes.value - saiMes.value)

// Chart
const chartCat = ref(null)
let chartInst  = null
watch(listaFiltrada, () => nextTick(renderChart), { deep: true })
onMounted(() => nextTick(renderChart))

function renderChart() {
  if (!chartCat.value || !window.Chart) return
  const gastos = fp.gastosPorCat()
  const entries = Object.entries(gastos).filter(([, v]) => v > 0)
  if (!entries.length) { if (chartInst) { chartInst.destroy(); chartInst = null } return }

  const COLORS = ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316']
  if (chartInst) chartInst.destroy()
  window.Chart.defaults.font.family = 'Sora'
  chartInst = new window.Chart(chartCat.value, {
    type: 'doughnut',
    data: {
      labels: entries.map(([k]) => k),
      datasets: [{ data: entries.map(([, v]) => v), backgroundColor: COLORS, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: 'var(--text-secondary)', font: { size: 11 }, padding: 14 } },
        tooltip: { callbacks: { label: ctx => ` ${fp.fmt(ctx.raw)}` } }
      }
    }
  })
}

// Drawer / form
const drawer = ref(false)
const saving = ref(false)
const form   = ref(formVazio('saida'))

function formVazio(tipo) {
  return {
    id: null, tipo, descricao: '', val: '',
    cat: tipo === 'entrada' ? 'Salário' : 'Alimentação',
    data: new Date().toISOString().split('T')[0],
    st: 'pago', obs: ''
  }
}

watch(() => form.value.tipo, tipo => {
  form.value.cat = tipo === 'entrada' ? 'Salário' : 'Alimentação'
})

function abrirModal(tipo) {
  form.value = formVazio(tipo)
  drawer.value = true
}

function editarTx(t) {
  form.value = { id: t.id, tipo: t.tipo, descricao: t.descricao, val: t.val, cat: t.cat, data: t.data, st: t.st, obs: t.obs || '' }
  drawer.value = true
}

async function salvar() {
  if (!form.value.descricao || !form.value.val || !form.value.data) {
    toast?.('Preencha descrição, valor e data', 'warn'); return
  }
  saving.value = true
  try {
    await fp.upsert(form.value)
    drawer.value = false
    toast?.(form.value.id ? 'Transação atualizada' : 'Transação adicionada', 'ok')
    nextTick(renderChart)
  } catch {
    toast?.('Erro ao salvar', 'error')
  } finally {
    saving.value = false
  }
}

async function confirmarRemover(t) {
  if (!confirm(`Remover "${t.descricao}"?`)) return
  try {
    await fp.remove(t.id)
    toast?.('Removido', 'ok')
    nextTick(renderChart)
  } catch {
    toast?.('Erro ao remover', 'error')
  }
}

function fmtData(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
</script>

<style scoped>
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: .75rem;
  padding: 3rem 1rem; color: var(--text-tertiary); text-align: center;
}
.empty-state p { margin: 0; font-size: .875rem; }

.chart-card { padding: 1rem 1.25rem; }
.chart-title { font-size: .875rem; font-weight: 600; color: var(--text-primary); margin: 0 0 .75rem; }
.chart-wrap { height: 180px; }

.fp-table { width: 100%; border-collapse: collapse; }
.fp-table th {
  font-size: .7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: .07em; color: var(--text-tertiary);
  padding: .5rem .75rem; border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}
.fp-row {
  cursor: pointer;
  transition: background 100ms;
}
.fp-row:hover { background: var(--bg-elevated); }
.fp-row td { padding: .625rem .75rem; border-bottom: 1px solid var(--border-subtle); }
.fp-row:last-child td { border-bottom: none; }
.fp-date { font-size: .78rem; color: var(--text-tertiary); white-space: nowrap; }
.fp-desc { font-size: .85rem; color: var(--text-primary); font-weight: 500; }
.fp-val  { text-align: right; font-size: .9rem; font-weight: 700; white-space: nowrap; }

.drawer-bg {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  z-index: 400; backdrop-filter: blur(2px);
}
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 360px; max-width: 100vw;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-default);
  z-index: 401; display: flex; flex-direction: column;
  box-shadow: -8px 0 40px rgba(0,0,0,.3);
}
[data-theme="light"] .drawer { box-shadow: -4px 0 24px rgba(0,0,0,.1); }
.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-default); flex-shrink: 0;
}
.drawer-title { font-size: .9375rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.drawer-body { flex: 1; overflow-y: auto; padding: 1rem 1.25rem; }
.drawer-section { display: flex; flex-direction: column; gap: .75rem; }
.drawer-footer {
  display: flex; gap: .75rem; padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-default); flex-shrink: 0;
}
.drawer-footer .btn { flex: 1; justify-content: center; }
</style>
