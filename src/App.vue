<template>
  <div v-if="auth.loading" class="loading-screen">
    <div class="spin"></div>
    <p>Carregando SLAC...</p>
  </div>

  <router-view v-else />

  <div class="toast" :class="[toast.type, { show: toast.show }]">{{ toast.message }}</div>

  <div class="saving" :class="{ show: saving }">
    <div class="saving-dot"></div>
    Salvando...
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { sb } from '@/lib/supabase'
import { useTheme } from '@/composables/useTheme'

const auth = useAuthStore()

// ── Tema dark/light — inicia aqui para evitar flash ──
const { initTheme } = useTheme()

// ── Toast global ──
const toast = ref({ show: false, message: '', type: 'ok' })
let toastTimer = null

function showToast(message, type = 'ok') {
  toast.value = { show: true, message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 2800)
}
provide('toast', showToast)

// ── Saving indicator ──
const saving = ref(false)
let savingTimer = null

function showSaving() {
  saving.value = true
  clearTimeout(savingTimer)
  savingTimer = setTimeout(() => { saving.value = false }, 12000)
}

function hideSaving() {
  clearTimeout(savingTimer)
  saving.value = false
}

provide('saving', { showSaving, hideSaving })

// ── Renovar sessão quando página volta do inativo ──
async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    try {
      const { data, error } = await sb.auth.getSession()
      if (error || !data.session) {
        await auth.logout()
        return
      }
      await sb.auth.refreshSession()
    } catch (e) {
      console.warn('Erro ao renovar sessão:', e)
    }
  }
}

onMounted(async () => {
  // Aplica tema antes de qualquer render para evitar flash
  initTheme()
  await auth.init()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>
