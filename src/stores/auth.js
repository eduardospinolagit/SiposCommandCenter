import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userName = ref('')
  const loading = ref(true)

  const isLoggedIn = computed(() => !!user.value)

  async function init() {
    loading.value = true
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session) {
        user.value = session.user
        await loadUserName()
      }
    } catch (e) {
      console.error('Auth init error:', e)
    } finally {
      loading.value = false
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        user.value = session.user
        await loadUserName()
      }
      if (event === 'SIGNED_OUT') {
        user.value = null
        userName.value = ''
      }
    })
  }

  async function loadUserName() {
    if (!user.value) return
    try {
      const { data } = await sb
        .from('configuracoes')
        .select('valor')
        .eq('user_id', user.value.id)
        .eq('chave', 'user_nome')
        .maybeSingle()
      if (data?.valor?.nome) {
        userName.value = data.valor.nome
      } else {
        userName.value = user.value.email?.split('@')[0] || 'usuário'
      }
    } catch {
      userName.value = user.value.email?.split('@')[0] || 'usuário'
    }
  }

  async function saveUserName(nome) {
    if (!user.value) return
    userName.value = nome
    await sb.from('configuracoes').upsert({
      id: user.value.id + '_user_nome',
      user_id: user.value.id,
      chave: 'user_nome',
      valor: { nome },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  }

  async function login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await sb.auth.signOut()
  }

  return { user, userName, loading, isLoggedIn, init, login, logout, saveUserName, loadUserName }
})
