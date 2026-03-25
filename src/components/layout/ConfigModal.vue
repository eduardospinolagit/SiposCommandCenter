<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="cfg-backdrop" @click.self="$emit('update:modelValue', false)">
        <div class="cfg-modal">

          <div class="cfg-modal-header">
            <h2 class="cfg-modal-title">Configurações</h2>
            <button class="btn btn-ghost btn-icon" @click="$emit('update:modelValue', false)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- TABS -->
          <div class="cfg-tabs">
            <button v-for="t in tabs" :key="t.id" class="cfg-tab" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
              <span v-html="t.icon"></span>
              {{ t.label }}
            </button>
          </div>

          <div class="cfg-body">

            <!-- PERFIL -->
            <div v-if="activeTab === 'perfil'" class="cfg-panel">
              <div class="cfg-avatar-row">
                <div class="cfg-avatar">{{ userInitial }}</div>
                <div>
                  <p class="cfg-name">{{ auth.userName }}</p>
                  <p class="cfg-email">{{ auth.user?.email }}</p>
                  <span class="plan-tag" :class="`plan-tag--${auth.role}`">{{ auth.roleLabel }}</span>
                </div>
              </div>
              <div class="cfg-field">
                <label class="cfg-label">Nome de exibição</label>
                <div class="cfg-row-inline">
                  <input v-model="nomeEdit" class="form-input" placeholder="Seu nome" maxlength="40" @keydown.enter="salvarNome" />
                  <button class="btn btn-primary btn-sm" @click="salvarNome" :disabled="nomeEdit === auth.userName || !nomeEdit.trim()">Salvar</button>
                </div>
              </div>
            </div>

            <!-- SEGURANÇA -->
            <div v-if="activeTab === 'seguranca'" class="cfg-panel">
              <p class="cfg-section-label">Alterar senha</p>
              <div class="cfg-field">
                <label class="cfg-label">Nova senha</label>
                <input v-model="novaSenha" type="password" class="form-input" placeholder="Mínimo 6 caracteres" />
              </div>
              <div class="cfg-field">
                <label class="cfg-label">Confirmar nova senha</label>
                <input v-model="confirmarSenha" type="password" class="form-input" placeholder="Repita a senha" @keydown.enter="alterarSenha" />
              </div>
              <p v-if="senhaErro" class="cfg-error">{{ senhaErro }}</p>
              <button class="btn btn-secondary btn-sm" @click="alterarSenha" :disabled="salvandoSenha" style="align-self:flex-start">
                {{ salvandoSenha ? 'Salvando...' : 'Atualizar senha' }}
              </button>
            </div>

            <!-- PLANO -->
            <div v-if="activeTab === 'plano'" class="cfg-panel">

              <!-- PRO -->
              <template v-if="auth.role === 'pro'">
                <div class="cfg-plan-box cfg-plan-box--current">
                  <div class="cfg-plan-row">
                    <div>
                      <p class="cfg-label">Plano atual</p>
                      <p class="cfg-plan-name">Pro</p>
                    </div>
                    <span class="plan-tag plan-tag--pro">PRO</span>
                  </div>
                  <ul class="cfg-benefits">
                    <li v-for="b in beneficiosPro" :key="b"><span class="bcheck">✓</span>{{ b }}</li>
                  </ul>
                </div>
                <div class="cfg-plan-box cfg-plan-box--elite">
                  <div class="cfg-plan-row">
                    <div>
                      <p class="cfg-label">Quer mais poder?</p>
                      <p class="cfg-plan-name cfg-plan-elite-text">Elite</p>
                    </div>
                    <span class="plan-tag plan-tag--elite">ELITE</span>
                  </div>
                  <p class="cfg-upgrade-desc">Recursos avançados para escalar sua prospecção e gestão.</p>
                  <ul class="cfg-benefits cfg-benefits--elite">
                    <li v-for="b in beneficiosElite" :key="b"><span class="bcheck bcheck--elite">✦</span>{{ b }}</li>
                  </ul>
                  <button class="btn cfg-btn-upgrade">
                    Fazer upgrade para Elite
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </div>
              </template>

              <!-- ELITE -->
              <template v-else-if="auth.role === 'elite'">
                <div class="cfg-plan-box cfg-plan-box--elite-active">
                  <div class="cfg-plan-row">
                    <div>
                      <p class="cfg-label">Plano atual</p>
                      <p class="cfg-plan-name cfg-plan-elite-text">Elite</p>
                    </div>
                    <span class="plan-tag plan-tag--elite">ELITE</span>
                  </div>
                  <ul class="cfg-benefits cfg-benefits--elite">
                    <li v-for="b in [...beneficiosPro, ...beneficiosElite]" :key="b">
                      <span class="bcheck bcheck--elite">✦</span>{{ b }}
                    </li>
                  </ul>
                  <div class="cfg-elite-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Você está no plano máximo!
                  </div>
                </div>
              </template>

              <!-- ADMIN -->
              <template v-else-if="auth.role === 'admin'">
                <div class="cfg-plan-box">
                  <div class="cfg-plan-row">
                    <div>
                      <p class="cfg-label">Acesso</p>
                      <p class="cfg-plan-name" style="color:#f87171">Administrador</p>
                    </div>
                    <span class="plan-tag plan-tag--admin">ADMIN</span>
                  </div>
                  <p class="cfg-upgrade-desc">Acesso total ao sistema. Gerenciamento de usuários e relatórios disponíveis.</p>
                </div>
              </template>
            </div>

            <!-- APARÊNCIA -->
            <div v-if="activeTab === 'aparencia'" class="cfg-panel">
              <p class="cfg-section-label">Tema</p>
              <div class="cfg-theme-row">
                <button class="cfg-theme-btn" :class="{ active: isDark }" @click="!isDark && toggleTheme()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  <span>Escuro</span>
                </button>
                <button class="cfg-theme-btn" :class="{ active: !isDark }" @click="isDark && toggleTheme()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                  <span>Claro</span>
                </button>
              </div>

              <div class="cfg-divider"></div>
              <p class="cfg-section-label">Notificações</p>
              <div class="cfg-notif-row">
                <div>
                  <p class="cfg-field-title">Alertas de follow-up</p>
                  <p class="cfg-hint">Push quando um follow-up vencer</p>
                </div>
                <button class="btn btn-sm" :class="notifAtiva ? 'btn-primary' : 'btn-secondary'" @click="pedirNotificacao" :disabled="notifAtiva">
                  {{ notifAtiva ? 'Ativo' : 'Ativar' }}
                </button>
              </div>
            </div>

            <!-- DADOS -->
            <div v-if="activeTab === 'dados'" class="cfg-panel">
              <div class="cfg-data-row">
                <div>
                  <p class="cfg-field-title">Exportar leads</p>
                  <p class="cfg-hint">Baixe todos os seus leads em CSV</p>
                </div>
                <button class="btn btn-secondary btn-sm" @click="exportarLeads">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Exportar CSV
                </button>
              </div>
              <div class="cfg-divider"></div>
              <div class="cfg-data-row">
                <div>
                  <p class="cfg-field-title">Versão</p>
                  <p class="cfg-hint">SLAC v2.0 — Sano Lab</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'
