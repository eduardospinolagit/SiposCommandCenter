<template>
  <Transition name="modal-fade">
    <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
      <div class="modal fechar-modal">

        <div class="modal-header">
          <div>
            <div class="fechar-emoji">🎉</div>
            <h3 class="modal-title">Fechar negócio</h3>
            <p class="fechar-desc">Registre os detalhes para lançar automaticamente no financeiro.</p>
          </div>
          <button class="btn btn-ghost btn-icon" @click="$emit('update:modelValue', false)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-body" style="overflow-y:auto;flex:1">

          <!-- Cliente -->
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <input v-model="form.cli" class="form-input" placeholder="Nome do cliente" readonly style="opacity:.65;cursor:default" />
          </div>

          <!-- Serviços -->
          <div class="form-group">
            <label class="form-label">Serviços contratados *</label>
            <div class="servicos-grid">
              <label
                v-for="s in todosServicos"
                :key="s"
                class="servico-item"
                :class="{ sel: servicosSel.includes(s) }"
                @click="toggleServico(s)"
              >
                <span class="servico-dot"></span>
                {{ s }}
              </label>
            </div>
            <div class="servico-custom-row">
              <input
                v-model="servicoCustom"
                class="form-input"
                placeholder="Outro serviço..."
                style="font-size:.85rem"
                @keydown.enter="addServicoCustom"
              />
              <button class="btn btn-secondary btn-sm" @click="addServicoCustom">+ Add</button>
            </div>
          </div>

          <!-- Contrato -->
          <div class="form-group">
            <label class="form-label">Tipo de contrato</label>
            <select v-model="form.rec" class="form-select" @change="calcParcelas">
              <option value="unica">Pagamento único</option>
              <option value="mensal">Setup + mensalidade recorrente</option>
              <option value="anual">Setup + anuidade recorrente</option>
            </select>
          </div>

          <!-- Setup -->
          <div class="bloco">
            <div class="bloco-label">Setup / Entrada</div>
            <div class="form-group">
              <label class="form-label">Valor do setup (R$) *</label>
              <input v-model.number="form.val" class="form-input" type="number" placeholder="797" min="0" step="0.01" @input="calcParcelas" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Forma de pagamento</label>
              <select v-model="form.forma" class="form-select" @change="calcParcelas">
                <option value="100">100% à vista na entrada</option>
                <option value="50-50">50% agora + 50% na entrega</option>
                <option value="100-entrega">100% na entrega</option>
              </select>
            </div>
          </div>

          <!-- Parcela recorrente -->
          <div v-if="form.rec !== 'unica'" class="bloco">
            <div class="bloco-label">Parcela recorrente</div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Valor da parcela (R$)</label>
              <input v-model.number="form.valParcela" class="form-input" type="number" placeholder="Ex: 97" min="0" step="0.01" @input="calcParcelas" />
              <span class="form-hint">Fica pendente até você confirmar o recebimento</span>
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-box">
            <div v-if="preview.length === 0" class="preview-empty">Preencha os valores acima</div>
            <div v-for="(linha, i) in preview" :key="i" class="preview-row" :class="{ 'preview-sep': i > 0 && linha.sep }">
              <span class="preview-label">{{ linha.label }}</span>
              <span class="preview-valor" :style="{ color: linha.color }">{{ linha.valor }}</span>
            </div>
          </div>

          <!-- Datas -->
          <div class="form-group">
            <label class="form-label">Data da entrada</label>
            <input v-model="form.data1" class="form-input" type="date" />
          </div>
          <div v-if="form.forma !== '100'" class="form-group">
            <label class="form-label">Data da entrega / próx. vencimento</label>
            <input v-model="form.data2" class="form-input" type="date" />
          </div>

          <!-- Observação -->
          <div class="form-group">
            <label class="form-label">Observação</label>
            <input v-model="form.obs" class="form-input" placeholder="Ex: Pago via Pix, entrega em 5 dias..." />
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving" @click="confirmar">
            <svg v-if="!saving" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div v-else class="spinner" style="width:14px;height:14px;border-width:2px"></div>
            {{ saving ? 'Salvando...' : 'Fechar e registrar' }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useFinStore } from '@/stores/fin'
