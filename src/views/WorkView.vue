<template>
  <div class="page-layout">

    <div class="page-header">
      <div>
        <h1 class="page-title">Tarefas</h1>
        <p class="page-subtitle">Serviços em execução por cliente</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" @click="openNew()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova tarefa
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid kpi-grid--4">
      <div class="kpi-card">
        <span class="kpi-label">Em execução</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ work.ativos.length }}</span>
        <span class="kpi-sub">serviços</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Clientes ativos</span>
        <span class="kpi-value kpi-value--accent">{{ clientesAtivos }}</span>
        <span class="kpi-sub">com tarefas</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Tarefas pendentes<InfoTip text="Soma de todas as subtarefas marcadas como não concluídas dentro dos serviços em execução." /></span>
        <span class="kpi-value kpi-value--warning">{{ tarefasPendentesCount }}</span>
        <span class="kpi-sub">a concluir</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Concluídos</span>
        <span class="kpi-value">{{ work.concluidos.length }}</span>
        <span class="kpi-sub">serviços</span>
      </div>
    </div>

    <!-- TABS + BUSCA -->
    <div class="work-toolbar">
      <div class="tabs">
        <button class="tab" :class="{ active: filtro === 'ativo' }" @click="filtro = 'ativo'">
          Em execução
          <span v-if="work.ativos.length" class="tab-badge" style="background:var(--status-info)">{{ work.ativos.length }}</span>
        </button>
        <button class="tab" :class="{ active: filtro === 'concluido' }" @click="filtro = 'concluido'">
          Concluídos
          <span v-if="work.concluidos.length" class="tab-badge">{{ work.concluidos.length }}</span>
        </button>
      </div>
      <div class="work-search">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" class="work-search-input" placeholder="Buscar cliente ou serviço..." />
        <button v-if="searchQuery" class="work-search-clear" @click="searchQuery = ''">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- CARDS agrupados por cliente -->
    <div v-if="gruposCliente.length" class="work-grid">
      <div v-for="grupo in gruposCliente" :key="grupo.leadId"
        class="work-card"
        :class="{ 'work-card--done': filtro === 'concluido' }">

        <!-- Header cliente -->
        <div class="wc-header">
          <div class="wc-avatar">{{ grupo.nome.charAt(0).toUpperCase() }}</div>
          <div class="wc-client">
            <p class="wc-nome">{{ grupo.nome }}</p>
            <p v-if="grupo.negocio" class="wc-neg">{{ grupo.negocio }}</p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="openNew(grupo.leadId)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Serviço
          </button>
        </div>

        <!-- Serviços empilhados -->
        <div class="wc-servicos">
          <div v-for="item in grupo.items" :key="item.id"
            class="wcs-bloco"
            :class="{ 'wcs-bloco--done': item.status === 'concluido', 'wcs-bloco--dragging': dragSvcId === item.id, 'wcs-bloco--drag-over': dragSvcOver === item.id }"
            draggable="true"
            @dragstart="onDragStartSvc($event, item)"
            @dragover="onDragOverSvc($event, item)"
            @dragleave="onDragLeaveSvc"
            @drop="onDropSvc($event, item)"
            @dragend="onDragEndSvc">

            <!-- Header do serviço (clicável para colapsar) -->
            <div class="wcs-head" @click="toggleCollapse(item.id)">
              <svg class="wcs-drag-handle" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" @mousedown.stop title="Arrastar">
                <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
                <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
              </svg>
              <svg class="wcs-chevron" :class="{ 'wcs-chevron--open': !collapsedItems.has(item.id) }"
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              <span class="wcs-nome">{{ item.servico }}</span>
              <span class="wcs-badge" :class="item.status === 'ativo' ? 'wcs-badge--ativo' : 'wcs-badge--done'">
                {{ item.status === 'ativo' ? 'Em execução' : 'Concluído' }}
              </span>
            </div>

            <!-- Corpo colapsável -->
            <template v-if="!collapsedItems.has(item.id)">

            <!-- Progresso -->
            <div v-if="item.tarefas.length" class="wc-progress-row">
              <div class="wc-progress-bar">
                <div class="wc-progress-fill"
                  :class="{ 'wc-progress-fill--done': item.status === 'concluido' }"
                  :style="{ width: progressPct(item) + '%' }"></div>
              </div>
              <span class="wc-progress-label">{{ tarefasFeitas(item) }}/{{ item.tarefas.length }}</span>
            </div>

            <!-- Checklist -->
            <div class="wc-tasks">
              <div v-for="t in item.tarefas" :key="t.id"
                class="wc-task"
                :class="{ 'wc-task--done': t.feito, 'wc-task--drag-over': dragTaskOver?.itemId === item.id && dragTaskOver?.taskId === t.id }"
                draggable="true"
                @dragstart="onDragStartTask($event, item, t)"
                @dragover="onDragOverTask($event, item, t)"
                @dragleave="onDragLeaveTask"
                @drop="onDropTask($event, item, t)"
                @dragend="onDragEndTask">
                <svg class="wc-task-grip" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/>
                  <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                  <circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>
                </svg>
                <button class="wc-cb" :class="{ 'wc-cb--checked': t.feito }" @click="toggleTarefa(item, t.id)">
                  <svg v-if="t.feito" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <span v-if="!(editingTask && editingTask.itemId === item.id && editingTask.taskId === t.id)"
                  class="wc-task-text"
                  @click="startEditTask(item.id, t)">{{ t.titulo }}</span>
                <input v-else
                  class="wc-task-edit"
                  v-model="editTaskText"
                  @blur="saveEditTask(item, t.id)"
                  @keydown.enter.prevent="saveEditTask(item, t.id)"
                  @keydown.esc="editingTask = null" />
                <template v-if="confirmingTask?.itemId === item.id && confirmingTask?.taskId === t.id">
                  <button class="wc-task-confirm wc-task-confirm--yes" @click.stop="confirmarRemoverTarefa(item, t.id)" title="Confirmar">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button class="wc-task-confirm wc-task-confirm--no" @click.stop="confirmingTask = null" title="Cancelar">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </template>
                <button v-else class="wc-task-del" @click.stop="confirmingTask = { itemId: item.id, taskId: t.id }" title="Remover">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <!-- Adicionar tarefa inline -->
              <div v-if="addingTaskId === item.id" class="wc-task-add-row">
                <input
                  ref="taskInputRef"
                  v-model="novaTaskTexto"
                  class="wc-task-add-input"
                  placeholder="Tarefa... (Enter para adicionar mais)"
                  @keydown.enter.prevent="confirmarTarefa(item)"
                  @keydown.esc="addingTaskId = null" />
                <button class="wc-add-btn wc-add-btn--confirm" @click="confirmarTarefa(item, true)" title="Confirmar e fechar">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="wc-add-btn" @click="addingTaskId = null" title="Cancelar">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <button v-else class="wc-add-task" @click="iniciarAddTask(item.id)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova tarefa
              </button>
            </div>

            <!-- Notas -->
            <textarea class="wc-notas"
              :value="item.notas"
              placeholder="Notas sobre o serviço..."
              rows="2"
              @blur="e => salvarNotas(item, e.target.value)"></textarea>

            <!-- Footer do serviço -->
            <div class="wcs-foot">
              <button v-if="item.status === 'ativo'" class="btn btn-primary btn-sm wcs-btn-full" @click="concluirServico(item)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Concluir
              </button>
              <button v-else class="btn btn-secondary btn-sm wcs-btn-full" @click="reativarServico(item)">Reativar</button>
              <template v-if="confirmingSvc === item.id">
                <span class="wcs-confirm-text">Excluir?</span>
                <button class="btn btn-danger btn-sm btn-icon" @click="confirmarRemoverItem(item)" title="Confirmar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" @click="confirmingSvc = null" title="Cancelar">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </template>
              <button v-else class="btn btn-ghost btn-sm btn-icon wcs-del-btn" @click="confirmingSvc = item.id" title="Excluir">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>

            </template><!-- /collapse -->
          </div>
        </div>

      </div>
    </div>

    <!-- Empty -->
    <div v-else class="work-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
      <p>{{ filtro === 'ativo' ? 'Nenhuma tarefa em execução' : 'Nenhuma tarefa concluída' }}</p>
      <span v-if="filtro === 'ativo'">Clique em "Nova tarefa" para começar</span>
    </div>

  </div>

  <!-- MODAL -->
  <Transition name="modal-fade">
    <div v-if="modalOpen" class="modal-backdrop" @click.self="fecharModal">
      <div class="work-modal">

        <div class="wm-header">
          <h3 class="wm-title">Nova tarefa</h3>
          <button class="btn btn-ghost btn-icon btn-sm" @click="fecharModal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="wm-body">

          <!-- Busca de cliente -->
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <div class="wm-search-wrap">
              <!-- Cliente selecionado -->
              <div v-if="newLeadSelecionado" class="wm-client-chip">
                <div class="wm-chip-info">
                  <span class="wm-chip-nome">{{ newLeadSelecionado.nome }}</span>
                  <span v-if="newLeadSelecionado.negocio || newLeadSelecionado.categoria" class="wm-chip-neg">{{ newLeadSelecionado.negocio || newLeadSelecionado.categoria }}</span>
                </div>
                <button class="wm-chip-remove" @click="limparCliente">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <!-- Input de busca -->
              <template v-else>
                <div class="wm-search-input-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="wm-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    v-model="clienteSearch"
                    class="wm-search-input"
                    placeholder="Pesquisar cliente..."
                    @focus="showClientDropdown = true"
                    @blur="scheduleCloseDropdown" />
                </div>
                <div v-if="showClientDropdown" class="wm-client-dropdown">
                  <div v-if="!clientesFiltrados.length" class="wm-dropdown-empty">Nenhum cliente encontrado</div>
                  <button
                    v-for="l in clientesFiltrados" :key="l.id"
                    class="wm-client-opt"
                    @mousedown.prevent="selecionarCliente(l)">
                    <span class="wm-co-nome">{{ l.nome }}</span>
                    <span v-if="l.negocio || l.categoria" class="wm-co-neg">{{ l.negocio || l.categoria }}</span>
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- Nome do serviço -->
          <div class="form-group">
            <label class="form-label">Nome do serviço</label>
            <input v-model="newServico" class="form-input" placeholder="Ex: Site Institucional, Landing Page..." />
          </div>

          <!-- Tarefas predefinidas -->
          <div class="form-group">
            <label class="form-label">Tarefas predefinidas</label>
            <div class="wm-predef-grid">
              <button
                v-for="tp in tarefasPredefinidas" :key="tp.id"
                class="wm-predef-item"
                :class="{ 'wm-predef-item--sel': tp.sel }"
                @click="tp.sel = !tp.sel">
                <span class="wm-predef-cb">
                  <svg v-if="tp.sel" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                {{ tp.label }}
              </button>
            </div>
          </div>

          <!-- Outras tarefas -->
          <div class="form-group">
            <label class="form-label">Outras tarefas</label>
            <div class="wm-other-tasks">
              <div v-for="(t, i) in tasksCustom" :key="i" class="wm-other-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="wm-other-text">{{ t }}</span>
                <button class="wm-other-del" @click="tasksCustom.splice(i, 1)">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div class="wm-other-add-row">
                <input
                  ref="customTaskRef"
                  v-model="novaTaskCustom"
                  class="wm-other-input"
                  placeholder="Tarefa personalizada... (Enter para adicionar)"
                  @keydown.enter.prevent="addCustomTask" />
                <button class="wm-other-add-btn" @click="addCustomTask" title="Adicionar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            </div>
          </div>

        </div>

        <div class="wm-footer">
          <button class="btn btn-ghost btn-sm" @click="fecharModal">Cancelar</button>
          <button class="btn btn-primary btn-sm" @click="criarItem" :disabled="!newLeadSelecionado || !newServico.trim()">Criar</button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, nextTick, inject } from 'vue'
