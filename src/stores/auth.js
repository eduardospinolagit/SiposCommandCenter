import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user     = ref(null)
  const userName = ref('')
  const loading  = ref(true)

  const isLoggedIn = computed(() => !!user.value)

  async function init() {
    loading.value = true
    try {
      const { data: { session } } = await sb.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await loadUserName()
      }
    } catch (e) {
      console.error('[SLAC] auth.init erro:', e)
    } finally {
      // Garante que loading sempre vira false
      loading.value = false
    }
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
      userName.value = data?.valor?.nome || user.value.email?.split('@')[0] || 'usuário'
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
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session?.user) {
      user.value = data.session.user
      await loadUserName()
    }
  }

  async function logout() {
    user.value = null
    userName.value = ''
    await sb.auth.signOut()
  }

  return { user, userName, loading, isLoggedIn, init, login, logout, saveUserName, loadUserName }
})
