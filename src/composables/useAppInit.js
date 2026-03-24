import { useFinStore } from '@/stores/fin'
import { useLeadsStore } from '@/stores/leads'
import { useMapaStore } from '@/stores/mapa'
import { useAuthStore } from '@/stores/auth'
import { sb } from '@/lib/supabase'

let initializedForUser = null
let realtimeChannel = null

export async function useAppInit() {
  const auth = useAuthStore()
  const fin = useFinStore()
  const leads = useLeadsStore()
  const mapa = useMapaStore()

  if (!auth.user) return
  if (initializedForUser === auth.user.id) return
  initializedForUser = auth.user.id

  // Carrega dados em paralelo
  await Promise.all([
    fin.load(),
    leads.load(),
    mapa.load(),
  ])

  // Realtime — chamado diretamente (sem composable) para evitar problema de contexto Vue
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel)
  }

  realtimeChannel = sb.channel('slac-db-' + auth.user.id)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'financeiro',
      filter: 'user_id=eq.' + auth.user.id
    }, () => fin.load())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'leads',
      filter: 'user_id=eq.' + auth.user.id
    }, () => leads.load())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'configuracoes',
      filter: 'user_id=eq.' + auth.user.id
    }, () => { fin.loadMeta(); mapa.load() })
    .subscribe()

  // BroadcastChannel: recebe leads da aba de Prospecção
  try {
    const bc = new BroadcastChannel('slac_crm')
    bc.onmessage = (e) => {
      if (e.data?.type === 'lead_novo') leads.load()
    }
  } catch {}
}