import { useWorkStore } from '@/stores/work'
import { useLeadsStore } from '@/stores/leads'
import { useSaving } from '@/composables/useSaving'
import InfoTip from '@/components/ui/InfoTip.vue'

const work  = useWorkStore()
const leads = useLeadsStore()
const { run } = useSaving()

// ── Filtro e grupos ──
const filtro      = ref('ativo')
const searchQuery = ref('')

const listaFiltrada = computed(() => work.items.filter(i => i.status === filtro.value))

const gruposCliente = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const seen = new Set()
  const groups = []
  for (const item of listaFiltrada.value) {
    if (!seen.has(item.lead_id)) {
      seen.add(item.lead_id)
      const lead = leads.leads.find(l => l.id === item.lead_id)
      const nome    = lead?.nome || '—'
      const negocio = lead?.negocio || lead?.categoria || ''
      const clientItems = listaFiltrada.value.filter(i => i.lead_id === item.lead_id)

      if (q) {
        const clienteMatch = nome.toLowerCase().includes(q) || negocio.toLowerCase().includes(q)
        const itemsFiltrados = clienteMatch
          ? clientItems
          : clientItems.filter(i => i.servico.toLowerCase().includes(q))
        if (!itemsFiltrados.length) continue
        groups.push({ leadId: item.lead_id, nome, negocio, items: itemsFiltrados })
      } else {
        groups.push({ leadId: item.lead_id, nome, negocio, items: clientItems })
      }
    }
  }
  return groups
})

