<template>
  <div class="page-layout">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">SDR por IA</h1>
        <p class="page-subtitle">Agente autônomo de vendas via WhatsApp</p>
      </div>
      <div class="page-actions">
        <div class="sdr-global-toggle" :class="{ 'sdr-global-toggle--on': wa.sdrConfig.enabled }">
          <span class="sdr-toggle-label">{{ wa.sdrConfig.enabled ? 'SDR Ativo' : 'SDR Desativado' }}</span>
          <button class="sdr-toggle-pill" @click="toggleGlobal">
            <span class="sdr-toggle-thumb"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Status bar -->
    <div v-if="wa.sdrConfig.enabled" class="sdr-status-bar">
      <span class="sdr-status-dot"></span>
      SDR rodando · {{ activeChatsCount }} chat{{ activeChatsCount !== 1 ? 's' : '' }} ativo{{ activeChatsCount !== 1 ? 's' : '' }}
      <span v-if="!wa.sdrIsInHours()" class="sdr-status-fora"> · Fora do horário configurado</span>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid kpi-grid--4">
      <div class="kpi-card">
        <p class="kpi-label">Chats com SDR</p>
        <p class="kpi-value kpi-value--accent">{{ activeChatsCount }}</p>
        <p class="kpi-sub">ativo{{ activeChatsCount !== 1 ? 's' : '' }} agora</p>
      </div>
      <div class="kpi-card">
        <p class="kpi-label">Respostas hoje</p>
        <p class="kpi-value">{{ todayResponded }}</p>
        <p class="kpi-sub">enviadas pelo SDR</p>
      </div>
      <div class="kpi-card">
        <p class="kpi-label">Escaladas hoje</p>
        <p class="kpi-value kpi-value--warning">{{ todayEscalated }}</p>
        <p class="kpi-sub">para atendimento humano</p>
      </div>
      <div class="kpi-card">
        <p class="kpi-label">Taxa de resposta</p>
        <p class="kpi-value" :class="taxaClass">{{ taxa }}%</p>
        <p class="kpi-sub">SDR vs escaladas</p>
      </div>
    </div>

    <!-- Config + Chats ativos -->
    <div class="sdr-grid">

      <!-- Configuração -->
      <div class="card">
        <div class="card-header">
          <p class="card-title">Configuração</p>
          <button class="btn btn-primary btn-sm" @click="saveConfig" :disabled="saving">
            <svg v-if="saving" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="animation:sdr-spin .7s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>

        <div class="sdr-config-body">

          <!-- Etapas -->
          <div class="sdr-config-section">
            <p class="sdr-config-label">Atuar nas etapas</p>
            <div class="sdr-etapas">
              <label v-for="e in ETAPAS" :key="e.id" class="sdr-etapa-toggle"
                :class="{ 'sdr-etapa-toggle--on': localConfig.etapas.includes(e.id) }">
                <input type="checkbox" :value="e.id" v-model="localConfig.etapas" style="display:none" />
                {{ e.label }}
              </label>
            </div>
          </div>

          <!-- Horários -->
          <div class="sdr-config-section">
            <p class="sdr-config-label">Horário de funcionamento</p>
            <div class="sdr-horario-row">
              <div class="sdr-horario-field">
                <label class="form-label">Início</label>
                <input type="time" class="form-input" v-model="localConfig.horaInicio" />
              </div>
              <span class="sdr-horario-sep">até</span>
              <div class="sdr-horario-field">
                <label class="form-label">Fim</label>
                <input type="time" class="form-input" v-model="localConfig.horaFim" />
              </div>
            </div>
          </div>

          <!-- Dias da semana -->
          <div class="sdr-config-section">
            <p class="sdr-config-label">Dias da semana</p>
            <div class="sdr-dias">
              <label v-for="d in DIAS" :key="d.id" class="sdr-dia-toggle"
                :class="{ 'sdr-dia-toggle--on': localConfig.diasSemana.includes(d.id) }">
                <input type="checkbox" :value="d.id" v-model="localConfig.diasSemana" style="display:none" />
                {{ d.label }}
              </label>
            </div>
          </div>

          <!-- Limite de mensagens -->
          <div class="sdr-config-section">
            <p class="sdr-config-label">Limite de mensagens por chat</p>
            <div style="display:flex;align-items:center;gap:.75rem">
              <input type="range" min="3" max="30" step="1" v-model.number="localConfig.limiteMsg"
                class="sdr-range" />
              <span class="sdr-range-val">{{ localConfig.limiteMsg }}</span>
            </div>
            <p class="sdr-config-hint">O SDR para de responder automaticamente após este número de mensagens</p>
          </div>

        </div>
      </div>

      <!-- Chats gerenciados -->
      <div class="card">
        <div class="card-header">
          <p class="card-title">Chats com SDR</p>
          <span class="badge badge-accent">{{ activeChatsCount }} ativo{{ activeChatsCount !== 1 ? 's' : '' }}</span>
        </div>

        <div v-if="!managedChats.length" class="sdr-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.25"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Nenhum chat gerenciado</p>
          <p class="text-sm text-muted">Ative o SDR em conversas no SlacZap</p>
        </div>

        <div v-else class="sdr-chat-list">
          <div v-for="c in managedChats" :key="c.key" class="sdr-chat-row">
            <div class="sdr-chat-info">
              <div class="sdr-chat-avatar">{{ (c.nome || '?')[0].toUpperCase() }}</div>
              <div>
                <p class="sdr-chat-name">{{ c.nome || c.key }}</p>
                <p class="sdr-chat-count text-sm text-muted">{{ c.msgCount || 0 }} msg{{ c.msgCount !== 1 ? 's' : '' }} enviadas</p>
              </div>
            </div>
            <div class="sdr-chat-badge" :class="c.active ? 'sdr-chat-badge--on' : 'sdr-chat-badge--off'">
              {{ c.active ? 'Ativo' : 'Pausado' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Log de atividade -->
    <div class="card">
      <div class="card-header">
        <p class="card-title">Log de Atividade</p>
        <button v-if="wa.sdrLogs.length" class="btn btn-ghost btn-sm" @click="wa.sdrLogs.splice(0)">Limpar</button>
      </div>

      <div v-if="!wa.sdrLogs.length" class="sdr-empty" style="padding:2rem 1.5rem">
        <p class="text-muted text-sm">Nenhuma atividade ainda. O SDR registrará ações aqui em tempo real.</p>
      </div>

      <div v-else class="sdr-log-list">
        <div v-for="(log, i) in wa.sdrLogs" :key="i" class="sdr-log-row">
          <div class="sdr-log-icon" :class="log.acao === 'respondeu' ? 'sdr-log-icon--ok' : 'sdr-log-icon--warn'">
            <svg v-if="log.acao === 'respondeu'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
          </div>
          <div class="sdr-log-body">
            <div class="sdr-log-top">
              <span class="sdr-log-lead">{{ log.leadNome }}</span>
              <span class="sdr-log-acao" :class="log.acao === 'respondeu' ? 'sdr-log-acao--ok' : 'sdr-log-acao--warn'">
                {{ log.acao === 'respondeu' ? 'Respondeu' : 'Escalou' }}
              </span>
            </div>
            <p class="sdr-log-msg text-sm text-muted">{{ log.msg }}</p>
          </div>
          <span class="sdr-log-ts text-sm text-muted">{{ fmtTs(log.ts) }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useWaStore } from '@/stores/wa'

const wa    = useWaStore()
const toast = inject('toast')

const saving = ref(false)

const ETAPAS = [
  { id: 'contato',    label: 'Contato' },
  { id: 'interesse',  label: 'Interesse' },
  { id: 'demo',       label: 'Demo' },
  { id: 'negociacao', label: 'Negociação' },
]

const DIAS = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
]

const localConfig = reactive({
  etapas:     ['contato', 'interesse'],
  horaInicio: '08:00',
  horaFim:    '18:00',
  diasSemana: [1, 2, 3, 4, 5],
  limiteMsg:  15,
})

onMounted(async () => {
  await wa.loadSdrConfig()
  Object.assign(localConfig, {
    etapas:     [...(wa.sdrConfig.etapas || ['contato', 'interesse'])],
    horaInicio: wa.sdrConfig.horaInicio || '08:00',
    horaFim:    wa.sdrConfig.horaFim    || '18:00',
    diasSemana: [...(wa.sdrConfig.diasSemana || [1,2,3,4,5])],
    limiteMsg:  wa.sdrConfig.limiteMsg  || 15,
  })
})

async function toggleGlobal() {
  wa.sdrConfig.enabled = !wa.sdrConfig.enabled
  await wa.saveSdrConfig()
}

async function saveConfig() {
  saving.value = true
  try {
    Object.assign(wa.sdrConfig, {
      etapas:     [...localConfig.etapas],
      horaInicio: localConfig.horaInicio,
      horaFim:    localConfig.horaFim,
      diasSemana: [...localConfig.diasSemana],
      limiteMsg:  localConfig.limiteMsg,
    })
    await wa.saveSdrConfig()
    toast('Configurações do SDR salvas', 'ok')
  } catch (e) {
    console.error('[SDR] saveConfig:', e)
    toast('Erro ao salvar configurações', 'error')
  } finally {
    saving.value = false
  }
}

const activeChatsCount = computed(() =>
  Object.values(wa.sdrChats).filter(c => c?.active).length
)

const managedChats = computed(() => {
  return Object.entries(wa.sdrChats).map(([key, val]) => ({
    key,
    nome: key.startsWith('lead_') ? key.replace('lead_', 'Lead #') : key.replace('phone_', ''),
    active: val?.active,
    msgCount: val?.msgCount,
  }))
})

const todayResponded = computed(() => {
  const today = new Date().toDateString()
  return wa.sdrLogs.filter(l => l.acao === 'respondeu' && new Date(l.ts).toDateString() === today).length
})

const todayEscalated = computed(() => {
  const today = new Date().toDateString()
  return wa.sdrLogs.filter(l => l.acao === 'escalou' && new Date(l.ts).toDateString() === today).length
})

const taxa = computed(() => {
  const total = todayResponded.value + todayEscalated.value
  if (!total) return 0
  return Math.round(todayResponded.value / total * 100)
})

const taxaClass = computed(() => {
  if (taxa.value >= 70) return 'kpi-value--accent'
  if (taxa.value >= 40) return 'kpi-value--warning'
  return 'kpi-value--danger'
})

function fmtTs(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
@keyframes sdr-spin { to { transform: rotate(360deg) } }
@keyframes sdr-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .4 } }

