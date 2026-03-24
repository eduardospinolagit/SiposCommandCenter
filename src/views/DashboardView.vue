<template>
  <div class="dash-page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Visão geral do negócio</p>
      </div>
      <div class="page-actions">
        <select v-model="mesSel" class="form-select" style="width:auto;font-size:.85rem" @change="popularMes">
          <option value="">Todos os meses</option>
          <option v-for="m in mesesDisponiveis" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>
        <button class="btn btn-secondary" @click="exportar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </div>
    </div>

    <!-- KPIs Financeiros -->
    <div class="kpi-grid kpi-grid--5">
      <div class="kpi-card">
        <span class="kpi-label">Receita</span>
        <span class="kpi-value kpi-value--accent">{{ fmt(f.rec) }}</span>
        <span class="kpi-sub">recebida</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">A receber</span>
        <span class="kpi-value kpi-value--warning">{{ fmt(f.pend) }}</span>
        <span class="kpi-sub">pendente</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Despesas</span>
        <span class="kpi-value kpi-value--danger">{{ fmt(f.sai) }}</span>
        <span class="kpi-sub">total</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Lucro</span>
        <span class="kpi-value" :class="f.lucro >= 0 ? 'kpi-value--accent' : 'kpi-value--danger'">{{ fmt(f.lucro) }}</span>
        <span class="kpi-sub">{{ f.lucro >= 0 ? 'positivo' : 'negativo' }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Clientes pagos</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ f.clis }}</span>
        <span class="kpi-sub">no período</span>
      </div>
    </div>

    <!-- Meta -->
    <div class="card meta-card">
      <div class="meta-row">
        <span class="meta-label">
          Meta mensal: <strong>{{ fmt(fin.meta.val) }}</strong>
          <span v-if="fin.meta.desc" class="meta-desc"> — {{ fin.meta.desc }}</span>
        </span>
        <span class="meta-pct" :class="metaPct >= 100 ? 'pct-ok' : ''">{{ fmt(f.rec) }} · {{ metaPct }}%</span>
      </div>
      <div class="meta-bar">
        <div class="meta-fill" :style="{ width: Math.min(100, metaPct) + '%' }"></div>
      </div>
    </div>

    <!-- Alertas follow-up -->
    <div v-if="leads.followUpsAlerta.length" class="card card--followup">
      <div class="followup-header">
        <div class="followup-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Follow-ups pendentes
          <span class="badge badge-warning">{{ leads.followUpsAlerta.length }}</span>
        </div>
        <router-link to="/crm" class="btn btn-ghost btn-sm">Ver no CRM →</router-link>
      </div>
      <div class="table-wrapper" style="border:none;border-radius:0;margin-top:.75rem">
        <table>
          <thead><tr><th>Lead</th><th>Negócio</th><th>Etapa</th><th>Follow-up</th><th></th></tr></thead>
          <tbody>
            <tr v-for="l in leads.followUpsAlerta.slice(0,5)" :key="l.id">
              <td style="font-weight:600">{{ l.nome }}</td>
              <td class="text-muted">{{ l.negocio || '—' }}</td>
              <td><span class="badge badge-warning">{{ etapaLabel(l.etapa) }}</span></td>
              <td style="color:var(--status-warning);font-size:.85rem">{{ fmtData(l.proximo_followup) }}</td>
              <td>
                <a :href="'https://wa.me/55' + l.telefone.replace(/\D/g,'')" target="_blank">
                  <button class="btn btn-ghost btn-sm">WhatsApp</button>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Gráficos -->
    <div class="charts-row">
      <div class="card chart-card">
        <h3 class="chart-title">Receita mensal</h3>
        <div class="chart-wrap"><canvas ref="chartRec"></canvas></div>
      </div>
      <div class="card chart-card">
        <h3 class="chart-title">Despesas por categoria</h3>
        <div class="chart-wrap"><canvas ref="chartGas"></canvas></div>
      </div>
    </div>

    <!-- KPIs Progresso -->
    <div class="sec-header"><h2 class="sec-title">Progresso</h2></div>
    <div class="kpi-grid kpi-grid--4">
      <div class="kpi-card">
        <span class="kpi-label">Feito</span>
        <span class="kpi-value kpi-value--accent">{{ mapa.stats.ok }}</span>
        <span class="kpi-sub">{{ safePercent(mapa.stats.ok, mapa.stats.total) }}% completo</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Em andamento</span>
        <span class="kpi-value kpi-value--warning">{{ mapa.stats.doing }}</span>
        <span class="kpi-sub">em progresso</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Faltando</span>
        <span class="kpi-value kpi-value--danger">{{ mapa.stats.nope }}</span>
        <span class="kpi-sub">para fazer</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Futuro</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ mapa.stats.future }}</span>
        <span class="kpi-sub">planejado</span>
      </div>
    </div>

    <!-- KPIs CRM -->
    <div class="sec-header"><h2 class="sec-title">Prospecção</h2></div>
    <div class="kpi-grid kpi-grid--5">
      <div class="kpi-card">
        <span class="kpi-label">Total leads</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ leads.stats.total }}</span>
        <span class="kpi-sub">no CRM</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Negociando</span>
        <span class="kpi-value kpi-value--warning">{{ leads.stats.negociando }}</span>
        <span class="kpi-sub">demo + negoc.</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Fechados</span>
        <span class="kpi-value kpi-value--accent">{{ leads.stats.fechados }}</span>
        <span class="kpi-sub">convertidos</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Follow-up hoje</span>
        <span class="kpi-value kpi-value--danger">{{ leads.stats.fuHoje }}</span>
        <span class="kpi-sub">pendentes</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Pipeline</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ fmt(leads.stats.pipe) }}</span>
        <span class="kpi-sub">potencial</span>
      </div>
    </div>

    <!-- Últimas transações -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Últimas transações</h3>
        <router-link to="/financeiro">
          <button class="btn btn-ghost btn-sm">Ver todas →</button>
        </router-link>
      </div>
      <div class="tx-list">
        <div v-if="!fin.fin.length" class="tx-empty">Nenhuma transação ainda</div>
        <div v-for="t in fin.fin.slice(0,5)" :key="t.id" class="tx-row">
          <!-- Data: compacta e responsiva -->
          <div class="tx-date">
            <span class="tx-day">{{ fmtDay(t.data) }}</span>
            <span class="tx-month">{{ fmtMonth(t.data) }}</span>
          </div>
          <!-- Descrição -->
          <div class="tx-info">
            <span class="tx-desc">{{ t.desc }}</span>
            <span class="tx-client text-muted" v-if="t.cli || t.cliente">{{ t.cli || t.cliente }}</span>
          </div>
          <!-- Badge -->
          <span class="badge tx-badge"
            :class="t.tipo==='entrada'?(t.st==='pendente'?'badge-warning':'badge-accent'):'badge-danger'">
            {{ t.tipo==='entrada'?(t.st==='pendente'?'Pendente':'Entrada'):'Saída' }}
          </span>
          <!-- Valor -->
          <span class="tx-val" :style="{ color: t.tipo==='entrada'?'var(--accent)':'var(--status-danger)' }">
            {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useFinStore } from '@/stores/fin'
