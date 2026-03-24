import { inject } from 'vue'

export function useSaving() {
  const { showSaving, hideSaving } = inject('saving')
  const toast = inject('toast')

  async function run(fn, successMsg = null, errorMsg = 'Erro ao salvar') {
    showSaving()
    try {
      const result = await fn()
      if (successMsg) toast(successMsg, 'ok')
      return result
    } catch (e) {
      console.error('[useSaving] erro:', e)
      // Mostra erro específico do Supabase se houver
      const msg = e?.message || e?.error_description || errorMsg
      toast(msg.includes('fetch') ? 'Sem conexão — tente novamente' : errorMsg + ': ' + msg, 'err')
      throw e
    } finally {
      hideSaving()
    }
  }

  // Versão que não lança exceção — útil para operações em background
  async function runSilent(fn) {
    try {
      return await fn()
    } catch (e) {
      console.error('[useSaving silent] erro:', e)
    }
  }

  return { run, runSilent, showSaving, hideSaving, toast }
}