/* Status bar */
.sdr-status-bar {
  display: flex; align-items: center; gap: .5rem;
  font-size: .8rem; color: var(--accent); font-weight: 500;
  background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.18);
  border-radius: 8px; padding: .5rem .875rem;
}
.sdr-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent); flex-shrink: 0;
  animation: sdr-pulse 1.8s ease infinite;
}
.sdr-status-fora { color: var(--status-warning); }

/* Global toggle */
.sdr-global-toggle {
  display: flex; align-items: center; gap: .625rem;
  background: var(--bg-elevated); border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: .5rem .875rem;
  transition: border-color .2s, background .2s;
}
.sdr-global-toggle--on {
  border-color: rgba(34,197,94,.35);
  background: rgba(34,197,94,.06);
}
.sdr-toggle-label { font-size: .8rem; font-weight: 600; color: var(--text-secondary); }
.sdr-global-toggle--on .sdr-toggle-label { color: var(--accent); }
.sdr-toggle-pill {
  width: 36px; height: 20px; border-radius: 10px;
  background: var(--bg-overlay); border: none; cursor: pointer;
  position: relative; transition: background .2s; flex-shrink: 0;
}
.sdr-global-toggle--on .sdr-toggle-pill { background: var(--accent); }
.sdr-toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--text-secondary); transition: transform .2s, background .2s;
}
.sdr-global-toggle--on .sdr-toggle-thumb {
  transform: translateX(16px); background: #fff;
}

