<template>
  <div class="page-layout">

    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Visão geral do negócio</p>
      </div>
      <div class="page-actions">
        <select v-model="mesSel" class="form-select" style="width:auto;font-size:.85rem">
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

    <!-- Follow-ups de hoje -->
    <div v-if="fuHoje.length" class="fu-hoje-card">
      <div class="fu-hoje-head">
        <div class="fu-hoje-titulo">
          <span class="fu-hoje-dot-pulse"></span>
          Follow-ups de hoje
          <span class="fu-hoje-count">{{ fuHoje.length }}</span>
        </div>
        <router-link to="/crm" class="btn btn-ghost btn-sm">CRM →</router-link>
      </div>
      <div class="fu-hoje-list">
        <div v-for="l in fuHoje" :key="l.id" class="fu-hoje-item">
          <span class="fu-hoje-hora">{{ fmtHora(l.proximo_followup) }}</span>
          <div class="fu-hoje-info">
            <span class="fu-hoje-nome">{{ l.nome }}</span>
            <span v-if="l.negocio" class="fu-hoje-neg">{{ l.negocio }}</span>
          </div>
          <button class="btn btn-secondary btn-sm fu-hoje-wa" @click="$router.push('/slaczap?lead='+l.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            SlacZap
          </button>
        </div>
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

    <!-- Card IA Conversão -->
    <div class="ai-conv-card">
      <!-- Header -->
      <div class="ai-conv-header">
        <div class="ai-conv-title-row">
          <div class="ai-conv-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" style="fill:var(--accent)"/></svg>
          </div>
          <span class="ai-conv-title">Análise de conversão</span>
          <span class="ai-conv-badge">IA</span>
        </div>
        <div class="ai-conv-actions">
          <span v-if="aiConvTs" class="ai-conv-ts">{{ aiConvTs }}</span>
          <button class="btn btn-ghost btn-sm ai-conv-btn" @click="analisarConversao" :disabled="aiConvLoading">
            <svg v-if="!aiConvLoading" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ai-conv-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
            {{ aiConvLoading ? 'Analisando...' : (aiConvData ? 'Reanalisar' : 'Analisar agora') }}
          </button>
        </div>
      </div>

      <!-- Vazio -->
      <div v-if="!aiConvData && !aiConvLoading" class="ai-conv-empty">
        <p>Clique em <strong>Analisar agora</strong> para gerar uma análise inteligente do seu funil de vendas.</p>
      </div>

      <!-- Loading skeleton -->
      <div v-else-if="aiConvLoading && !aiConvData" class="ai-conv-skeleton">
        <div class="ai-skel-score"></div>
        <div class="ai-skel-lines">
          <div class="ai-skel-line ai-skel-line--lg"></div>
          <div class="ai-skel-line"></div>
          <div class="ai-skel-line ai-skel-line--sm"></div>
        </div>
      </div>

      <!-- Resultado -->
      <div v-else-if="aiConvData" class="ai-conv-body">
        <!-- Score -->
        <div class="ai-conv-score-wrap">
          <div class="ai-conv-score" :class="aiConvScoreClass">
            <svg class="ai-conv-ring" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg-elevated)" stroke-width="4"/>
              <circle cx="28" cy="28" r="24" fill="none" :stroke="aiConvRingColor" stroke-width="4"
                stroke-linecap="round" stroke-dasharray="150.796"
                :stroke-dashoffset="150.796 * (1 - aiConvData.score / 100)"
                transform="rotate(-90 28 28)" style="transition:stroke-dashoffset .8s ease"/>
            </svg>
            <span class="ai-conv-score-num">{{ aiConvData.score }}</span>
          </div>
          <div class="ai-conv-score-info">
            <span class="ai-conv-label" :class="aiConvScoreClass">{{ aiConvData.label }}</span>
            <span class="ai-conv-label-sub">saúde do funil</span>
          </div>
        </div>

        <!-- Insights -->
        <div class="ai-conv-insights">
          <div v-for="(ins, i) in aiConvData.insights" :key="i" class="ai-conv-insight" :class="'ai-conv-insight--'+ins.tipo">
            <span class="ai-conv-insight-dot"></span>
            <span class="ai-conv-insight-txt">{{ ins.texto }}</span>
          </div>
        </div>

        <!-- Recomendação funil -->
        <div class="ai-conv-rec">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>{{ aiConvData.recomendacao }}</span>
        </div>

        <!-- Análise do script -->
        <div v-if="aiConvData.script" class="ai-script-section">
          <div class="ai-script-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Script de vendas</span>
            <span class="ai-script-score" :class="aiScriptScoreClass">{{ aiConvData.script.score }}/100</span>
          </div>
          <div class="ai-script-items">
            <div v-for="(item, i) in aiConvData.script.pontos_fortes" :key="'f'+i" class="ai-conv-insight ai-conv-insight--positivo">
              <span class="ai-conv-insight-dot"></span>
              <span class="ai-conv-insight-txt">{{ item }}</span>
            </div>
            <div v-for="(item, i) in aiConvData.script.pontos_fracos" :key="'w'+i" class="ai-conv-insight ai-conv-insight--negativo">
              <span class="ai-conv-insight-dot"></span>
              <span class="ai-conv-insight-txt">{{ item }}</span>
            </div>
          </div>
          <div class="ai-conv-rec" style="margin-top:.25rem">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>{{ aiConvData.script.sugestao }}</span>
          </div>
        </div>
        <div v-else-if="aiConvData && !aiConvData.script" class="ai-script-sem">
          Script não configurado —
          <router-link to="/configuracoes" class="ai-script-link">configure em Configurações</router-link>
        </div>

        <!-- Análise de nichos -->
        <div v-if="aiConvData.nichos?.length" class="ai-nichos-section">
          <div class="ai-script-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
            <span>Nichos</span>
          </div>
          <div class="ai-nichos-list">
            <div v-for="n in aiConvData.nichos" :key="n.nome" class="ai-nicho-row" :class="'ai-nicho--'+n.status">
              <div class="ai-nicho-left">
                <span class="ai-nicho-dot"></span>
                <span class="ai-nicho-nome">{{ n.nome }}</span>
              </div>
              <div class="ai-nicho-right">
                <span class="ai-nicho-taxa">{{ n.taxa }}%</span>
                <span class="ai-nicho-sub">{{ n.total }} lead{{ n.total !== 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>
          <div v-if="aiConvData.nichos_insight" class="ai-conv-rec" style="margin-top:.25rem">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>{{ aiConvData.nichos_insight }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Últimas transações -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Últimas transações</h3>
        <router-link to="/financeiro"><button class="btn btn-ghost btn-sm">Ver todas →</button></router-link>
      </div>
      <div class="tx-list">
        <div v-if="!fin.fin.length" class="tx-empty">Nenhuma transação ainda</div>
        <div v-for="t in fin.fin.slice(0,5)" :key="t.id" class="tx-row">
          <div class="tx-date">
            <span class="tx-day">{{ fmtDay(t.data) }}</span>
            <span class="tx-month">{{ fmtMonth(t.data) }}</span>
          </div>
          <div class="tx-info">
            <span class="tx-desc">{{ t.desc }}</span>
            <span v-if="t.cli || t.cliente" class="tx-client text-muted">{{ t.cli || t.cliente }}</span>
          </div>
          <span class="badge" :class="t.tipo==='entrada'?(t.st==='pendente'?'badge-warning':'badge-accent'):'badge-danger'">
            {{ t.tipo==='entrada'?(t.st==='pendente'?'Pendente':'Entrada'):'Saída' }}
          </span>
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
import { useTheme } from '@/composables/useTheme'
import { sb } from '@/lib/supabase'

const fin   = useFinStore()
const leads = useLeadsStore()
const fmt   = fin.fmt
const { theme } = useTheme()

// ── Análise de Conversão IA ──
const AI_CONV_KEY   = 'slac-ai-conv'
const aiConvLoading = ref(false)
const aiConvData    = ref(null)
const aiConvTs      = ref('')

// Carrega do localStorage na inicialização
;(() => {
  try {
    const saved = localStorage.getItem(AI_CONV_KEY)
    if (saved) {
      const { data, ts } = JSON.parse(saved)
      aiConvData.value = data
      aiConvTs.value   = ts
    }
  } catch {}
})()

const aiConvScoreClass = computed(() => {
  if (!aiConvData.value) return ''
  const s = aiConvData.value.score
  if (s >= 75) return 'ai-score--otimo'
  if (s >= 50) return 'ai-score--bom'
  if (s >= 30) return 'ai-score--regular'
  return 'ai-score--critico'
})

const aiScriptScoreClass = computed(() => {
  const s = aiConvData.value?.script?.score || 0
  if (s >= 75) return 'ai-score--otimo'
  if (s >= 50) return 'ai-score--bom'
  return 'ai-score--regular'
})

const aiConvRingColor = computed(() => {
  if (!aiConvData.value) return '#22c55e'
  const s = aiConvData.value.score
  if (s >= 75) return '#22c55e'
  if (s >= 50) return '#e8a838'
  if (s >= 30) return '#e05555'
  return '#e05555'
})

async function analisarConversao() {
  if (aiConvLoading.value) return
  aiConvLoading.value = true
  try {
    const etapas = { contato: 0, interesse: 0, demo: 0, negociacao: 0, fechado: 0, perdido: 0 }
    leads.leads.forEach(l => { if (etapas[l.etapa] !== undefined) etapas[l.etapa]++ })

    const now = new Date()
    const month = now.getMonth()
    const rec6 = fin.mRec.slice(Math.max(0, month - 5), month + 1)

    const fAtual = fin.calcPeriodo(mesSel.value)

    // Agrupa leads por categoria/nicho
    const nichoMap = {}
    leads.leads.forEach(l => {
      const nicho = (l.categoria || l.negocio || '').trim()
      if (!nicho) return
      if (!nichoMap[nicho]) nichoMap[nicho] = { total: 0, fechados: 0, perdidos: 0, negociando: 0 }
      nichoMap[nicho].total++
      if (l.etapa === 'fechado')   nichoMap[nicho].fechados++
      if (l.etapa === 'perdido')   nichoMap[nicho].perdidos++
      if (l.etapa === 'demo' || l.etapa === 'negociacao') nichoMap[nicho].negociando++
    })
    const nichos = Object.entries(nichoMap)
      .filter(([, v]) => v.total >= 2)
      .map(([nome, v]) => ({ nome, ...v, taxa: Math.round(v.fechados / v.total * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)

    // Carrega script diretamente do Supabase para garantir dado atualizado
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    let scriptBase = ''
    try {
      const { data: scriptRow } = await sb
        .from('configuracoes').select('valor')
        .eq('user_id', auth.user.id).eq('chave', 'script_base').maybeSingle()
      scriptBase = scriptRow?.valor?.texto || ''
    } catch {}

    const { data, error } = await sb.functions.invoke('analisar-conversao', {
      body: {
        leads: {
          total:      leads.stats.total,
          por_etapa:  etapas,
          fu_vencidos: leads.followUpsAlerta.length,
          pipeline:   leads.stats.pipe,
        },
        financeiro: {
          receita:   fAtual.rec,
          pendente:  fAtual.pend,
          despesas:  fAtual.sai,
          lucro:     fAtual.lucro,
          clientes:  fAtual.clis,
          rec6,
        },
        scriptBase,
        nichos,
      }
    })
    if (error) throw new Error(error.message || JSON.stringify(error))
    if (data?.error) throw new Error(data.error)
    const ts = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    aiConvData.value = data
    aiConvTs.value   = ts
    localStorage.setItem(AI_CONV_KEY, JSON.stringify({ data, ts }))
  } catch (e) {
    console.error('[analisar-conversao]', e)
  } finally {
    aiConvLoading.value = false
  }
}

// mesSel começa vazio — mostra todos os meses sem resetar ao voltar
const mesSel   = ref('')
const chartRec = ref(null)
const chartGas = ref(null)
let charts = {}

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ETAPA_LABEL = { contato:'Contato', interesse:'Interesse', demo:'Demo', negociacao:'Negociação', fechado:'Fechado', perdido:'Perdido' }
const CHART_FONT  = "'Sora', 'Helvetica Neue', Arial, sans-serif"

const mesesDisponiveis = computed(() => {
  const ms = [...new Set(fin.fin.map(t => t.data?.substring(0,7)).filter(Boolean))].sort().reverse()
  return ms.map(m => {
    const [y, mo] = m.split('-')
    return { val: m, label: MESES[parseInt(mo)-1] + ' ' + y }
  })
})

// f usa mesSel — string vazia = todos os meses (não filtra)
const f = computed(() => fin.calcPeriodo(mesSel.value))

const fuHoje = computed(() => {
  const hoje = new Date().toDateString()
  return leads.leads.filter(l => {
    if (!l.proximo_followup || l.etapa === 'fechado' || l.etapa === 'perdido') return false
    return new Date(l.proximo_followup).toDateString() === hoje
  }).sort((a, b) => new Date(a.proximo_followup) - new Date(b.proximo_followup))
})

function etapaLabel(e) { return ETAPA_LABEL[e] || e }
function fmtData(d)    { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function fmtHora(d)    { if (!d) return '—'; return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function safePercent(v, t) { return !t ? 0 : Math.round(v / t * 100) }

function fmtDay(d)   { if (!d) return '--'; return d.split('-')[2] || '--' }
function fmtMonth(d) { if (!d) return ''; const mo = parseInt(d.split('-')[1]) - 1; return MESES[mo] || '' }

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
        data: { labels: MESES, datasets: [{ label:'Receita', data:fin.mRec, backgroundColor:'rgba(34,197,94,0.2)', borderColor:'#22c55e', borderWidth:2, borderRadius:6, borderSkipped:false }] },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ labels:{ color:c.legend, boxWidth:10, font:{ size:11, family:CHART_FONT } } } },
          scales:{
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
        data: { labels:gd.labels, datasets:[{ data:gd.vals, backgroundColor:['rgba(224,85,85,.7)','rgba(232,168,56,.7)','rgba(91,141,238,.7)','rgba(139,92,246,.7)','rgba(34,197,94,.7)','rgba(20,184,166,.7)'], borderWidth:0, hoverOffset:6 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:c.legend, boxWidth:10, font:{ size:11, family:CHART_FONT }, padding:14 } } } }
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
/* Charts — exclusivo do Dashboard */
.charts-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; min-width:0; }
.chart-card { display:flex; flex-direction:column; gap:.875rem; min-width:0; }
.chart-title { font-size:.9375rem; font-weight:700; color:var(--text-primary); }
.chart-wrap  { height:200px; position:relative; min-width:0; }

@media (max-width:900px) { .charts-row { grid-template-columns:1fr; } }

/* ── Análise de Conversão IA ── */
.ai-conv-card {
  border-radius: var(--radius-lg);
  border: 1px solid rgba(34,197,94,.25);
  background: linear-gradient(135deg, rgba(34,197,94,.06) 0%, var(--bg-surface) 60%);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: .875rem;
}
.ai-conv-header {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
}
.ai-conv-title-row {
  display: flex; align-items: center; gap: .5rem;
}
.ai-conv-icon {
  width: 26px; height: 26px; border-radius: 7px;
  background: var(--accent-subtle);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent); flex-shrink: 0;
}
.ai-conv-title {
  font-size: .875rem; font-weight: 700; color: var(--text-primary);
}
.ai-conv-badge {
  font-size: .6rem; font-weight: 800; letter-spacing: .08em;
  background: var(--accent-subtle); color: var(--accent);
  border-radius: 4px; padding: .1rem .35rem;
}
.ai-conv-actions {
  display: flex; align-items: center; gap: .625rem;
}
.ai-conv-ts {
  font-size: .72rem; color: var(--text-tertiary);
}
.ai-conv-btn { gap: .375rem; }
.ai-conv-spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.ai-conv-empty {
  font-size: .8125rem; color: var(--text-secondary);
  padding: .25rem 0;
}
.ai-conv-empty strong { color: var(--text-primary); }

/* Skeleton */
.ai-conv-skeleton { display: flex; gap: 1rem; align-items: center; padding: .25rem 0; }
.ai-skel-score {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--bg-elevated); flex-shrink: 0;
  animation: skel-pulse 1.4s ease-in-out infinite;
}
.ai-skel-lines { display: flex; flex-direction: column; gap: .5rem; flex: 1; }
.ai-skel-line {
  height: 10px; border-radius: 6px;
  background: var(--bg-elevated);
  animation: skel-pulse 1.4s ease-in-out infinite;
  width: 70%;
}
.ai-skel-line--lg { width: 90%; height: 14px; }
.ai-skel-line--sm { width: 50%; }
@keyframes skel-pulse {
  0%,100% { opacity: .4; }
  50%      { opacity: .8; }
}

/* Body */
.ai-conv-body { display: flex; flex-direction: column; gap: .75rem; }
.ai-conv-score-wrap { display: flex; align-items: center; gap: .875rem; }
.ai-conv-score {
  position: relative; width: 56px; height: 56px; flex-shrink: 0;
}
.ai-conv-ring { width: 56px; height: 56px; }
.ai-conv-score-num {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 800;
  color: var(--text-primary);
}
.ai-conv-score-info { display: flex; flex-direction: column; gap: .125rem; }
.ai-conv-label {
  font-size: 1rem; font-weight: 800;
}
.ai-score--otimo  .ai-conv-score-num,
.ai-conv-label.ai-score--otimo  { color: var(--accent); }
.ai-score--bom    .ai-conv-score-num,
.ai-conv-label.ai-score--bom    { color: var(--status-warning); }
.ai-score--regular .ai-conv-score-num,
.ai-conv-label.ai-score--regular { color: var(--status-danger); }
.ai-score--critico .ai-conv-score-num,
.ai-conv-label.ai-score--critico { color: var(--status-danger); }

.ai-conv-label-sub { font-size: .72rem; color: var(--text-tertiary); }

/* Insights */
.ai-conv-insights { display: flex; flex-direction: column; gap: .375rem; }
.ai-conv-insight {
  display: flex; align-items: flex-start; gap: .5rem;
  font-size: .8125rem; color: var(--text-secondary);
  padding: .3125rem .625rem; border-radius: 7px;
}
.ai-conv-insight--positivo { background: rgba(34,197,94,.06); }
.ai-conv-insight--atencao  { background: rgba(232,168,56,.06); }
.ai-conv-insight--negativo { background: rgba(224,85,85,.06); }
.ai-conv-insight-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
}
.ai-conv-insight--positivo .ai-conv-insight-dot { background: var(--accent); }
.ai-conv-insight--atencao  .ai-conv-insight-dot { background: var(--status-warning); }
.ai-conv-insight--negativo .ai-conv-insight-dot { background: var(--status-danger); }
.ai-conv-insight-txt { line-height: 1.4; }

/* Script */
.ai-script-section {
  display: flex; flex-direction: column; gap: .5rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-script-header {
  display: flex; align-items: center; gap: .4rem;
  font-size: .75rem; font-weight: 700; color: var(--text-secondary);
}
.ai-script-score {
  margin-left: auto; font-size: .72rem; font-weight: 800;
  padding: .1rem .4rem; border-radius: 99px;
}
.ai-script-score.ai-score--otimo  { background: rgba(34,197,94,.12);  color: var(--accent); }
.ai-script-score.ai-score--bom    { background: rgba(232,168,56,.12); color: var(--status-warning); }
.ai-script-score.ai-score--regular{ background: rgba(224,85,85,.12);  color: var(--status-danger); }
.ai-script-items { display: flex; flex-direction: column; gap: .3rem; }
/* Nichos */
.ai-nichos-section {
  display: flex; flex-direction: column; gap: .5rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-nichos-list { display: flex; flex-direction: column; gap: .25rem; }
.ai-nicho-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .3rem .625rem; border-radius: 7px; gap: .75rem;
}
.ai-nicho--otimo    { background: rgba(34,197,94,.06); }
.ai-nicho--bom      { background: rgba(34,197,94,.04); }
.ai-nicho--regular  { background: rgba(232,168,56,.05); }
.ai-nicho--fraco    { background: rgba(224,85,85,.05); }
.ai-nicho-left { display: flex; align-items: center; gap: .45rem; min-width: 0; }
.ai-nicho-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.ai-nicho--otimo   .ai-nicho-dot { background: var(--accent); }
.ai-nicho--bom     .ai-nicho-dot { background: var(--accent); opacity: .6; }
.ai-nicho--regular .ai-nicho-dot { background: var(--status-warning); }
.ai-nicho--fraco   .ai-nicho-dot { background: var(--status-danger); }
.ai-nicho-nome { font-size: .8125rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ai-nicho-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.ai-nicho-taxa { font-size: .8125rem; font-weight: 700; }
.ai-nicho--otimo   .ai-nicho-taxa { color: var(--accent); }
.ai-nicho--bom     .ai-nicho-taxa { color: var(--accent); }
.ai-nicho--regular .ai-nicho-taxa { color: var(--status-warning); }
.ai-nicho--fraco   .ai-nicho-taxa { color: var(--status-danger); }
.ai-nicho-sub { font-size: .7rem; color: var(--text-tertiary); }

.ai-script-sem {
  font-size: .75rem; color: var(--text-tertiary);
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-script-link { color: var(--accent); text-decoration: underline; }

/* Recomendação */
.ai-conv-rec {
  display: flex; align-items: flex-start; gap: .5rem;
  font-size: .8rem; color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-conv-rec svg { color: var(--accent); margin-top: 1px; }

/* Follow-ups de hoje */
.fu-hoje-card {
  border-radius: var(--radius-lg);
  border: 1px solid rgba(232,168,56,.2);
  background: rgba(232,168,56,.04);
  padding: 1rem 1.25rem;
}
.fu-hoje-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: .875rem;
}
.fu-hoje-titulo {
  display: flex; align-items: center; gap: .625rem;
  font-size: .875rem; font-weight: 700; color: var(--text-primary);
}
.fu-hoje-count {
  background: rgba(232,168,56,.18); color: var(--status-warning);
  font-size: .65rem; font-weight: 700; border-radius: 99px;
  padding: .1rem .5rem; letter-spacing: .02em;
}
.fu-hoje-dot-pulse {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--status-warning); flex-shrink: 0;
  box-shadow: 0 0 0 0 rgba(232,168,56,.5);
  animation: fu-pulse 2s ease-in-out infinite;
}
@keyframes fu-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(232,168,56,.5); }
  50%      { box-shadow: 0 0 0 5px rgba(232,168,56,0); }
}
.fu-hoje-list { display: flex; flex-direction: column; gap: .375rem; }
.fu-hoje-item {
  display: flex; align-items: center; gap: .75rem;
  padding: .5rem .625rem; border-radius: 8px;
  transition: background 100ms ease;
}
.fu-hoje-item:hover { background: rgba(232,168,56,.06); }
.fu-hoje-hora {
  font-size: .72rem; font-weight: 700;
  color: var(--status-warning); flex-shrink: 0; min-width: 40px;
  font-variant-numeric: tabular-nums;
}
.fu-hoje-info { display: flex; flex-direction: column; gap: .05rem; flex: 1; min-width: 0; }
.fu-hoje-nome { font-size: .875rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-hoje-neg  { font-size: .72rem; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-hoje-wa {
  flex-shrink: 0; color: #25d366; opacity: .6;
  display: flex; align-items: center;
  transition: opacity 120ms ease;
}
.fu-hoje-wa:hover { opacity: 1; }
</style>
