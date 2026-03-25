<template>
  <div class="slaczap">

    <!-- Sidebar -->
    <div class="sz-sidebar">
      <div class="sz-sidebar-header">
        <span class="sz-title">SlacZap</span>
        <input v-model="search" class="sz-search" placeholder="Buscar conversa..." />
      </div>
      <div class="sz-list">
        <p v-if="!filteredChats.length" class="sz-empty-list">Nenhuma conversa ainda</p>
        <button v-for="c in filteredChats" :key="c.lead.id"
          class="sz-item" :class="{ active: activeLead?.id === c.lead.id }"
          @click="openChat(c.lead)">
          <div class="sz-avatar">{{ initials(c.lead.nome) }}</div>
          <div class="sz-item-info">
            <div class="sz-item-top">
              <span class="sz-item-name">{{ c.lead.nome }}</span>
              <span class="sz-item-time">{{ fmtTime(c.lastAt) }}</span>
            </div>
            <div class="sz-item-bottom">
              <span v-if="c.lastDirecao === 'enviado'" class="sz-item-dir">Você: </span>
              <span class="sz-item-preview">{{ c.lastMsg }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Chat ativo -->
    <div class="sz-chat" v-if="activeLead">
      <div class="sz-chat-header">
        <div class="sz-avatar sz-avatar--lg">{{ initials(activeLead.nome) }}</div>
        <div class="sz-chat-info">
          <div class="sz-chat-name">{{ activeLead.nome }}</div>
          <div class="sz-chat-tel">{{ activeLead.telefone }}</div>
        </div>
        <div class="sz-chat-actions">
          <span class="badge" :style="{ background: etapaColor(activeLead.etapa) + '22', color: etapaColor(activeLead.etapa) }">
            {{ etapaLabel(activeLead.etapa) }}
          </span>
          <button class="btn btn-ghost btn-sm" @click="irCRM">Abrir no CRM</button>
        </div>
      </div>

      <div class="sz-messages" ref="messagesEl">
        <p v-if="loadingMsgs" class="sz-loading">Carregando...</p>
        <template v-else>
          <p v-if="!waMsgs.length" class="sz-loading">Nenhuma mensagem ainda</p>
          <div v-for="m in waMsgs" :key="m.id"
            class="sz-bubble" :class="m.direcao === 'enviado' ? 'sz-out' : 'sz-in'">
            <span class="sz-bubble-text">{{ m.mensagem }}</span>
            <span class="sz-bubble-time">{{ fmtTime(m.data) }}</span>
          </div>
        </template>
      </div>

      <div class="sz-composer">
        <textarea v-model="novaMsg" class="sz-input" placeholder="Digite uma mensagem..."
          @keydown.enter.exact.prevent="enviar" rows="1" />
        <button class="sz-send-btn" @click="enviar" :disabled="enviando || !novaMsg.trim()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div class="sz-empty-chat" v-else>
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>Selecione uma conversa para começar</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWaStore } from '@/stores/wa'
import { useLeadsStore, ETAPAS } from '@/stores/leads'
import { useAuthStore } from '@/stores/auth'
import { sb } from '@/lib/supabase'

const router   = useRouter()
const route    = useRoute()
const wa       = useWaStore()
const leads    = useLeadsStore()
const auth     = useAuthStore()
const toast    = inject('toast')

const search      = ref('')
const activeLead  = ref(null)
const waMsgs      = ref([])
const loadingMsgs = ref(false)
const novaMsg     = ref('')
const enviando    = ref(false)
const messagesEl  = ref(null)

const filteredChats = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return wa.chats
  return wa.chats.filter(c =>
    c.lead.nome?.toLowerCase().includes(q) || c.lead.telefone?.includes(q)
  )
})

function initials(nome) {
  if (!nome) return '?'
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const hoje = new Date()
  if (d.toDateString() === hoje.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function etapaColor(etapa) { return ETAPAS.find(e => e.id === etapa)?.color || '#888' }
function etapaLabel(etapa) { return ETAPAS.find(e => e.id === etapa)?.label || etapa }

function scrollBottom() {
  nextTick(() => { if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight })
}

async function openChat(lead) {
  activeLead.value = lead
  loadingMsgs.value = true
  const all = await leads.loadConversas(lead.id)
  waMsgs.value = (all || []).filter(c => c.canal === 'whatsapp')
  loadingMsgs.value = false
  scrollBottom()
}

async function enviar() {
  if (!novaMsg.value.trim() || !activeLead.value?.telefone) return
  enviando.value = true
  try {
    await wa.enviarMensagem(activeLead.value.id, auth.user.id, activeLead.value.telefone, novaMsg.value.trim())
    novaMsg.value = ''
    await Promise.all([wa.loadChats(), openChat(activeLead.value)])
  } catch (e) {
    toast('Erro ao enviar: ' + (e?.message || ''), 'err')
  } finally {
    enviando.value = false
  }
}

function irCRM() { router.push('/crm') }

let realtimeChannel = null
onMounted(async () => {
  await wa.loadChats()
  // Abre chat direto se vier de Contatos (?lead=id)
  const leadId = route.query.lead
  if (leadId) {
    const chat = wa.chats.find(c => c.lead.id === leadId)
    if (chat) openChat(chat.lead)
    else {
      const lead = leads.leads.find(l => l.id === leadId)
      if (lead) openChat(lead)
    }
  }
  realtimeChannel = sb.channel('slaczap-' + auth.user.id)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'conversas',
      filter: 'user_id=eq.' + auth.user.id
    }, async (payload) => {
      const nova = payload.new
      if (nova.canal !== 'whatsapp') return
      await wa.loadChats()
      if (activeLead.value?.id === nova.lead_id) {
        waMsgs.value.push(nova)
        scrollBottom()
      }
    })
    .subscribe()
})
onUnmounted(() => { if (realtimeChannel) sb.removeChannel(realtimeChannel) })
</script>