/* Grid layout */
.sdr-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
}
@media (max-width: 768px) { .sdr-grid { grid-template-columns: 1fr; } }

/* Config body */
.sdr-config-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1.125rem; }
.sdr-config-section { display: flex; flex-direction: column; gap: .5rem; }
.sdr-config-label { font-size: .75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .06em; }
.sdr-config-hint { font-size: .72rem; color: var(--text-tertiary); margin: 0; }

/* Etapa toggles */
.sdr-etapas { display: flex; flex-wrap: wrap; gap: .375rem; }
.sdr-etapa-toggle {
  padding: .3rem .7rem; border-radius: 6px; font-size: .775rem; font-weight: 500; cursor: pointer;
  border: 1px solid var(--border-subtle); color: var(--text-secondary);
  background: var(--bg-elevated); transition: all .15s;
}
.sdr-etapa-toggle--on {
  border-color: rgba(34,197,94,.4); color: var(--accent);
  background: rgba(34,197,94,.08);
}

/* Dias toggles */
.sdr-dias { display: flex; gap: .375rem; flex-wrap: wrap; }
.sdr-dia-toggle {
  width: 38px; height: 32px; border-radius: 6px; font-size: .75rem; font-weight: 600;
  cursor: pointer; border: 1px solid var(--border-subtle); color: var(--text-secondary);
  background: var(--bg-elevated); display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.sdr-dia-toggle--on {
  border-color: rgba(34,197,94,.4); color: var(--accent);
  background: rgba(34,197,94,.08);
}

/* Horário */
.sdr-horario-row { display: flex; align-items: flex-end; gap: .625rem; }
.sdr-horario-field { display: flex; flex-direction: column; gap: .25rem; }
.sdr-horario-field .form-input { width: 110px; }
.sdr-horario-sep { font-size: .8rem; color: var(--text-tertiary); padding-bottom: .5rem; }

/* Range */
.sdr-range { flex: 1; accent-color: var(--accent); cursor: pointer; }
.sdr-range-val {
  font-size: .875rem; font-weight: 700; color: var(--text-primary);
  min-width: 2rem; text-align: right;
}

/* Chat list */
.sdr-chat-list { padding: .25rem; display: flex; flex-direction: column; gap: .125rem; }
.sdr-chat-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .625rem .75rem; border-radius: 8px; transition: background .15s;
}
.sdr-chat-row:hover { background: var(--bg-elevated); }
.sdr-chat-info { display: flex; align-items: center; gap: .625rem; }
.sdr-chat-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--bg-overlay); display: flex; align-items: center; justify-content: center;
  font-size: .8rem; font-weight: 700; color: var(--text-secondary);
}
.sdr-chat-name { font-size: .825rem; font-weight: 600; margin: 0; }
.sdr-chat-count { margin: 0; }
.sdr-chat-badge {
  font-size: .7rem; font-weight: 700; padding: .2rem .55rem;
  border-radius: 5px; text-transform: uppercase; letter-spacing: .05em;
}
.sdr-chat-badge--on  { background: rgba(34,197,94,.12); color: var(--accent); }
.sdr-chat-badge--off { background: var(--bg-overlay); color: var(--text-tertiary); }