// ── KPIs ──
const clientesAtivos        = computed(() => new Set(work.ativos.map(i => i.lead_id)).size)
const tarefasPendentesCount = computed(() => work.ativos.reduce((acc, i) => acc + i.tarefas.filter(t => !t.feito).length, 0))

// ── Progresso ──
const tarefasFeitas = i => i.tarefas.filter(t => t.feito).length
const progressPct   = i => i.tarefas.length ? Math.round((tarefasFeitas(i) / i.tarefas.length) * 100) : 0

// ── Collapse de serviços ──
const collapsedItems = ref(new Set())
function toggleCollapse(id) {
  const s = new Set(collapsedItems.value)
  s.has(id) ? s.delete(id) : s.add(id)
  collapsedItems.value = s
}

// ── Tarefas inline ──
const addingTaskId  = ref(null)
const novaTaskTexto = ref('')
const taskInputRef  = ref(null)

async function iniciarAddTask(id) {
  addingTaskId.value = id
  novaTaskTexto.value = ''
  await nextTick()
  const el = Array.isArray(taskInputRef.value) ? taskInputRef.value[0] : taskInputRef.value
  el?.focus()
}

async function confirmarTarefa(item, fechar = false) {
  if (novaTaskTexto.value.trim()) {
    await work.updateItem({
      ...item,
      tarefas: [...item.tarefas, { id: 't' + Date.now(), titulo: novaTaskTexto.value.trim(), feito: false }]
    })
    novaTaskTexto.value = ''
  }
  if (fechar) { addingTaskId.value = null; return }
  await nextTick()
  const el = Array.isArray(taskInputRef.value) ? taskInputRef.value[0] : taskInputRef.value
  el?.focus()
}

