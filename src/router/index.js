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
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'crm',       name: 'CRM',        component: () => import('@/views/CRMView.vue') },
      { path: 'financeiro',  name: 'Financeiro',  component: () => import('@/views/FinanceiroView.vue') },
      { path: 'recorrencias',name: 'Recorrencias',component: () => import('@/views/RecorrenciasView.vue') },
      { path: 'mapa',      name: 'Mapa',       component: () => import('@/views/MapaView.vue') },
    ]
  },
  {
    path: '/prospeccao',
    name: 'Prospeccao',
    component: () => import('@/views/ProspeccaoView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Aguarda o auth inicializar (feito no App.vue onMounted)
  // Se loading ainda true, espera até resolver
  if (auth.loading) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!auth.loading) { clearInterval(check); resolve() }
      }, 50)
      // Timeout máximo de 5s
      setTimeout(() => { clearInterval(check); resolve() }, 5000)
    })
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'Login' }
  if (to.meta.public && auth.isLoggedIn) return { path: '/dashboard' }
})

export default router
