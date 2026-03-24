import { inject } from 'vue'

export function useSaving() {
  const { showSaving, hideSaving } = inject('saving')
  const toast = inject('toast')

  async function run(fn, successMsg = null, errorMsg = 'Erro ao salvar') {
    showSaving()
    try {
      await fn()
      if (successMsg) toast(successMsg, 'ok')
    } catch (e) {
      console.error(e)
      toast(errorMsg + (e.message ? ': ' + e.message : ''), 'err')
      throw e
    } finally {
      hideSaving()
    }
  }

  return { run, showSaving, hideSaving, toast }
}