async function toggleTarefa(item, taskId) {
  await work.updateItem({ ...item, tarefas: item.tarefas.map(t => t.id === taskId ? { ...t, feito: !t.feito } : t) })
}

async function removerTarefa(item, taskId) {
  await work.updateItem({ ...item, tarefas: item.tarefas.filter(t => t.id !== taskId) })
}

// ── Edição inline de tarefa ──
const editingTask  = ref(null)
const editTaskText = ref('')

function startEditTask(itemId, task) {
  editingTask.value = { itemId, taskId: task.id }
  editTaskText.value = task.titulo
  nextTick(() => document.querySelector('.wc-task-edit')?.focus())
}

async function saveEditTask(item, taskId) {
  if (!editTaskText.value.trim()) { editingTask.value = null; return }
  await work.updateItem({ ...item, tarefas: item.tarefas.map(t => t.id === taskId ? { ...t, titulo: editTaskText.value.trim() } : t) })
  editingTask.value = null
}

// ── Notas ──
async function salvarNotas(item, notas) {
  if (notas === item.notas) return
  await work.updateItem({ ...item, notas })
}

// ── Drag & Drop — Serviços ──
const dragSvcId   = ref(null)
const dragSvcOver = ref(null)

function onDragStartSvc(e, item) {
  dragSvcId.value = item.id
  e.dataTransfer.effectAllowed = 'move'
}
function onDragOverSvc(e, item) {
  e.preventDefault()
  e.stopPropagation()
  if (item.id !== dragSvcId.value) dragSvcOver.value = item.id
}
function onDragLeaveSvc() { dragSvcOver.value = null }
async function onDropSvc(e, targetItem) {
  e.preventDefault()
  e.stopPropagation()
  const srcId = dragSvcId.value
  if (!srcId || srcId === targetItem.id) { onDragEndSvc(); return }

  const leadId = targetItem.lead_id
  const allItems = [...work.items]
  const clientIndices = allItems.reduce((acc, it, idx) => { if (it.lead_id === leadId) acc.push(idx); return acc }, [])
  const clientItems = clientIndices.map(i => allItems[i])
  const fromIdx = clientItems.findIndex(i => i.id === srcId)
  const toIdx   = clientItems.findIndex(i => i.id === targetItem.id)
  if (fromIdx === -1 || toIdx === -1) { onDragEndSvc(); return }

  const reordered = [...clientItems]
  const [moved] = reordered.splice(fromIdx, 1)
  reordered.splice(toIdx, 0, moved)
  clientIndices.forEach((gi, i) => { allItems[gi] = reordered[i] })

  await work.reorderItems(allItems)
  onDragEndSvc()
}
function onDragEndSvc() { dragSvcId.value = null; dragSvcOver.value = null }

// ── Drag & Drop — Tarefas ──
const dragTaskState = ref(null)
const dragTaskOver  = ref(null)

function onDragStartTask(e, item, task) {
  e.stopPropagation()
  dragTaskState.value = { itemId: item.id, taskId: task.id }
  e.dataTransfer.effectAllowed = 'move'
}
function onDragOverTask(e, item, task) {
  e.preventDefault()
  e.stopPropagation()
  if (dragTaskState.value?.itemId !== item.id) return
  if (task.id !== dragTaskState.value.taskId) dragTaskOver.value = { itemId: item.id, taskId: task.id }
}
function onDragLeaveTask() { dragTaskOver.value = null }
async function onDropTask(e, item, targetTask) {
  e.preventDefault()
  e.stopPropagation()
  const state = dragTaskState.value
  if (!state || state.itemId !== item.id || state.taskId === targetTask.id) { onDragEndTask(); return }

  const tasks = [...item.tarefas]
  const fromIdx = tasks.findIndex(t => t.id === state.taskId)
  const toIdx   = tasks.findIndex(t => t.id === targetTask.id)
  if (fromIdx === -1 || toIdx === -1) { onDragEndTask(); return }

  const [moved] = tasks.splice(fromIdx, 1)
  tasks.splice(toIdx, 0, moved)

  await work.updateItem({ ...item, tarefas: tasks })
  onDragEndTask()
}
function onDragEndTask() { dragTaskState.value = null; dragTaskOver.value = null }

// ── Status ──
async function concluirServico(item) { await run(() => work.updateItem({ ...item, status: 'concluido' }), 'Serviço concluído') }
async function reativarServico(item) { await run(() => work.updateItem({ ...item, status: 'ativo' }), 'Serviço reativado') }
async function removerItem(item)     { await run(() => work.removeItem(item.id), 'Removido') }

// ── Confirmação de exclusão ──
const confirmingSvc  = ref(null)
const confirmingTask = ref(null)

async function confirmarRemoverItem(item) {
  confirmingSvc.value = null
  await run(() => work.removeItem(item.id), 'Removido')
}
async function confirmarRemoverTarefa(item, taskId) {
  confirmingTask.value = null
  await work.updateItem({ ...item, tarefas: item.tarefas.filter(t => t.id !== taskId) })
}