import { useLeadsStore } from '@/stores/leads'
import { useMapaStore } from '@/stores/mapa'
import { useTheme } from '@/composables/useTheme'

const fin   = useFinStore()
const leads = useLeadsStore()
const mapa  = useMapaStore()
const fmt   = fin.fmt
const { theme } = useTheme()

const mesSel   = ref('')
const chartRec = ref(null)
const chartGas = ref(null)
let charts = {}

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ETAPA_LABEL = { contato:'Contato', interesse:'Interesse', demo:'Demo', negociacao:'Negociação', fechado:'Fechado', perdido:'Perdido' }
const CHART_FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif"

const mesesDisponiveis = computed(() => {
  const ms = [...new Set(fin.fin.map(t => t.data?.substring(0,7)).filter(Boolean))].sort().reverse()
  return ms.map(m => {
    const [y, mo] = m.split('-')
    return { val: m, label: MESES[parseInt(mo)-1] + ' ' + y }
  })
})

const f       = computed(() => fin.calcPeriodo(mesSel.value))
const metaPct = computed(() => Math.min(100, Math.round(f.value.rec / (fin.meta.val || 1) * 100)))

function etapaLabel(e)   { return ETAPA_LABEL[e] || e }
function fmtData(d)      { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function safePercent(v, t) { return !t ? 0 : Math.round(v / t * 100) }
function popularMes()    { if (!mesSel.value && mesesDisponiveis.value.length) mesSel.value = mesesDisponiveis.value[0].val }

// Data responsiva para lista de transações
function fmtDay(d) {
  if (!d) return '--'
  const parts = d.split('-')
  return parts[2] || '--'
}
function fmtMonth(d) {
  if (!d) return ''
  const parts = d.split('-')
  const mo = parseInt(parts[1]) - 1
  return MESES[mo] || ''
}

function chartColors() {
  const dark = theme.value === 'dark'
  return {
    grid:   dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    tick:   dark ? '#555' : '#9ca3af',
    legend: dark ? '#777' : '#6b7280',
  }
}

function renderCharts() {
  if (!window.Chart) return
  window.Chart.defaults.font.family = CHART_FONT
  window.Chart.defaults.font.size   = 11
  nextTick(() => {
    const c = chartColors()
    if (chartRec.value) {
      if (charts.rec) charts.rec.destroy()
      charts.rec = new window.Chart(chartRec.value, {
        type: 'bar',
        data: {
          labels: MESES,
          datasets: [{ label:'Receita', data:fin.mRec, backgroundColor:'rgba(34,197,94,0.2)', borderColor:'#22c55e', borderWidth:2, borderRadius:6, borderSkipped:false }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins: { legend:{ labels:{ color:c.legend, boxWidth:10, font:{ size:11, family:CHART_FONT } } } },
          scales: {
            x:{ grid:{ color:c.grid }, ticks:{ color:c.tick, font:{ size:10, family:CHART_FONT } } },
            y:{ grid:{ color:c.grid }, ticks:{ color:c.tick, font:{ size:10, family:CHART_FONT }, callback:v=>'R$'+v } }
          }
        }
      })
    }
    if (chartGas.value) {
      if (charts.gas) charts.gas.destroy()
      const gd = fin.gastosData()
      charts.gas = new window.Chart(chartGas.value, {
        type: 'doughnut',
        data: {
          labels: gd.labels,
          datasets: [{ data:gd.vals, backgroundColor:['rgba(224,85,85,.7)','rgba(232,168,56,.7)','rgba(91,141,238,.7)','rgba(139,92,246,.7)','rgba(34,197,94,.7)','rgba(20,184,166,.7)'], borderWidth:0, hoverOffset:6 }]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'bottom', labels:{ color:c.legend, boxWidth:10, font:{ size:11, family:CHART_FONT }, padding:14 } } }
        }
      })
    }
  })
}