import { useTheme } from '@/composables/useTheme'
import { sb } from '@/lib/supabase'

const props = defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])

const auth  = useAuthStore()
const leads = useLeadsStore()
const toast = inject('toast')
const { theme, toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

const userInitial = computed(() => (auth.userName || '?').charAt(0).toUpperCase())

// Reset ao abrir
watch(() => props.modelValue, v => { if (v) { nomeEdit.value = auth.userName; novaSenha.value = ''; confirmarSenha.value = ''; senhaErro.value = '' } })

// Tabs
const activeTab = ref('perfil')
const tabs = [
  { id: 'perfil',    label: 'Perfil',    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { id: 'seguranca', label: 'Segurança', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
  { id: 'plano',     label: 'Plano',     icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { id: 'aparencia', label: 'Aparência', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>' },
  { id: 'dados',     label: 'Dados',     icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>' },
]

// Perfil
const nomeEdit = ref(auth.userName)
async function salvarNome() {
  if (!nomeEdit.value.trim()) return
  await auth.saveUserName(nomeEdit.value.trim())
  toast?.('Nome atualizado', 'ok')
}

// Segurança
const novaSenha      = ref('')
const confirmarSenha = ref('')
const senhaErro      = ref('')
const salvandoSenha  = ref(false)
async function alterarSenha() {
  senhaErro.value = ''
  if (novaSenha.value.length < 6) { senhaErro.value = 'Mínimo 6 caracteres.'; return }
  if (novaSenha.value !== confirmarSenha.value) { senhaErro.value = 'As senhas não coincidem.'; return }
  salvandoSenha.value = true
  try {
    const { error } = await sb.auth.updateUser({ password: novaSenha.value })
    if (error) throw error
    novaSenha.value = ''; confirmarSenha.value = ''
    toast?.('Senha atualizada', 'ok')
  } catch (e) {
    senhaErro.value = e.message || 'Erro ao atualizar senha.'
  } finally { salvandoSenha.value = false }
}

// Plano
const beneficiosPro = [
  'CRM com Kanban e pipeline visual',
  'Módulo Financeiro completo',
  'Controle de Recorrências',
  'Prospecção via CSV',
  'Follow-up e Relead com alertas',
  'Modo Foco fullscreen',
  'Notificações push',
]
const beneficiosElite = [
  'Relatórios avançados e analytics',
  'Múltiplos usuários / equipe',
  'Integração WhatsApp automática',
  'Prospecção automatizada (sem CSV)',
  'Suporte prioritário',
  'Acesso antecipado a novos recursos',
]

// Aparência / Notificações
const notifAtiva = ref(Notification?.permission === 'granted')
async function pedirNotificacao() {
  const perm = await Notification.requestPermission()
  notifAtiva.value = perm === 'granted'
  toast?.(perm === 'granted' ? 'Notificações ativadas' : 'Permissão negada', perm === 'granted' ? 'ok' : 'error')
}

// Dados
function exportarLeads() {
  const cols = ['nome','negocio','telefone','categoria','cidade','instagram','site_atual','etapa','prioridade','valor_estimado','notas','created_at']
  const header = cols.join(';')
  const rows = leads.leads.map(l => cols.map(c => `"${(l[c] ?? '').toString().replace(/"/g,'""')}"`).join(';'))
  const csv = [header, ...rows].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `slac-leads-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  toast?.('CSV exportado', 'ok')
}
</script>

<style scoped>
.cfg-backdrop {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
}
[data-theme="light"] .cfg-backdrop { background: rgba(200,200,210,.35); }

.cfg-modal {
  width: 100%; max-width: 560px; max-height: 88vh;
  background: rgba(18,18,18,0.42);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px;
  display: flex; flex-direction: column;
  overflow: hidden;
  will-change: opacity;
}
[data-theme="light"] .cfg-modal {
  background: rgba(255,255,255,.52);
  border-color: rgba(255,255,255,.8);
}

.cfg-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.125rem 1.25rem .875rem;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.cfg-modal-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }

/* Tabs */
.cfg-tabs {
  display: flex; gap: 0; padding: 0 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0; overflow-x: auto;
}
.cfg-tab {
  display: flex; align-items: center; gap: .375rem;
  padding: .65rem .875rem; background: transparent; border: none;
  font-family: var(--font-body); font-size: .78rem; font-weight: 500;
  color: var(--text-tertiary); cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color 120ms ease, border-color 120ms ease;
}
.cfg-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.cfg-tab:hover:not(.active) { color: var(--text-secondary); }

/* Body */
.cfg-body { flex: 1; overflow-y: auto; padding: 1.25rem; }
.cfg-panel { display: flex; flex-direction: column; gap: .875rem; }
.cfg-section-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--text-tertiary); margin: 0; }
.cfg-field-title { font-size: .875rem; font-weight: 600; color: var(--text-primary); margin: 0 0 .15rem; }
.cfg-hint { font-size: .78rem; color: var(--text-tertiary); margin: 0; }
.cfg-label { font-size: .75rem; color: var(--text-tertiary); margin: 0 0 .3rem; }
.cfg-field { display: flex; flex-direction: column; }
.cfg-error { font-size: .78rem; color: var(--status-danger); margin: 0; }
.cfg-divider { height: 1px; background: var(--border-subtle); }

/* Perfil */
.cfg-avatar-row { display: flex; align-items: center; gap: .875rem; }
.cfg-avatar {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent-subtle); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 700; border: 2px solid rgba(34,197,94,.3);
}
.cfg-name { font-size: .9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 .15rem; }
.cfg-email { font-size: .78rem; color: var(--text-tertiary); margin: 0 0 .375rem; }
.cfg-row-inline { display: flex; gap: .5rem; align-items: center; }
.cfg-row-inline .form-input { flex: 1; }

/* Plano */
.cfg-plan-box {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg); padding: 1rem;
  display: flex; flex-direction: column; gap: .75rem;
}
.cfg-plan-box--current { border-color: rgba(34,197,94,.2); background: rgba(34,197,94,.03); }
.cfg-plan-box--elite   { border-color: rgba(251,191,36,.25); background: rgba(251,191,36,.03); }
.cfg-plan-box--elite-active { border-color: rgba(251,191,36,.3); background: rgba(251,191,36,.04); }
.cfg-plan-row  { display: flex; align-items: flex-start; justify-content: space-between; }
.cfg-plan-name { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: .1rem 0 0; }
.cfg-plan-elite-text { background: linear-gradient(135deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.cfg-upgrade-desc { font-size: .8rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }

.cfg-benefits { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .4rem; }
.cfg-benefits li { display: flex; align-items: flex-start; gap: .4rem; font-size: .8rem; color: var(--text-secondary); }
.cfg-benefits--elite li { color: var(--text-primary); }
.bcheck       { color: var(--accent); font-size: .7rem; flex-shrink: 0; margin-top: .1rem; font-weight: 700; }
.bcheck--elite { color: #fbbf24; }

.cfg-btn-upgrade {
  background: linear-gradient(135deg,#fbbf24,#f59e0b); color: #000;
  border: none; font-weight: 700; font-size: .8rem;
  display: flex; align-items: center; gap: .4rem; justify-content: center;
}
.cfg-btn-upgrade:hover { opacity: .9; }
.cfg-elite-badge {
  display: flex; align-items: center; gap: .4rem; padding: .5rem .75rem;
  background: rgba(251,191,36,.08); border: 1px solid rgba(251,191,36,.2);
  border-radius: var(--radius-md); font-size: .8rem; color: #fbbf24; font-weight: 500;
}

/* Plano tags */
.plan-tag { font-size: .58rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; border-radius: 6px; padding: .2rem .5rem; flex-shrink: 0; }
.plan-tag--pro   { background: rgba(34,197,94,.12);  color: #4ade80; border: 1px solid rgba(34,197,94,.3); }
.plan-tag--elite { background: rgba(251,191,36,.15); color: #fbbf24; border: 1px solid rgba(251,191,36,.35); }
.plan-tag--admin { background: rgba(239,68,68,.12);  color: #f87171; border: 1px solid rgba(239,68,68,.3); }

/* Aparência */
.cfg-theme-row { display: flex; gap: .5rem; }
.cfg-theme-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: .5rem;
  padding: .875rem .5rem; border-radius: var(--radius-lg);
  border: 1px solid var(--border-default); background: var(--bg-elevated);
  font-family: var(--font-body); font-size: .8rem; font-weight: 500;
  color: var(--text-secondary); cursor: pointer; transition: all 120ms ease;
}
.cfg-theme-btn.active { background: var(--accent-subtle); color: var(--accent); border-color: rgba(34,197,94,.35); }
.cfg-notif-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }

/* Dados */
.cfg-data-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
</style>
