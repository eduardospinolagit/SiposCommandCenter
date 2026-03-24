import { onUnmounted } from 'vue'
import { sb } from '@/lib/supabase'

export function useRealtime(userId, { onLeads, onFin, onConfig } = {}) {
  const channel = sb.channel('db-changes-' + userId)

  if (onFin) {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'financeiro',
      filter: 'user_id=eq.' + userId
    }, onFin)
  }

  if (onLeads) {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'leads',
      filter: 'user_id=eq.' + userId
    }, onLeads)
  }

  if (onConfig) {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'configuracoes',
      filter: 'user_id=eq.' + userId
    }, onConfig)
  }

  channel.subscribe()

  // BroadcastChannel para receber leads da aba de Prospecção
  let bc = null
  try {
    bc = new BroadcastChannel('slac_crm')
  } catch (e) {}

  onUnmounted(() => {
    sb.removeChannel(channel)
    bc?.close()
  })

  return { bc }
}
