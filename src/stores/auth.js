import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sb } from '@/lib/supabase'
import { slacLog } from '@/utils/log'

export const useAuthStore = defineStore('auth', () => {
  const user        = ref(null)
  const userName    = ref('')
  const companyName = ref('')
  const loading     = ref(true)
  const role        = ref('pro') // 'admin' | 'elite' | 'pro'

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin    = computed(() => role.value === 'admin')
  const isElite    = computed(() => role.value === 'elite' || role.value === 'admin')
  const roleLabel  = computed(() => ({ admin: 'Admin', elite: 'Elite', pro: 'Pro' }[role.value] ?? 'Pro'))

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
        .select('chave, valor')
        .eq('user_id', user.value.id)
        .in('chave', ['user_nome', 'user_role', 'user_empresa'])
      const nome    = data?.find(r => r.chave === 'user_nome')
      const r       = data?.find(r => r.chave === 'user_role')
      const empresa = data?.find(r => r.chave === 'user_empresa')
      userName.value    = nome?.valor?.nome || user.value.email?.split('@')[0] || 'usuário'
      companyName.value = empresa?.valor?.empresa || ''
      role.value = r?.valor?.role || 'pro'
    } catch {
      userName.value = user.value.email?.split('@')[0] || 'usuário'
    }
  }

  async function saveUserName(nome) {
    if (!user.value) return
    userName.value = nome
    slacLog('AUTH-003', `Nome de usuário salvo: ${nome}`, { nome })
    await sb.from('configuracoes').upsert({
      id: user.value.id + '_user_nome',
      user_id: user.value.id,
      chave: 'user_nome',
      valor: { nome },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  }

  async function saveCompanyName(empresa) {
    if (!user.value) return
    companyName.value = empresa
    await sb.from('configuracoes').upsert({
      id: user.value.id + '_user_empresa',
      user_id: user.value.id,
      chave: 'user_empresa',
      valor: { empresa },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  }

  async function login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.session?.user) {
      user.value = data.session.user
      await loadUserName()
      slacLog('AUTH-001', `Login: ${email}`, { email })
    }
  }

  async function logout() {
    slacLog('AUTH-002', `Logout: ${user.value?.email || ''}`, { email: user.value?.email })
    user.value = null
    userName.value = ''
    companyName.value = ''
    role.value = 'pro'
    await sb.auth.signOut()
  }

  async function saveUserRole(targetUserId, newRole) {
    await sb.from('configuracoes').upsert({
      id: targetUserId + '_user_role',
      user_id: targetUserId,
      chave: 'user_role',
      valor: { role: newRole },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    if (targetUserId === user.value?.id) role.value = newRole
  }

  return { user, userName, companyName, role, loading, isLoggedIn, isAdmin, isElite, roleLabel, init, login, logout, saveUserName, saveCompanyName, loadUserName, saveUserRole }
})