// ── Modal ──
const modalOpen          = ref(false)
const newLeadSelecionado = ref(null)
const newServico         = ref('')
const clienteSearch      = ref('')
const showClientDropdown = ref(false)
const tasksCustom        = ref([])
const novaTaskCustom     = ref('')
const customTaskRef      = ref(null)

const tarefasPredefinidas = ref([
  { id: 'briefing',   label: 'Levantamento de briefing', sel: false },
  { id: 'layout',     label: 'Layout / Design',          sel: false },
  { id: 'dev',        label: 'Desenvolvimento',          sel: false },
  { id: 'conteudo',   label: 'Textos e conteúdo',        sel: false },
  { id: 'imagens',    label: 'Imagens e ícones',         sel: false },
  { id: 'revisao',    label: 'Revisão com cliente',      sel: false },
  { id: 'publicacao', label: 'Publicação',               sel: false },
  { id: 'seo',        label: 'SEO básico',               sel: false },
  { id: 'treino',     label: 'Treinamento do cliente',   sel: false },
])

const clientesFiltrados = computed(() => {
  const q = clienteSearch.value.trim().toLowerCase()
  const lista = leads.leads.filter(l => l.etapa !== 'perdido').sort((a, b) => a.nome.localeCompare(b.nome))
  if (!q) return lista.slice(0, 8)
  return lista.filter(l =>
    l.nome.toLowerCase().includes(q) ||
    (l.negocio || '').toLowerCase().includes(q) ||
    (l.categoria || '').toLowerCase().includes(q)
  )
})

function scheduleCloseDropdown() { setTimeout(() => { showClientDropdown.value = false }, 150) }
function selecionarCliente(lead) { newLeadSelecionado.value = lead; showClientDropdown.value = false; clienteSearch.value = '' }
function limparCliente() { newLeadSelecionado.value = null; clienteSearch.value = ''; showClientDropdown.value = false }

function addCustomTask() {
  if (!novaTaskCustom.value.trim()) return
  tasksCustom.value.push(novaTaskCustom.value.trim())
  novaTaskCustom.value = ''
  customTaskRef.value?.focus()
}

function openNew(leadId = null) {
  newLeadSelecionado.value = leadId ? leads.leads.find(l => l.id === leadId) || null : null
  newServico.value = ''
  clienteSearch.value = ''
  showClientDropdown.value = false
  tarefasPredefinidas.value.forEach(t => t.sel = false)
  tasksCustom.value = []
  novaTaskCustom.value = ''
  modalOpen.value = true
}

function fecharModal() { modalOpen.value = false }

async function criarItem() {
  if (!newLeadSelecionado.value || !newServico.value.trim()) return
  const tarefas = [
    ...tarefasPredefinidas.value.filter(t => t.sel).map((t, i) => ({ id: 't' + Date.now() + i, titulo: t.label, feito: false })),
    ...tasksCustom.value.map((t, i) => ({ id: 't' + (Date.now() + 999) + i, titulo: t, feito: false }))
  ]
  await run(() => work.addItem(newLeadSelecionado.value.id, newServico.value, tarefas), 'Trabalho criado')
  fecharModal()
}
</script>

<style scoped>
/* ── TOOLBAR ── */
.work-toolbar { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; justify-content: space-between; }

.work-search {
  display: flex; align-items: center; gap: .5rem;
  background: var(--bg-elevated); border: 1px solid var(--border-default);
  border-radius: var(--radius-lg); padding: .4rem .75rem;
  width: calc(25% - 0.5625rem);
  transition: border-color 120ms;
}
.work-search:focus-within { border-color: rgba(91,141,238,.5); }
.work-search svg { color: var(--text-tertiary); flex-shrink: 0; }
.work-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  font-family: var(--font-body); font-size: .82rem; color: var(--text-primary);
}
.work-search-input::placeholder { color: var(--text-tertiary); }
.work-search-clear {
  background: transparent; border: none; cursor: pointer;
  color: var(--text-tertiary); padding: 0; display: flex; align-items: center;
  transition: color 100ms;
}
.work-search-clear:hover { color: var(--text-primary); }

/* ── TABS ── */
.tabs { display:flex; gap:.25rem; background:var(--bg-elevated); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:.25rem; align-self:flex-start; }
.tab  { display:flex; align-items:center; gap:.4rem; padding:.4rem .875rem; border-radius:var(--radius-md); background:transparent; border:none; font-family:var(--font-body); font-size:.82rem; font-weight:500; color:var(--text-tertiary); cursor:pointer; transition:background 100ms ease,color 100ms ease; position:relative; white-space:nowrap; }
.tab.active { background:var(--accent); color:#fff; }
.tab:not(.active):hover { background:var(--bg-overlay); color:var(--text-primary); }
.tab-badge { position:absolute; top:2px; right:2px; background:var(--status-danger); color:#fff; font-size:.55rem; font-weight:700; padding:.1rem .35rem; border-radius:99px; line-height:1.4; }

/* ── GRID ── */
.work-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:1rem; align-items:start; }

/* ── CARD ── */
.work-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--status-info);
  border-radius: var(--radius-lg);
  padding: 1.125rem;
  display: flex; flex-direction: column; gap: .875rem;
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
  transition: box-shadow 150ms ease, border-color 150ms ease;
}
.work-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.35); }
.work-card--done { border-left-color: var(--accent); }

