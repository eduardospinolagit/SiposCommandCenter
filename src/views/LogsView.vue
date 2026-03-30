<template>
  <div class="page-layout">
    <div class="page-header">
      <div>
        <h1 class="page-title">Logs</h1>
        <p class="page-subtitle">{{ total }} entradas · atualizado {{ lastRefresh }}</p>
      </div>
      <div class="page-actions">
        <select v-model="filterLevel" class="form-select" style="width:120px">
          <option value="">Todos níveis</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <select v-model="filterSource" class="form-select" style="width:150px">
          <option value="">Todos módulos</option>
          <option value="auth">AUTH — Login</option>
          <option value="crm">CRM — Leads</option>
          <option value="fin">FIN — Financeiro</option>
          <option value="work">WRK — Tarefas</option>
          <option value="zap">ZAP — WhatsApp</option>
          <option value="sdr">SDR — Agente IA</option>
          <option value="pro">PRO — Prospecção</option>
          <option value="sys">SYS — Sistema</option>
          <option value="wa-send">wa-send</option>
          <option value="gerar-script">gerar-script</option>
          <option value="wa-webhook">wa-webhook</option>
          <option value="frontend">frontend</option>
        </select>
        <button class="btn btn-secondary btn-sm" @click="load" :disabled="loading">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Atualizar
        </button>
        <button class="btn btn-danger btn-sm" @click="limpar">Limpar logs</button>
      </div>
    </div>

    <div class="card card--flat" v-if="loading && !rows.length">
      <p class="text-muted" style="text-align:center;padding:2rem">Carregando...</p>
    </div>

    <div v-else-if="!rows.length" class="card card--flat">
      <p class="text-muted" style="text-align:center;padding:2rem">Nenhum log encontrado.</p>
    </div>

    <div v-else class="logs-table-wrap">
      <table class="logs-table">
        <thead>
          <tr>
            <th style="width:155px">Hora</th>
            <th style="width:62px">Nível</th>
            <th style="width:90px">Código</th>
            <th style="width:75px">Módulo</th>
            <th>Mensagem</th>
            <th style="width:36px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in rows" :key="row.id">
            <tr class="log-row" :class="'log-row--' + row.level" @click="toggleExpand(row.id)">
              <td class="log-ts">{{ fmtTs(row.created_at) }}</td>
              <td><span class="log-badge" :class="'log-badge--' + row.level">{{ row.level }}</span></td>
              <td>
                <span v-if="row.data?.code" class="log-code" :class="'log-code--' + row.source">{{ row.data.code }}</span>
                <span v-else class="log-code log-code--legacy">—</span>
              </td>
              <td class="log-source">{{ row.source }}</td>
              <td class="log-msg">{{ row.message }}</td>
              <td class="log-expand-btn">
                <svg v-if="row.data" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline :points="expanded.has(row.id) ? '18 15 12 9 6 15' : '6 9 12 15 18 9'"/></svg>
              </td>
            </tr>
            <tr v-if="expanded.has(row.id) && row.data" class="log-data-row">
              <td colspan="6">
                <pre class="log-data">{{ JSON.stringify(row.data, null, 2) }}</pre>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue'
import { sb } from '@/lib/supabase'
import { slacLog } from '@/utils/log'
import { uid } from '@/utils/uid'

const toast        = inject('toast')
const rows         = ref([])
const loading      = ref(false)
const filterLevel  = ref('')
const filterSource = ref('')
const expanded     = ref(new Set())
const lastRefresh  = ref('—')
const total        = computed(() => rows.value.length)

let timer = null

async function load() {
  loading.value = true
  let q = sb.from('logs').select('*').order('created_at', { ascending: false }).limit(500)
  if (filterLevel.value)  q = q.eq('level', filterLevel.value)
  if (filterSource.value) q = q.eq('source', filterSource.value)
  const { data } = await q
  rows.value = data || []
  lastRefresh.value = new Date().toLocaleTimeString('pt-BR')
  loading.value = false
}

function toggleExpand(id) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR')
}

