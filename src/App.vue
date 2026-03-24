<template>
  <!-- Loading inicial -->
  <div v-if="auth.loading" class="loading-screen">
    <div class="spin"></div>
    <p>Carregando SLAC...</p>
  </div>

  <!-- App -->
  <router-view v-else />

  <!-- Toast global -->
  <div class="toast" :class="[toast.type, { show: toast.show }]">{{ toast.message }}</div>

  <!-- Saving indicator -->
  <div class="saving" :class="{ show: saving }">
    <div class="saving-dot"></div>
    Salvando...
  </div>
</template>

<script setup>
import { onMounted, provide, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Toast global
const toast = ref({ show: false, message: '', type: 'ok' })
let toastTimer = null
function showToast(message, type = 'ok') {
  toast.value = { show: true, message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 2800)
}
provide('toast', showToast)

// Saving indicator
const saving = ref(false)
let savingTimer = null
function showSaving() {
  saving.value = true
  clearTimeout(savingTimer)
  savingTimer = setTimeout(() => { saving.value = false }, 8000)
}
function hideSaving() {
  clearTimeout(savingTimer)
  saving.value = false
}
provide('saving', { showSaving, hideSaving })

onMounted(async () => {
  if (!auth.user) await auth.init()
})
</script>