/* Card header — cliente */
.wc-header {
  display: flex; align-items: center; gap: .75rem;
  padding-bottom: .875rem;
  border-bottom: 1px solid var(--border-subtle);
}
.wc-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(91,141,238,.25), rgba(99,102,241,.35));
  border: 1px solid rgba(91,141,238,.22);
  color: var(--status-info); font-size: .875rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.wc-client { flex: 1; min-width: 0; }
.wc-nome { font-size: .9rem; font-weight: 700; color: var(--text-primary); margin: 0 0 .1rem; }
.wc-neg  { font-size: .72rem; color: var(--text-tertiary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── SERVIÇOS EMPILHADOS ── */
.wc-servicos { display: flex; flex-direction: column; gap: .5rem; }

.wcs-bloco {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: .75rem .875rem;
  display: flex; flex-direction: column; gap: .625rem;
  transition: border-color 150ms, opacity 150ms, transform 150ms;
  cursor: grab;
}
.wcs-bloco:hover { border-color: var(--border-default); }
.wcs-bloco--done { opacity: .78; }
.wcs-bloco--dragging { opacity: .4; cursor: grabbing; }
.wcs-bloco--drag-over { border-color: var(--status-info); box-shadow: 0 0 0 2px rgba(91,141,238,.2); }

/* Header do serviço — clicável */
.wcs-drag-handle {
  color: var(--text-tertiary); flex-shrink: 0; opacity: 0;
  cursor: grab; transition: opacity 100ms;
}
.wcs-bloco:hover .wcs-drag-handle { opacity: 1; }

.wcs-head {
  display: flex; align-items: center; gap: .5rem;
  cursor: pointer; user-select: none;
  border-radius: 6px; padding: .15rem .2rem; margin: -.15rem -.2rem;
  transition: background 80ms;
}
.wcs-head:hover { background: rgba(255,255,255,.04); }
[data-theme="light"] .wcs-head:hover { background: rgba(0,0,0,.04); }

.wcs-chevron { color: var(--text-tertiary); flex-shrink: 0; transform: rotate(-90deg); transition: transform 200ms cubic-bezier(.4,0,.2,1); }
.wcs-chevron--open { transform: rotate(0deg); }

.wcs-nome { font-size: .8125rem; font-weight: 600; color: var(--text-primary); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.wcs-badge {
  font-size: .58rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  border-radius: 5px; padding: .18rem .5rem; border: 1px solid transparent; flex-shrink: 0;
}
.wcs-badge--ativo { background: rgba(91,141,238,.12); color: var(--status-info); border-color: rgba(91,141,238,.28); }
.wcs-badge--done  { background: var(--accent-subtle); color: var(--accent); border-color: rgba(34,197,94,.28); }

/* ── PROGRESSO ── */
.wc-progress-row   { display: flex; align-items: center; gap: .625rem; }
.wc-progress-bar   { flex: 1; height: 5px; background: var(--bg-overlay); border-radius: 99px; overflow: hidden; }
.wc-progress-fill  { height: 100%; background: var(--status-info); border-radius: 99px; transition: width 350ms ease; }
.wc-progress-fill--done { background: var(--accent); }
.wc-progress-label { font-size: .68rem; font-weight: 600; color: var(--text-tertiary); white-space: nowrap; min-width: 2.5rem; text-align: right; }

/* ── CHECKLIST ── */
.wc-tasks { display: flex; flex-direction: column; gap: .15rem; }
.wc-task  { display: flex; align-items: center; gap: .5rem; padding: .3rem .35rem; border-radius: var(--radius-md); transition: background 80ms; cursor: grab; }
.wc-task:hover { background: var(--bg-elevated); }
.wc-task:hover .wc-task-del { opacity: 1; }
.wc-task:hover .wc-task-grip { opacity: 1; }
.wc-task--drag-over { background: rgba(91,141,238,.1); outline: 1px solid rgba(91,141,238,.35); outline-offset: -1px; }

.wc-task-grip {
  color: var(--text-tertiary); flex-shrink: 0; opacity: 0;
  cursor: grab; transition: opacity 100ms;
}

.wc-cb {
  width: 15px; height: 15px; flex-shrink: 0;
  border: 1.5px solid var(--border-strong);
  border-radius: 4px; background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  padding: 0; transition: all 130ms;
}
.wc-cb:hover { border-color: var(--status-info); background: rgba(91,141,238,.08); }
.wc-cb--checked { background: var(--status-info); border-color: var(--status-info); }
.wcs-bloco--done .wc-cb--checked { background: var(--accent); border-color: var(--accent); }

.wc-task-text { flex: 1; font-size: .8rem; font-family: var(--font-body); color: var(--text-primary); cursor: text; line-height: 1.4; user-select: none; }
.wc-task--done .wc-task-text { text-decoration: line-through; color: var(--text-tertiary); }

.wc-task-edit {
  flex: 1; font-size: .8rem; font-family: var(--font-body);
  background: var(--bg-overlay); border: 1px solid rgba(91,141,238,.45);
  border-radius: 4px; padding: .15rem .4rem; color: var(--text-primary); outline: none;
}

.wc-task-del { opacity: 0; background: transparent; border: none; cursor: pointer; color: var(--text-tertiary); padding: .1rem; display: flex; align-items: center; border-radius: 4px; transition: opacity 100ms, color 100ms; flex-shrink: 0; }
.wc-task-del:hover { color: var(--status-danger); background: rgba(224,85,85,.12); }

.wc-task-confirm { background: transparent; border: none; cursor: pointer; padding: .15rem; display: flex; align-items: center; border-radius: 4px; flex-shrink: 0; transition: background 100ms; }
.wc-task-confirm--yes { color: var(--status-danger); }
.wc-task-confirm--yes:hover { background: rgba(224,85,85,.12); }
.wc-task-confirm--no  { color: var(--text-tertiary); }
.wc-task-confirm--no:hover  { color: var(--text-primary); background: var(--bg-overlay); }

.wc-task-add-row { display: flex; align-items: center; gap: .3rem; padding: .15rem .35rem; }
.wc-task-add-input {
  flex: 1; font-size: .8rem; font-family: var(--font-body);
  background: var(--bg-overlay); border: 1px solid var(--border-default);
  border-radius: var(--radius-md); padding: .3rem .55rem; color: var(--text-primary);
  outline: none; transition: border-color 120ms;
}
.wc-task-add-input:focus { border-color: rgba(91,141,238,.5); }
.wc-task-add-input::placeholder { color: var(--text-tertiary); font-family: var(--font-body); }

.wc-add-btn { width: 26px; height: 26px; border-radius: var(--radius-md); background: var(--bg-overlay); border: 1px solid var(--border-default); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); flex-shrink: 0; transition: all 100ms; }
.wc-add-btn:hover { color: var(--text-primary); background: var(--bg-elevated); }
.wc-add-btn--confirm { background: rgba(91,141,238,.15); border-color: rgba(91,141,238,.35); color: var(--status-info); }
.wc-add-btn--confirm:hover { background: rgba(91,141,238,.28); }

.wc-add-task { display: inline-flex; align-items: center; gap: .35rem; background: transparent; border: none; cursor: pointer; font-family: var(--font-body); font-size: .75rem; font-weight: 500; color: var(--text-tertiary); padding: .3rem .35rem; border-radius: var(--radius-md); transition: color 100ms, background 100ms; }
.wc-add-task:hover { color: var(--status-info); background: rgba(91,141,238,.08); }

/* ── NOTAS ── */
.wc-notas {
  font-size: .8rem; font-family: var(--font-body); resize: none; width: 100%;
  background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); padding: .5rem .65rem;
  color: var(--text-primary); outline: none; transition: border-color 120ms; line-height: 1.55;
}
[data-theme="light"] .wc-notas { background: rgba(0,0,0,.03); }
.wc-notas:focus { border-color: rgba(91,141,238,.4); background: rgba(91,141,238,.03); }
.wc-notas::placeholder { color: var(--text-tertiary); font-family: var(--font-body); }

/* ── FOOTER SERVIÇO ── */
.wcs-foot { display: flex; align-items: center; gap: .5rem; padding-top: .125rem; }
.wcs-btn-full { flex: 1; justify-content: center; }
.wcs-del-btn:hover { color: var(--status-danger) !important; background: rgba(224,85,85,.12) !important; }
.wcs-confirm-text { font-size: .75rem; color: var(--text-secondary); white-space: nowrap; }

/* ── EMPTY ── */
.work-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .625rem; padding: 4rem 2rem; color: var(--text-tertiary); text-align: center; }
.work-empty svg { opacity: .2; }
.work-empty p { font-size: .9375rem; font-weight: 600; color: var(--text-secondary); margin: 0; }
.work-empty span { font-size: .8125rem; }

