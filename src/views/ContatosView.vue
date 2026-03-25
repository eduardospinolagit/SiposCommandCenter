<template>
  <div class="page-layout">
    <div class="page-header">
      <div>
        <h1 class="page-title">Contatos</h1>
        <p class="page-subtitle">{{ filtrados.length }} contatos com telefone</p>
      </div>
      <div class="page-actions">
        <input v-model="search" class="form-input" placeholder="Buscar nome ou telefone..." style="width:220px" />
      </div>
    </div>

    <div class="card card--flat">
      <div class="table-wrapper">
        <table class="ct-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Etapa</th>
              <th>Última msg WA</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtrados.length">
              <td colspan="5" style="text-align:center;padding:2rem;color:var(--text-tertiary)">
                Nenhum contato com telefone cadastrado
              </td>
            </tr>
            <tr v-for="lead in filtrados" :key="lead.id" class="ct-row">
              <td>
                <div class="ct-nome">
                  <div class="ct-avatar">{{ initials(lead.nome) }}</div>
                  <span>{{ lead.nome }}</span>
                </div>
              </td>
              <td class="text-sm" style="color:var(--text-secondary)">{{ lead.telefone }}</td>
              <td>
                <span class="badge" :style="{ background: etapaColor(lead.etapa) + '22', color: etapaColor(lead.etapa) }">
                  {{ etapaLabel(lead.etapa) }}
                </span>
              </td>
              <td class="text-sm text-muted">{{ lastWa(lead.id) }}</td>
              <td>
                <div style="display:flex;gap:.4rem">
                  <button class="btn btn-ghost btn-sm" @click="abrirZap(lead)" title="Abrir no SlacZap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.11 1.53 5.84L0 24l6.32-1.5A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0zm5.89 16.89c-.25.7-1.43 1.34-1.96 1.41-.53.08-1.2.11-1.93-.12a17.8 17.8 0 0 1-1.74-.64C9.81 16.4 8.02 14.2 7.87 14c-.15-.21-1.24-1.66-1.24-3.16s.79-2.24 1.07-2.55c.28-.31.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.68.52.25.59.84 2.04.91 2.19.07.15.12.32.03.52-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.77 1.26 1.64 2.05 1.13 1 2.08 1.31 2.38 1.46.3.15.47.12.64-.07.17-.2.74-.86 1.03-1.16.3-.3.59-.25.98-.1.39.15 2.49 1.17 2.91 1.39.42.21.71.32.81.5.1.17.1 1.02-.14 1.72z"/></svg>
                    SlacZap
                  </button>
                  <button class="btn btn-ghost btn-sm" @click="abrirCRM(lead)" title="Abrir no CRM">CRM</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLeadsStore, ETAPAS } from '@/stores/leads'
import { useWaStore } from '@/stores/wa'

const router = useRouter()
const leads  = useLeadsStore()
const wa     = useWaStore()
const search = ref('')

const comTelefone = computed(() => leads.leads.filter(l => l.telefone))

const filtrados = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return comTelefone.value
  return comTelefone.value.filter(l =>
    l.nome?.toLowerCase().includes(q) || l.telefone?.includes(q)
  )
})

function initials(nome) {
  if (!nome) return '?'
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
function etapaColor(etapa) { return ETAPAS.find(e => e.id === etapa)?.color || '#888' }
function etapaLabel(etapa) { return ETAPAS.find(e => e.id === etapa)?.label || etapa }

function lastWa(leadId) {
  const c = wa.chats.find(c => c.lead.id === leadId)
  if (!c) return '—'
  const d = new Date(c.lastAt)
  return d.toLocaleDateString('pt-BR') + ' · ' + c.lastMsg?.slice(0, 30) + (c.lastMsg?.length > 30 ? '…' : '')
}

function abrirZap(lead) { router.push({ path: '/slaczap', query: { lead: lead.id } }) }
function abrirCRM(lead) { router.push('/crm') }

onMounted(() => wa.loadChats())
</script>

<style scoped>
.ct-table { width: 100%; border-collapse: collapse; font-size: .83rem; }
.ct-table thead tr { background: var(--bg-elevated); }
.ct-table th { padding: .55rem .85rem; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--bg-overlay); }
.ct-row td { padding: .6rem .85rem; border-bottom: 1px solid var(--bg-overlay); vertical-align: middle; }
.ct-row:hover td { background: var(--bg-elevated); }
.ct-nome { display: flex; align-items: center; gap: .6rem; }
.ct-avatar { width: 30px; height: 30px; min-width: 30px; border-radius: 50%; background: var(--accent-subtle); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; }
</style>