/* Empty */
.sdr-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: .5rem; padding: 2.5rem 1.25rem; color: var(--text-tertiary); font-size: .82rem; text-align: center;
}

/* Log */
.sdr-log-list { display: flex; flex-direction: column; }
.sdr-log-row {
  display: flex; align-items: flex-start; gap: .75rem;
  padding: .75rem 1.25rem; border-bottom: 1px solid var(--border-subtle);
  transition: background .15s;
}
.sdr-log-row:last-child { border-bottom: none; }
.sdr-log-row:hover { background: var(--bg-elevated); }
.sdr-log-icon {
  width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
}
.sdr-log-icon--ok   { background: rgba(34,197,94,.12); color: var(--accent); }
.sdr-log-icon--warn { background: rgba(232,168,56,.12); color: var(--status-warning); }
.sdr-log-body { flex: 1; min-width: 0; }
.sdr-log-top  { display: flex; align-items: center; gap: .5rem; margin-bottom: .25rem; }
.sdr-log-lead { font-size: .82rem; font-weight: 600; color: var(--text-primary); }
.sdr-log-acao { font-size: .7rem; font-weight: 700; padding: .1rem .45rem; border-radius: 4px; text-transform: uppercase; letter-spacing: .05em; }
.sdr-log-acao--ok   { background: rgba(34,197,94,.12); color: var(--accent); }
.sdr-log-acao--warn { background: rgba(232,168,56,.12); color: var(--status-warning); }
.sdr-log-msg { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sdr-log-ts { font-size: .72rem; color: var(--text-tertiary); white-space: nowrap; flex-shrink: 0; padding-top: 2px; }

/* Light mode */
[data-theme="light"] .sdr-global-toggle { background: #f5f5f7; }
[data-theme="light"] .sdr-etapa-toggle  { background: #f0f0f2; }
[data-theme="light"] .sdr-dia-toggle    { background: #f0f0f2; }
[data-theme="light"] .sdr-toggle-pill   { background: #d1d1d6; }
</style>