/* ══════════════════════════════
   MODAL — glass effect
══════════════════════════════ */
.work-modal {
  background: rgba(18,18,18,.38);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 28px 72px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.05) inset;
  border-radius: var(--radius-xl);
  width: 100%; max-width: 460px;
  max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
  animation: slideUp var(--transition-base) ease;
}
[data-theme="light"] .work-modal {
  background: rgba(255,255,255,.42);
  border: 1px solid rgba(255,255,255,.75);
  box-shadow: 0 20px 60px rgba(0,0,0,.1), 0 1px 0 rgba(255,255,255,.9) inset;
}

.wm-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem 1rem; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
.wm-title  { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; font-family: var(--font-body); }
.wm-body   { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: .875rem; overflow-y: auto; flex: 1; }

/* Busca cliente */
.wm-search-wrap { position: relative; }
.wm-search-input-wrap { display: flex; align-items: center; gap: .5rem; background: rgba(255,255,255,.06); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: .5rem .75rem; transition: border-color 120ms; }
.wm-search-input-wrap:focus-within { border-color: rgba(91,141,238,.5); background: rgba(91,141,238,.05); }
[data-theme="light"] .wm-search-input-wrap { background: rgba(0,0,0,.04); }
.wm-search-icon { color: var(--text-tertiary); flex-shrink: 0; }
.wm-search-input { flex: 1; background: transparent; border: none; outline: none; font-size: .875rem; font-family: var(--font-body); color: var(--text-primary); }
.wm-search-input::placeholder { color: var(--text-tertiary); }