function exportar() {
  const rows = [['Data','Descrição','Categoria','Cliente','Tipo','Valor']]
  fin.fin.forEach(t => rows.push([t.data||'',t.desc||'',t.categoria||'',t.cli||t.cliente||'',t.tipo||'',t.val||0]))
  const csv = rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `slac-financeiro-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

onMounted(() => {
  popularMes()
  if (!window.Chart) {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
    s.onload = renderCharts
    document.head.appendChild(s)
  } else {
    renderCharts()
  }
})
onUnmounted(() => { Object.values(charts).forEach(c => c?.destroy()) })
watch(() => fin.fin.length, renderCharts)
watch(theme, renderCharts)
</script>

<style scoped>
.dash-page {
  padding: 1.25rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.kpi-grid { display: grid; gap: .75rem; }
.kpi-grid--5 { grid-template-columns: repeat(5, 1fr); }
.kpi-grid--4 { grid-template-columns: repeat(4, 1fr); }

/* Meta */
.meta-card { padding: .875rem 1.25rem; }
.meta-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: .625rem; flex-wrap: wrap; gap: .5rem;
}
.meta-label { font-size: .8125rem; color: var(--text-secondary); }
.meta-desc  { color: var(--text-tertiary); }
.meta-pct   { font-size: .8125rem; font-weight: 600; color: var(--text-tertiary); }
.pct-ok     { color: var(--accent); }
.meta-bar   { height: 6px; background: var(--bg-overlay); border-radius: 99px; overflow: hidden; }
.meta-fill  { height: 100%; background: var(--accent); border-radius: 99px; transition: width 600ms ease; }

/* Follow-up */
.card--followup { border-color: rgba(232,168,56,.3); background: var(--status-warning-subtle); }
.followup-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
.followup-title  { display:flex; align-items:center; gap:.5rem; font-size:.875rem; font-weight:700; color:var(--status-warning); }

/* Charts */
.charts-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; min-width:0; }
.chart-card { display:flex; flex-direction:column; gap:.875rem; min-width:0; }
.chart-title { font-size:.9375rem; font-weight:700; color:var(--text-primary); }
.chart-wrap  { height:200px; position:relative; min-width:0; }

/* Section header */
.sec-header { display:flex; align-items:center; margin-top:.125rem; }
.sec-title  { font-size:.68rem; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--text-tertiary); }

/* Card header */
.card-header { display:flex; align-items:center; justify-content:space-between; }
.card-title  { font-size:.9375rem; font-weight:700; color:var(--text-primary); }

/* Transações — layout responsivo sem tabela */
.tx-list { display:flex; flex-direction:column; margin-top:.75rem; }
.tx-empty { text-align:center; color:var(--text-tertiary); padding:2rem; font-size:.875rem; }

.tx-row {
  display: flex;
  align-items: center;
  gap: .875rem;
  padding: .75rem 0;
  border-bottom: 1px solid var(--border-subtle);
}
.tx-row:last-child { border-bottom: none; }

.tx-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 32px;
}
.tx-day   { font-size: .9375rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
.tx-month { font-size: .65rem; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing:.04em; }

.tx-info  { flex:1; display:flex; flex-direction:column; gap:.1rem; min-width:0; }
.tx-desc  { font-size:.875rem; font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tx-client{ font-size:.75rem; }

.tx-badge { flex-shrink:0; }

.tx-val {
  flex-shrink: 0;
  font-size: .9rem;
  font-weight: 700;
  font-family: var(--font-display);
  min-width: 80px;
  text-align: right;
}

/* Responsive */
@media (max-width: 1100px) {
  .kpi-grid--5 { grid-template-columns: repeat(3, 1fr); }
  .kpi-grid--4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .charts-row { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .dash-page { padding:1rem 1rem 5rem; gap:1rem; }
  .kpi-grid--5, .kpi-grid--4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .kpi-grid--5, .kpi-grid--4 { grid-template-columns: 1fr; }
  .tx-badge { display: none; }
}
</style>
