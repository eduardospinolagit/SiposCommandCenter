<template>
  <div v-if="auth.loading" class="loading-screen">
    <div class="spinner"></div>
    <p>Carregando SLAC...</p>
  </div>

  <router-view v-else />

  <!-- Toast — canto direito -->
  <Transition name="toast-anim">
    <div v-if="toast.show" class="toast-global" :class="`toast--${toast.type}`">
      <svg v-if="toast.type==='ok'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <svg v-else-if="toast.type==='error'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {{ toast.message }}
    </div>
  </Transition>

  <!-- Saving — canto esquerdo, mesmo estilo do toast -->
  <Transition name="toast-anim">
    <div v-if="saving" class="saving-global">
      <div class="spinner" style="width:13px;height:13px;border-width:1.5px;flex-shrink:0"></div>
      Salvando...
    </div>
  </Transition>
</template>

<script setup>
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { sb } from '@/lib/supabase'

const auth   = useAuthStore()
const router = useRouter()
const { initTheme } = useTheme()

// ── Toast ──
const toast = ref({ show: false, message: '', type: 'ok' })
let toastTimer = null
function showToast(message, type = 'ok') {
  toast.value = { show: true, message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 2800)
}
provide('toast', showToast)

// ── Saving ──
const saving = ref(false)
let savingTimer = null
function showSaving() {
  saving.value = true
  clearTimeout(savingTimer)
  // Fallback de segurança: some depois de 8s mesmo sem hideSaving
  savingTimer = setTimeout(() => { saving.value = false }, 8000)
}
function hideSaving() {
  clearTimeout(savingTimer)
  saving.value = false
}
provide('saving', { showSaving, hideSaving })

// ── Sessão: refresh ao voltar de inativo ──
async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    try {
      const { data, error } = await sb.auth.getSession()
      if (error || !data.session) {
        await auth.logout()
        router.push('/login')
        return
      }
      await sb.auth.refreshSession()
    } catch (e) { console.warn('[SLAC] Erro ao renovar sessão:', e) }
  }
}

// ── Auth: listener para redirecionar sem F5 ──
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Já logou — se estiver na tela de login, redireciona
    if (router.currentRoute.value.path === '/login') {
      router.push('/dashboard')
    }
    // Reinicializa estado do auth store
    auth.init()
  }
  if (event === 'SIGNED_OUT') {
    router.push('/login')
  }
})

let keepAliveInterval = null

onMounted(async () => {
  initTheme()
  await auth.init()
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Keep-alive: refresh a cada 10min em background
  keepAliveInterval = setInterval(async () => {
    try { await sb.auth.refreshSession() }
    catch (e) { console.warn('[SLAC] keep-alive falhou:', e) }
  }, 10 * 60 * 1000)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (keepAliveInterval) clearInterval(keepAliveInterval)
})
</script>

<style>
.loading-screen {
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1rem; background: var(--bg-base);
  color: var(--text-tertiary);
  font-family: var(--font-body); font-size: .9rem;
}

/* Toast — direita */
.toast-global {
  position: fixed;
  bottom: 1.5rem; right: 1.5rem;
  z-index: 9999;
  display: flex; align-items: center; gap: .625rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: .75rem 1.125rem;
  font-family: var(--font-body); font-size: .875rem;
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
  min-width: 220px; max-width: 340px;
}
.toast--ok    { border-left: 3px solid var(--accent); }
.toast--ok svg    { color: var(--accent); flex-shrink:0; }
.toast--error { border-left: 3px solid var(--status-danger); }
.toast--error svg { color: var(--status-danger); flex-shrink:0; }
.toast--warn  { border-left: 3px solid var(--status-warning); }
.toast--warn svg  { color: var(--status-warning); flex-shrink:0; }

/* Saving — esquerda, mesmo estilo do toast */
.saving-global {
  position: fixed;
  bottom: 1.5rem; left: 1.5rem;
  z-index: 9998;
  display: flex; align-items: center; gap: .5rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--status-info);
  border-radius: var(--radius-lg);
  padding: .75rem 1.125rem;
  font-family: var(--font-body); font-size: .875rem;
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
}

/* Transições iguais para toast e saving */
.toast-anim-enter-active, .toast-anim-leave-active { transition: all 200ms ease; }
.toast-anim-enter-from { opacity: 0; transform: translateY(8px); }
.toast-anim-leave-to   { opacity: 0; transform: translateY(8px); }
</style>
