<template>
  <div class="layout" :class="{ collapsed }">
    <aside class="sidebar">

      <div class="sb-top">
        <button class="sb-logo-btn" @click="toggle">
          <img src="/logo.png" alt="SLAC" class="sb-logo" />
        </button>
      </div>

      <nav class="sb-nav">
        <div class="sb-section">
          <p class="sb-section-title">Principal</p>
          <button v-for="item in mainNav" :key="item.path"
            class="sb-item" :class="{ active: route.path === item.path }"
            @click="go(item.path)"
          >
            <span class="sb-icon" v-html="item.icon"></span>
            <span class="sb-text">{{ item.label }}</span>
          </button>
        </div>
        <div class="sb-section">
          <p class="sb-section-title">Ferramentas</p>
          <button class="sb-item" :class="{ active: route.path === '/prospeccao' }" @click="go('/prospeccao')">
            <span class="sb-icon" v-html="icons.search"></span>
            <span class="sb-text">Prospecção</span>
          </button>
        </div>
      </nav>

      <div class="sb-footer">
        <button class="sb-item" @click="toggleTheme">
          <span class="sb-icon">
            <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </span>
          <span class="sb-text">{{ isDark ? 'Modo claro' : 'Modo escuro' }}</span>
        </button>

        <div class="sb-user">
          <div class="sb-user-dot">{{ userInitial }}</div>
          <div class="sb-user-info">
            <span class="sb-user-name">{{ auth.userName }}</span>
            <span class="sb-user-role">PRO</span>
          </div>
        </div>

        <button class="sb-item sb-danger" @click="auth.logout()">
          <span class="sb-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </span>
          <span class="sb-text">Sair</span>
        </button>
        <p class="sb-dev">Desenvolvido por Sano Lab</p>
      </div>
    </aside>

    <main class="main"><router-view /></main>
  </div>

  <nav class="mobile-nav">
    <button v-for="item in mobileNav" :key="item.path" class="mob-item" :class="{ active: route.path === item.path }" @click="go(item.path)">
      <span v-html="item.icon"></span>
      <span>{{ item.short }}</span>
    </button>
    <button class="mob-item" @click="toggleTheme">
      <span><svg v-if="isDark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg><svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
      <span>Tema</span>
    </button>
  </nav>

  <div v-if="showWelcomeModal" class="modal-backdrop">
    <div class="modal" style="max-width:400px;text-align:center">
      <div class="modal-body" style="padding:2rem 1.5rem">
        <div style="font-size:2rem;margin-bottom:.75rem">👋</div>
        <h2 style="margin-bottom:.375rem">Bem-vindo ao <span style="color:var(--accent)">SLAC</span></h2>
        <p style="margin-bottom:1.25rem;font-size:.875rem">Como quer ser chamado?</p>
        <input ref="welcomeInput" v-model="welcomeName" class="form-input" type="text" placeholder="Seu nome" maxlength="40" @keydown.enter="saveWelcomeName" style="margin-bottom:.75rem" />
        <button class="btn btn-primary" style="width:100%;justify-content:center" @click="saveWelcomeName">Entrar →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppInit } from '@/composables/useAppInit'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()
const { theme, toggleTheme } = useTheme()
const isDark = computed(() => theme.value === 'dark')

const collapsed = ref(localStorage.getItem('slac-sidebar') === 'collapsed')
function toggle() {
  collapsed.value = !collapsed.value
  localStorage.setItem('slac-sidebar', collapsed.value ? 'collapsed' : 'expanded')
}

const userInitial = computed(() => (auth.userName || '?').charAt(0).toUpperCase())

const icons = {
  dashboard:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  crm:          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  financeiro:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  recorrencias: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  mapa:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  search:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
}

const mainNav = [
  { path: '/dashboard',    label: 'Dashboard',    icon: icons.dashboard },
  { path: '/crm',          label: 'CRM',          icon: icons.crm },
  { path: '/financeiro',   label: 'Financeiro',   icon: icons.financeiro },
  { path: '/recorrencias', label: 'Recorrências', icon: icons.recorrencias },
  { path: '/mapa',         label: 'Mapa Mental',  icon: icons.mapa },
]
const mobileNav = [
  { path: '/dashboard',  short: 'Dash',   icon: icons.dashboard },
  { path: '/crm',        short: 'CRM',    icon: icons.crm },
  { path: '/financeiro', short: 'Fin.',   icon: icons.financeiro },
  { path: '/mapa',       short: 'Mapa',   icon: icons.mapa },
  { path: '/prospeccao', short: 'Prosp.', icon: icons.search },
]

const welcomeInput = ref(null)
const welcomeName  = ref('')
const showWelcomeModal = ref(false)

onMounted(async () => {
  await useAppInit()
  if (auth.isLoggedIn) {
    const emailPrefix = auth.user?.email?.split('@')[0] || ''
    if (auth.userName === emailPrefix) {
      showWelcomeModal.value = true
      await nextTick()
      welcomeInput.value?.focus()
    }
  }
})

async function saveWelcomeName() {
  const nome = welcomeName.value.trim()
  if (!nome) { welcomeInput.value?.focus(); return }
  await auth.saveUserName(nome)
  showWelcomeModal.value = false
}