import { useLeadsStore } from '@/stores/leads'
import { useAuthStore } from '@/stores/auth'
import { inject } from 'vue'

const props = defineProps({ modelValue: Boolean, lead: Object })
const emit  = defineEmits(['update:modelValue', 'fechado'])

const fin   = useFinStore()
const leads = useLeadsStore()
const auth  = useAuthStore()
const toast = inject('toast')

const SERVICOS_BASE = [
  'Site Essencial', 'Site Profissional', 'Site Completo',
  'Google Meu Negócio', 'Tráfego Pago', 'Automação WhatsApp',
  'Manutenção', 'Pacote Completo'
]
const servicosExtras  = ref([])
const servicosSel     = ref([])
const servicoCustom   = ref('')
const todosServicos   = computed(() => [...SERVICOS_BASE, ...servicosExtras.value])

function toggleServico(s) {
  const idx = servicosSel.value.indexOf(s)
  if (idx !== -1) servicosSel.value.splice(idx, 1)
  else servicosSel.value.push(s)
}
function addServicoCustom() {
  const v = servicoCustom.value.trim()
  if (!v) return
  if (!servicosExtras.value.includes(v)) servicosExtras.value.push(v)
  if (!servicosSel.value.includes(v)) servicosSel.value.push(v)
  servicoCustom.value = ''
}

const hoje     = new Date().toISOString().split('T')[0]
const entrega  = new Date(); entrega.setDate(entrega.getDate() + 5)
const entregaStr = entrega.toISOString().split('T')[0]

const form = reactive({
  cli: '', val: 797, forma: '50-50', rec: 'unica',
  valParcela: 0, data1: hoje, data2: entregaStr, obs: '',
})

const saving = ref(false)
const fmt    = fin.fmt

watch(() => props.lead, (lead) => {
  if (!lead) return
  form.cli = lead.nome || ''
  form.val = lead.valor_estimado || 797
  form.forma = '50-50'; form.rec = 'unica'; form.valParcela = 0
  form.data1 = hoje; form.data2 = entregaStr; form.obs = ''
  servicoCustom.value = ''; servicosExtras.value = []
  servicosSel.value = lead.site_atual ? [lead.site_atual] : []
}, { immediate: true })

const preview = computed(() => {
  const val = form.val || 0
  const linhas = []
  if (form.forma === '100') {
    linhas.push({ label: 'Setup à vista', valor: '+' + fmt(val), color: 'var(--accent)' })
  } else if (form.forma === '50-50') {
    linhas.push({ label: '50% setup agora',     valor: '+' + fmt(val / 2), color: 'var(--accent)' })
    linhas.push({ label: '50% setup na entrega', valor: '+' + fmt(val / 2), color: 'var(--status-warning)' })
  } else if (form.forma === '100-entrega') {
    linhas.push({ label: 'Setup na entrega', valor: '+' + fmt(val), color: 'var(--status-warning)' })
  }
  if ((form.rec === 'mensal' || form.rec === 'anual') && form.valParcela > 0) {
    linhas.push({
      label: 'Parcela ' + (form.rec === 'mensal' ? 'mensal' : 'anual'),
      valor: '+' + fmt(form.valParcela),
      color: 'var(--status-info)', sep: true,
    })
  }
  return linhas
})

function calcParcelas() {}

