<template>
  <div class="login-page">

    <!-- Botão tema canto superior direito -->
    <button class="theme-btn" @click="toggleTheme" :title="isDark ? 'Modo claro' : 'Modo escuro'">
      <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>

    <div class="login-card">

      <!-- Logo -->
      <div class="login-header">
        <img src="/logo.png" alt="SLAC" class="login-logo" />
        <p class="login-sub">Sano Lab · CRM</p>
      </div>

      <!-- Form -->
      <div class="login-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="email"
            class="form-input"
            type="email"
            placeholder="seu@email.com"
            autocomplete="email"
            @keydown.enter="doLogin"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Senha</label>
          <div class="input-wrapper">
            <input
              v-model="password"
              class="form-input"
              :type="showPwd ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              @keydown.enter="doLogin"
            />
            <button class="pwd-toggle" type="button" @click="showPwd = !showPwd" tabindex="-1">
              <svg v-if="!showPwd" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <Transition name="err-fade">
          <div v-if="error" class="login-error">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ error }}
          </div>
        </Transition>

        <button class="login-btn" :class="{ loading }" :disabled="loading" @click="doLogin">
          <span v-if="!loading">Entrar</span>
          <span v-else class="login-spinner"></span>
        </button>
      </div>

      <p class="login-footer">Acesso restrito · Sano Lab</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'

const auth = useAuthStore()
const { theme, toggleTheme, initTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)
const showPwd  = ref(false)

onMounted(() => initTheme())

async function doLogin() {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Preencha email e senha'; return }
  loading.value = true
  try {
    await auth.login(email.value.trim(), password.value)
  } catch (e) {
    error.value = e.message === 'Invalid login credentials'
      ? 'Email ou senha incorretos'
      : e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  position: relative;
}

/* Botão tema */
.theme-btn {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  z-index: 10;
}
.theme-btn:hover {
  background: var(--accent-subtle);
  color: var(--accent);
  border-color: var(--accent);
}

/* Card */
.login-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 20px;
  padding: 2.5rem 2rem 2rem;
  width: 100%;
  max-width: 380px;
  box-shadow: var(--shadow-lg);
}

/* Header */
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .5rem;
  margin-bottom: 2rem;
}
.login-logo {
  height: 52px;
  width: auto;
}
.login-sub {
  font-size: .75rem;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: .04em;
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Input com botão olho */
.input-wrapper {
  position: relative;
}
.input-wrapper .form-input {
  padding-right: 2.75rem;
}
.pwd-toggle {
  position: absolute;
  right: .75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  transition: color 120ms ease;
}
.pwd-toggle:hover { color: var(--text-primary); }

/* Erro */
.login-error {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: .8125rem;
  color: var(--status-danger);
  background: var(--status-danger-subtle);
  border: 1px solid var(--status-danger);
  border-radius: 10px;
  padding: .625rem .875rem;
}

/* Botão */
.login-btn {
  width: 100%;
  padding: .75rem;
  border-radius: 10px;
  background: var(--accent);
  border: none;
  color: #fff;
  font-family: var(--font-body);
  font-size: .9375rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  margin-top: .25rem;
  transition: background 120ms ease, opacity 120ms ease, transform 120ms ease;
}
.login-btn:hover { background: var(--accent-dim); }
.login-btn:active { transform: scale(.98); }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }

.login-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

/* Footer */
.login-footer {
  font-size: .7rem;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 1.5rem;
  opacity: .6;
}

/* Transitions */
.err-fade-enter-active, .err-fade-leave-active { transition: all 180ms ease; }
.err-fade-enter-from { opacity: 0; transform: translateY(-4px); }
.err-fade-leave-to   { opacity: 0; transform: translateY(-4px); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