.wm-client-dropdown { position: absolute; top: calc(100% + 5px); left: 0; right: 0; z-index: 999; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-md); overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,.4); max-height: 200px; overflow-y: auto; }
.wm-client-opt { width: 100%; background: transparent; border: none; cursor: pointer; padding: .55rem .875rem; display: flex; flex-direction: column; align-items: flex-start; gap: .1rem; text-align: left; transition: background 80ms; }
.wm-client-opt:hover { background: var(--bg-overlay); }
.wm-co-nome { font-size: .84rem; font-weight: 600; color: var(--text-primary); font-family: var(--font-body); }
.wm-co-neg  { font-size: .72rem; color: var(--text-tertiary); font-family: var(--font-body); }
.wm-dropdown-empty { padding: .625rem .875rem; font-size: .8rem; color: var(--text-tertiary); font-family: var(--font-body); text-align: center; }

.wm-client-chip { display: flex; align-items: center; justify-content: space-between; gap: .5rem; background: rgba(91,141,238,.1); border: 1px solid rgba(91,141,238,.3); border-radius: var(--radius-md); padding: .5rem .75rem; }
.wm-chip-info { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
.wm-chip-nome { font-size: .875rem; font-weight: 600; color: var(--text-primary); font-family: var(--font-body); }
.wm-chip-neg  { font-size: .72rem; color: var(--text-tertiary); font-family: var(--font-body); }
.wm-chip-remove { background: transparent; border: none; cursor: pointer; color: var(--text-tertiary); padding: .2rem; display: flex; border-radius: 4px; transition: color 100ms; flex-shrink: 0; }
.wm-chip-remove:hover { color: var(--status-danger); }

/* Tarefas predefinidas */
.wm-predef-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem; }
.wm-predef-item { display: flex; align-items: center; gap: .5rem; padding: .45rem .625rem; border-radius: var(--radius-md); background: rgba(255,255,255,.04); border: 1px solid var(--border-subtle); cursor: pointer; font-family: var(--font-body); font-size: .775rem; color: var(--text-secondary); text-align: left; transition: all 120ms; }
[data-theme="light"] .wm-predef-item { background: rgba(0,0,0,.04); }
.wm-predef-item:hover { border-color: var(--border-default); color: var(--text-primary); background: rgba(255,255,255,.07); }
.wm-predef-item--sel { background: rgba(91,141,238,.12); border-color: rgba(91,141,238,.4); color: var(--status-info); }
.wm-predef-cb { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; border: 1.5px solid currentColor; display: flex; align-items: center; justify-content: center; }
.wm-predef-item--sel .wm-predef-cb { background: var(--status-info); border-color: var(--status-info); color: #fff; }

/* Outras tarefas */
.wm-other-tasks { display: flex; flex-direction: column; gap: .35rem; }
.wm-other-item { display: flex; align-items: center; gap: .5rem; padding: .35rem .5rem; background: rgba(255,255,255,.04); border-radius: var(--radius-md); }
[data-theme="light"] .wm-other-item { background: rgba(0,0,0,.04); }
.wm-other-text { flex: 1; font-size: .8rem; font-family: var(--font-body); color: var(--text-primary); }
.wm-other-del { background: transparent; border: none; cursor: pointer; color: var(--text-tertiary); padding: .1rem; display: flex; border-radius: 3px; transition: color 100ms; }
.wm-other-del:hover { color: var(--status-danger); }
.wm-other-add-row { display: flex; align-items: center; gap: .375rem; }
.wm-other-input { flex: 1; font-size: .8rem; font-family: var(--font-body); background: rgba(255,255,255,.05); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: .4rem .625rem; color: var(--text-primary); outline: none; transition: border-color 120ms; }
[data-theme="light"] .wm-other-input { background: rgba(0,0,0,.04); }
.wm-other-input:focus { border-color: rgba(91,141,238,.5); }
.wm-other-input::placeholder { color: var(--text-tertiary); }
.wm-other-add-btn { width: 32px; height: 32px; border-radius: var(--radius-md); background: rgba(255,255,255,.05); border: 1px solid var(--border-default); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); flex-shrink: 0; transition: all 120ms; }
.wm-other-add-btn:hover { background: rgba(255,255,255,.1); color: var(--text-primary); }

.wm-footer { display: flex; justify-content: flex-end; gap: .5rem; padding: .875rem 1.5rem; border-top: 1px solid var(--border-subtle); flex-shrink: 0; }
</style>