async function confirmar() {
  if (!servicosSel.value.length) { toast('Selecione ao menos um serviço', 'err'); return }
  if (!form.val || !form.data1)  { toast('Preencha o valor e a data', 'err'); return }

  const desc   = servicosSel.value.join(' + ')
  const leadId = props.lead?.id
  const tagLead = leadId ? 'lead:' + leadId : ''
  const obsTag  = (o) => [o, tagLead].filter(Boolean).join(' · ')
  const txs = []
  const t   = Date.now()

  if (form.forma === '100') {
    txs.push({ id:'t'+t, tipo:'entrada', desc: desc+' — setup', cat:'Site', val:form.val, data:form.data1, st:'recebido', rec:'unica', cli:form.cli, obs:obsTag(form.obs) })
  } else if (form.forma === '50-50') {
    txs.push({ id:'t'+t,     tipo:'entrada', desc:desc+' — 50% setup entrada',  cat:'Site', val:form.val/2, data:form.data1,           st:'recebido', rec:'unica', cli:form.cli, obs:obsTag(form.obs) })
    txs.push({ id:'t'+(t+1), tipo:'entrada', desc:desc+' — 50% setup entrega',  cat:'Site', val:form.val/2, data:form.data2||form.data1, st:'pendente', rec:'unica', cli:form.cli, obs:obsTag('Aguardando entrega') })
  } else if (form.forma === '100-entrega') {
    txs.push({ id:'t'+t, tipo:'entrada', desc:desc+' — setup na entrega', cat:'Site', val:form.val, data:form.data2||form.data1, st:'pendente', rec:'unica', cli:form.cli, obs:obsTag('Aguardando entrega') })
  }
  if ((form.rec === 'mensal' || form.rec === 'anual') && form.valParcela > 0) {
    txs.push({ id:'t'+(t+2), tipo:'entrada', desc:desc+' — '+(form.rec==='mensal'?'mensalidade':'anuidade'), cat:'Site', val:form.valParcela, data:form.data2||form.data1, st:'pendente', rec:form.rec, cli:form.cli, obs:obsTag(form.obs) })
  }

  saving.value = true
  try {
    for (const tx of txs) {
      fin.fin.unshift(tx)
      await fin.upsert(tx)
    }
    if (props.lead) {
      await leads.upsert({ ...props.lead, etapa:'fechado', valor_estimado:form.val, updated_at:new Date().toISOString() })
    }
    emit('update:modelValue', false)
    emit('fechado')
    toast('🎉 Negócio fechado! Receita registrada', 'ok')
  } catch (e) {
    toast('Erro: ' + e.message, 'err')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fechar-modal {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.fechar-emoji {
  font-size: 1.5rem;
  margin-bottom: .25rem;
}

.fechar-desc {
  font-size: .85rem;
  color: var(--text-tertiary);
  margin-top: .25rem;
}

.fechar-modal .form-group {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  margin-bottom: 0;
}
.fechar-modal .modal-body > .form-group,
.fechar-modal .modal-body > .bloco,
.fechar-modal .modal-body > .preview-box {
  margin-bottom: .875rem;
}
.fechar-modal .modal-body > .form-group:last-child { margin-bottom: 0; }

/* Serviços */
.servicos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .375rem;
  margin-top: .25rem;
}

.servico-item {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .5rem .75rem;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: .82rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
  user-select: none;
}
.servico-item:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.servico-item.sel {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.servico-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  border: 2px solid currentColor;
  flex-shrink: 0;
  transition: background-color 150ms ease;
}
.servico-item.sel .servico-dot {
  background: var(--accent);
}

.servico-custom-row {
  display: flex;
  gap: .5rem;
  align-items: center;
  margin-top: .5rem;
}

/* Bloco de setup */
.bloco {
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.bloco-label {
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

/* Preview */
.preview-box {
  background: var(--bg-overlay);
  border: 1px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: 1rem;
  min-height: 48px;
}
.preview-empty {
  font-size: .8rem;
  color: var(--text-tertiary);
  text-align: center;
}
.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .375rem 0;
}
.preview-sep {
  border-top: 1px solid var(--border-default);
  margin-top: .375rem;
  padding-top: .75rem;
}
.preview-label { font-size: .85rem; color: var(--text-secondary); }
.preview-valor { font-size: .9rem; font-weight: 700; font-family: var(--font-display); }

/* Modal transition */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 200ms ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .modal, .modal-fade-leave-active .modal { transition: transform 200ms ease; }
.modal-fade-enter-from .modal { transform: translateY(12px); }
.modal-fade-leave-to .modal { transform: translateY(8px); }
</style>