<style scoped>
.slaczap {
  display: flex;
  height: calc(100vh - 57px);
  overflow: hidden;
  margin: -1.25rem -1.5rem;
  border-top: 1px solid var(--bg-overlay);
}
.sz-sidebar {
  width: 300px;
  min-width: 300px;
  border-right: 1px solid var(--bg-overlay);
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
}
.sz-sidebar-header {
  padding: .85rem 1rem;
  border-bottom: 1px solid var(--bg-overlay);
  display: flex;
  flex-direction: column;
  gap: .6rem;
}
.sz-title { font-size: .95rem; font-weight: 700; color: var(--accent); }
.sz-search {
  width: 100%; background: var(--bg-overlay); border: none;
  border-radius: 8px; padding: .4rem .7rem; color: var(--text-primary);
  font-size: .8rem; outline: none;
}
.sz-search::placeholder { color: var(--text-tertiary); }
.sz-list { flex: 1; overflow-y: auto; }
.sz-empty-list { padding: 2rem; text-align: center; color: var(--text-tertiary); font-size: .8rem; }
.sz-item {
  width: 100%; display: flex; align-items: center; gap: .65rem;
  padding: .7rem 1rem; border: none; background: none; cursor: pointer;
  text-align: left; transition: background .12s;
  border-bottom: 1px solid var(--bg-overlay);
}
.sz-item:hover { background: var(--bg-elevated); }
.sz-item.active { background: var(--accent-subtle); }
.sz-avatar {
  width: 38px; height: 38px; min-width: 38px; border-radius: 50%;
  background: var(--accent-subtle); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 700;
}
.sz-avatar--lg { width: 36px; height: 36px; min-width: 36px; }
.sz-item-info { flex: 1; min-width: 0; }
.sz-item-top { display: flex; justify-content: space-between; align-items: center; }
.sz-item-name { font-size: .83rem; font-weight: 600; color: var(--text-primary); }
.sz-item-time { font-size: .7rem; color: var(--text-tertiary); }
.sz-item-bottom { display: flex; align-items: center; gap: .2rem; margin-top: .1rem; }
.sz-item-dir { font-size: .73rem; color: var(--accent); }
.sz-item-preview { font-size: .73rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
.sz-chat { flex: 1; display: flex; flex-direction: column; background: var(--bg-base); min-width: 0; }
.sz-chat-header {
  display: flex; align-items: center; gap: .75rem;
  padding: .7rem 1.25rem; border-bottom: 1px solid var(--bg-overlay);
  background: var(--bg-surface);
}
.sz-chat-info { flex: 1; min-width: 0; }
.sz-chat-name { font-weight: 700; font-size: .88rem; color: var(--text-primary); }
.sz-chat-tel { font-size: .73rem; color: var(--text-secondary); }
.sz-chat-actions { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.sz-messages { flex: 1; overflow-y: auto; padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: .4rem; }
.sz-loading { text-align: center; color: var(--text-tertiary); font-size: .8rem; padding: 2rem; }
.sz-bubble {
  max-width: 65%; padding: .45rem .7rem; border-radius: 12px;
  font-size: .84rem; line-height: 1.45; display: flex; flex-direction: column; gap: .15rem;
}
.sz-out { align-self: flex-end; background: var(--accent); color: #000; border-bottom-right-radius: 3px; }
.sz-in  { align-self: flex-start; background: var(--bg-elevated); color: var(--text-primary); border-bottom-left-radius: 3px; }
.sz-bubble-text { word-break: break-word; }
.sz-bubble-time { font-size: .67rem; opacity: .65; align-self: flex-end; }
.sz-out .sz-bubble-time { color: rgba(0,0,0,.55); }
.sz-composer {
  display: flex; align-items: flex-end; gap: .65rem;
  padding: .7rem 1.25rem; border-top: 1px solid var(--bg-overlay);
  background: var(--bg-surface);
}
.sz-input {
  flex: 1; background: var(--bg-overlay); border: none; border-radius: 10px;
  padding: .55rem .85rem; color: var(--text-primary); font-size: .84rem;
  resize: none; outline: none; max-height: 120px; font-family: inherit; line-height: 1.4;
}
.sz-input::placeholder { color: var(--text-tertiary); }
.sz-send-btn {
  width: 38px; height: 38px; border-radius: 50%; background: var(--accent); color: #000;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .15s;
}
.sz-send-btn:disabled { opacity: .35; cursor: default; }
.sz-empty-chat {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 1rem; color: var(--text-tertiary); font-size: .85rem;
}
</style>
