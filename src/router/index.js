import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard',    name: 'Dashboard',    component: () => import('@/views/DashboardView.vue') },
      { path: 'crm',          name: 'CRM',          component: () => import('@/views/CRMView.vue') },
      { path: 'financeiro',   name: 'Financeiro',   component: () => import('@/views/FinanceiroView.vue') },
      { path: 'recorrencias', name: 'Recorrencias', component: () => import('@/views/RecorrenciasView.vue') },
      { path: 'prospeccao',    name: 'Prospeccao',    component: () => import('@/views/ProspeccaoView.vue') },
      { path: 'configuracoes', name: 'Configuracoes', component: () => import('@/views/ConfiguracoesView.vue') },
      { path: 'work',          name: 'Tarefas',       component: () => import('@/views/WorkView.vue') },
      { path: 'slaczap',       name: 'SlacZap',       component: () => import('@/views/SlacZapView.vue') },
      { path: 'contatos',      name: 'Contatos',      component: () => import('@/views/ContatosView.vue') },
      { path: 'logs',          name: 'Logs',          component: () => import('@/views/LogsView.vue') },
      { path: 'sdr',           name: 'SDR',           component: () => import('@/views/SDRView.vue') },
      { path: 'pessoal',      name: 'Pessoal',       component: () => import('@/views/FinanceiroPessoalView.vue') },
      { path: 'admin-zap',    name: 'AdminZap',      component: () => import('@/views/AdminZapView.vue'),  meta: { requiresAdmin: true } },
      { path: 'admin-sdr',    name: 'AdminSDR',      component: () => import('@/views/AdminSDRView.vue'),  meta: { requiresAdmin: true } },
    ]
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (auth.loading) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!auth.loading) { clearInterval(check); resolve() }
      }, 50)
      setTimeout(() => { clearInterval(check); resolve() }, 5000)
    })
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'Login' }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { path: '/dashboard' }
  if (to.meta.public && auth.isLoggedIn) return { path: '/dashboard' }
})

export default router
