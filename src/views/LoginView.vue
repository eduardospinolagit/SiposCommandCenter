<template>
  <div class="login-screen">
    <div class="login-box">
      <div class="login-logo">SL<span>AC</span></div>
      <div class="login-tagline">Sano Lab Advanced CRM</div>
      <h2>Acessar conta</h2>

      <div class="lfg">
        <label>Email</label>
        <input
          v-model="email"
          class="li"
          type="email"
          placeholder="seu@email.com"
          autocomplete="email"
          @keydown.enter="doLogin"
        />
      </div>
      <div class="lfg">
        <label>Senha</label>
        <input
          v-model="password"
          class="li"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          @keydown.enter="doLogin"
        />
      </div>

      <div v-if="error" class="lerr" style="display:block">{{ error }}</div>

      <button class="lbtn" :disabled="loading" @click="doLogin">
        <span v-if="loading">Entrando...</span>
        <span v-else>Entrar</span>
      </button>

      <p class="linfo">Acesso restrito à Sano Lab</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function doLogin() {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Preencha email e senha'; return }
  loading.value = true
  try {
    await auth.login(email.value.trim(), password.value)
  } catch (e) {
    error.value = e.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-screen {
  position: fixed; inset: 0; background: #0a0a0a;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.login-box {
  background: #111; border: 1px solid #222; border-radius: 16px;
  padding: 32px; width: 100%; max-width: 380px;
}
.login-logo { font-size: 1.4rem; font-weight: 700; text-align: center; margin-bottom: 4px; }
.login-logo span { color: var(--g); }
.login-tagline { font-size: .8rem; color: var(--gr); text-align: center; margin-bottom: 28px; }
.login-box h2 { font-size: .95rem; font-weight: 600; margin-bottom: 18px; color: var(--lt); }
.lfg { margin-bottom: 12px; }
.lfg label { font-size: .72rem; font-weight: 600; color: var(--gr); display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .06em; }
.li { width: 100%; background: #0d0d0d; border: 1px solid #222; border-radius: 8px; padding: 11px 14px; color: #fff; font-family: 'Inter', sans-serif; font-size: .9rem; outline: none; transition: border-color .15s; }
.li:focus { border-color: var(--g); }
.lbtn { width: 100%; background: var(--g); border: none; border-radius: 8px; padding: 12px; color: #fff; font-family: 'Inter', sans-serif; font-size: .9rem; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background .15s; }
.lbtn:hover { background: var(--gd); }
.lbtn:disabled { background: #333; color: #666; cursor: not-allowed; }
.lerr { color: var(--r); font-size: .8rem; margin-top: 10px; text-align: center; padding: 8px; background: rgba(239,68,68,.1); border-radius: 6px; border: 1px solid rgba(239,68,68,.2); }
.linfo { font-size: .72rem; color: var(--gr); text-align: center; margin-top: 14px; display: flex; align-items: center; gap: 6px; justify-content: center; }
.linfo::before, .linfo::after { content: ''; flex: 1; height: 1px; background: #222; }
</style>
