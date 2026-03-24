import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://jqmnmudfxxdcjfradvcj.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbW5tdWRmeHhkY2pmcmFkdmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDAxNTMsImV4cCI6MjA4OTYxNjE1M30.LKZz_djPhIc_PvdLxAAhLaV-BZxX70nGup-qODIDEF4'

export const sb = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'slac-auth',
    // Evita deadlock em abas inativas
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-app': 'slac',
    },
  },
})

// Listener global: se o token expirar, tenta refresh automático
sb.auth.onAuthStateChange((event) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('[SLAC] Token renovado')
  }
  if (event === 'SIGNED_OUT') {
    // Limpa cache local se der logout inesperado
    console.warn('[SLAC] Sessão encerrada')
  }
})