async function limpar() {
  if (!confirm('Apagar todos os logs?')) return
  try {
    const total = rows.value.length
    // Filtra por created_at < agora — funciona com qualquer tipo de id
    const { error } = await sb.from('logs').delete().lt('created_at', new Date().toISOString())
    if (error) throw error
    rows.value = []
    // Insere SYS-003 de forma awaited antes de recarregar
    const userId = uid()
    await sb.from('logs').insert({
      user_id: userId,
      level: 'info',
      source: 'sys',
      message: `Logs limpos manualmente (${total} entradas removidas)`,
      data: { code: 'SYS-003', total_removido: total },
    })
    await load()
    toast('Logs apagados', 'ok')
  } catch (e) {
    console.error('[limpar logs]', e)
    toast('Erro ao apagar: ' + (e?.message || e), 'error')
  }
}

watch([filterLevel, filterSource], load)

onMounted(() => {
  load()
  timer = setInterval(load, 30000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.logs-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--bg-overlay); }
.logs-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.logs-table thead tr { background: var(--bg-elevated); }
.logs-table th { padding: .55rem .75rem; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--bg-overlay); }
.log-row { cursor: pointer; }
.log-row td { padding: .5rem .75rem; border-bottom: 1px solid var(--bg-overlay); vertical-align: top; background-color: transparent; }
.log-row--error td { background-color: rgba(224,85,85,.04); }
.log-row--warn td  { background-color: rgba(232,168,56,.04); }
.log-row:hover td  { background-color: var(--bg-elevated); }
.log-ts     { color: var(--text-secondary); white-space: nowrap; font-size: .75rem; }
.log-source { color: var(--text-secondary); font-family: monospace; font-size: .75rem; }
.log-msg    { color: var(--text-primary); word-break: break-word; }
.log-expand-btn { text-align: center; color: var(--text-tertiary); }
.log-data-row td { padding: 0; background: var(--bg-base); }
.log-data { margin: 0; padding: .75rem 1rem; font-size: .73rem; color: var(--text-secondary); white-space: pre-wrap; word-break: break-all; font-family: monospace; max-height: 300px; overflow-y: auto; }
.log-badge { display: inline-block; padding: .15rem .45rem; border-radius: 4px; font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.log-badge--info  { background: rgba(91,141,238,.15); color: #5b8dee; }
.log-badge--warn  { background: rgba(232,168,56,.15); color: #e8a838; }
.log-badge--error { background: rgba(224,85,85,.15); color: #e05555; }
/* código do log */
.log-code { display: inline-block; padding: .12rem .4rem; border-radius: 4px; font-size: .7rem; font-weight: 700; font-family: monospace; letter-spacing: .03em; white-space: nowrap; }
.log-code--auth  { background: rgba(139,92,246,.15); color: #a78bfa; }
.log-code--crm   { background: rgba(59,130,246,.15);  color: #60a5fa; }
.log-code--fin   { background: rgba(34,197,94,.15);   color: #4ade80; }
.log-code--work  { background: rgba(249,115,22,.15);  color: #fb923c; }
.log-code--zap   { background: rgba(34,197,94,.15);   color: #22c55e; }
.log-code--sdr   { background: rgba(232,168,56,.15);  color: #e8a838; }
.log-code--pro   { background: rgba(91,141,238,.15);  color: #5b8dee; }
.log-code--sys   { background: rgba(224,85,85,.15);   color: #e05555; }
.log-code--legacy { background: var(--bg-elevated); color: var(--text-tertiary); }

[data-theme="light"] .log-code--auth  { background: rgba(139,92,246,.12); }
[data-theme="light"] .log-code--crm   { background: rgba(59,130,246,.12); }
[data-theme="light"] .log-code--fin   { background: rgba(34,197,94,.12); }
[data-theme="light"] .log-code--work  { background: rgba(249,115,22,.12); }
[data-theme="light"] .log-code--zap   { background: rgba(34,197,94,.12); }
[data-theme="light"] .log-code--sdr   { background: rgba(232,168,56,.12); }
[data-theme="light"] .log-code--pro   { background: rgba(91,141,238,.12); }
[data-theme="light"] .log-code--sys   { background: rgba(224,85,85,.12); }
</style>