function go(path) { router.push(path) }
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ── */
.sidebar {
  width: 200px;
  min-width: 200px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  overflow: hidden;
  z-index: 50;
  /* Transição só no width, sem will-change que causa layer */
  transition: width 250ms ease, min-width 250ms ease;
}
.collapsed .sidebar { width: 52px; min-width: 52px; }

/* Topo */
.sb-top {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: .875rem .75rem;
  border-bottom: 1px solid var(--border-subtle);
  height: 56px;
  flex-shrink: 0;
}
.sb-logo-btn {
  background: none; border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  -webkit-tap-highlight-color: transparent;
  transition: transform 200ms cubic-bezier(.34,1.56,.64,1);
}
.sb-logo-btn:active { transform: scale(.88); }
.sb-logo { height: 30px; width: auto; display: block; }

/* Nav */
.sb-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: .375rem 0; }
.sb-section { padding: 0 .375rem; margin-bottom: .25rem; }
.sb-section-title {
  font-size: .6rem; font-weight: 700; letter-spacing: .09em;
  text-transform: uppercase; color: var(--text-tertiary);
  padding: .375rem .5rem .2rem; margin: 0; white-space: nowrap;
  overflow: hidden; opacity: 1;
  transition: opacity 200ms ease, max-height 250ms ease;
  max-height: 24px;
}
.collapsed .sb-section-title { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }

.sb-item {
  display: flex; align-items: center; gap: .5rem;
  width: 100%; padding: .425rem .5rem;
  border-radius: 8px; background: transparent; border: none;
  color: var(--text-secondary);
  font-family: var(--font-body); font-size: .8125rem; font-weight: 500;
  cursor: pointer; text-align: left; white-space: nowrap; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  transition: background 100ms ease, color 100ms ease;
}
.sb-item:hover { background: var(--accent-subtle); color: var(--accent); }
.sb-item:hover .sb-icon { opacity: 1; }
.sb-item.active { background: var(--accent-subtle); color: var(--accent); font-weight: 600; }
.sb-item.active .sb-icon { opacity: 1; }
.sb-danger:hover { background: var(--status-danger-subtle); color: var(--status-danger); }
.collapsed .sb-item { justify-content: center; padding: .5rem; gap: 0; }

.sb-icon {
  flex-shrink: 0; width: 16px; height: 16px;
  display: flex; align-items: center; justify-content: center;
  opacity: .45; transition: opacity 100ms ease;
}
.collapsed .sb-icon { opacity: .6; }
.collapsed .sb-item:hover .sb-icon,
.collapsed .sb-item.active .sb-icon { opacity: 1; }

.sb-text {
  flex: 1; overflow: hidden; text-overflow: ellipsis;
  opacity: 1; max-width: 140px;
  transition: opacity 200ms ease, max-width 250ms ease;
}
.collapsed .sb-text { opacity: 0; max-width: 0; pointer-events: none; }

/* Footer */
.sb-footer {
  padding: .375rem .375rem .75rem;
  border-top: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; gap: .125rem; flex-shrink: 0;
}

/* Usuário — sem avatar, estilo iOS pill */
.sb-user {
  display: flex; align-items: center; gap: .5rem;
  padding: .375rem .5rem; border-radius: 8px; overflow: hidden;
}
.collapsed .sb-user { justify-content: center; }

.sb-user-dot {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--accent); color: #fff;
  font-size: .7rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; letter-spacing: 0;
}

.sb-user-info {
  display: flex; flex-direction: column; gap: .1rem;
  min-width: 0; opacity: 1; max-width: 140px;
  transition: opacity 200ms ease, max-width 250ms ease;
}
.collapsed .sb-user-info { opacity: 0; max-width: 0; pointer-events: none; }

.sb-user-name {
  font-size: .78rem; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;
}
.sb-user-role {
  font-size: .58rem; font-weight: 700; letter-spacing: .06em;
  color: var(--accent); text-transform: uppercase; line-height: 1;
}

.sb-dev {
  font-size: .58rem; color: var(--text-tertiary); text-align: center;
  opacity: .4; padding-top: .2rem; white-space: nowrap; overflow: hidden;
  max-height: 16px; margin: 0;
  transition: opacity 200ms ease, max-height 250ms ease;
}
.collapsed .sb-dev { opacity: 0; max-height: 0; }

/* Main */
.main { flex: 1; min-width: 0; }

/* Mobile */
.mobile-nav {
  display: none; position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--sidebar-bg); border-top: 1px solid var(--sidebar-border);
  z-index: 200; padding-bottom: env(safe-area-inset-bottom);
  justify-content: space-around; align-items: center; padding-top: .25rem;
}
.mob-item {
  display: flex; flex-direction: column; align-items: center; gap: .15rem;
  background: none; border: none; color: var(--text-tertiary);
  font-family: var(--font-body); font-size: .6rem; font-weight: 500;
  padding: .375rem .5rem; cursor: pointer; border-radius: 8px;
  transition: color 100ms ease; min-width: 44px;
  -webkit-tap-highlight-color: transparent;
}
.mob-item.active, .mob-item:hover { color: var(--accent); }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .mobile-nav { display: flex; }
  .main { padding-bottom: 68px; }
}
</style>
