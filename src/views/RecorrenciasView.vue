<template>
  <div class="page-layout">

    <div class="page-header">
      <div>
        <h1 class="page-title">Recorrências</h1>
        <p class="page-subtitle">Receitas e despesas fixas mensais</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" @click="openNovaRec('saida')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Despesa fixa
        </button>
        <button class="btn btn-primary" @click="openNovaRec('entrada')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Receita fixa
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid kpi-grid--4">
      <div class="kpi-card">
        <span class="kpi-label">Receita recorrente</span>
        <span class="kpi-value kpi-value--accent">{{ fmt(kpis.rE) }}</span>
        <span class="kpi-sub">por mês</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Despesas fixas</span>
        <span class="kpi-value kpi-value--danger">{{ fmt(kpis.rS) }}</span>
        <span class="kpi-sub">por mês</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Saldo líquido</span>
        <span class="kpi-value" :class="kpis.saldo>=0?'kpi-value--accent':'kpi-value--danger'">{{ fmt(kpis.saldo) }}</span>
        <span class="kpi-sub">{{ kpis.saldo>=0?'positivo':'negativo' }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Clientes mensais</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ kpis.clis }}</span>
        <span class="kpi-sub">ativos</span>
      </div>
    </div>

    <!-- Controle mensal -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Controle mensal</h3>
        <select v-model="mesSel" class="form-select" style="width:auto;font-size:.85rem">
          <option v-for="m in meses12" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>
      </div>

      <div v-if="!mensais.length" class="rec-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        <p>Nenhuma recorrência cadastrada</p>
        <span>Adicione receitas ou despesas fixas para controlar aqui</span>
      </div>

      <div v-else class="rec-list">
        <div v-for="t in mensais" :key="t.id" class="rec-row">
          <div class="rec-tipo-dot" :class="t.tipo==='entrada'?'dot-entrada':'dot-saida'"></div>
          <div class="rec-info">
            <div class="rec-name">
              {{ t.desc }}
              <span v-if="t.cli" class="rec-cli">{{ t.cli }}</span>
            </div>
            <div class="rec-sub">
              {{ t.cat }}
              <span v-if="pgtoInfo(t.id)?.obs"> · {{ pgtoInfo(t.id).obs }}</span>
            </div>
          </div>
          <div class="rec-val" :style="{ color: t.tipo==='entrada'?'var(--accent)':'var(--status-danger)' }">
            {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
          </div>
          <div class="rec-status">
            <span class="badge" :class="stBadge(pgtoInfo(t.id)?.st)">{{ stLabel(pgtoInfo(t.id)?.st) }}</span>
          </div>
          <div class="rec-actions">
            <button class="btn btn-ghost btn-sm" @click="openPgto(t)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Atualizar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Todas as recorrências -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Todas as recorrências</h3>
        <span class="kpi-sub">{{ todas.length }} ativas</span>
      </div>
      <div class="table-wrapper" style="margin-top:.75rem;border:none;border-radius:0">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Frequência</th>
              <th style="text-align:right">Valor/mês</th>
              <th style="width:44px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!todas.length">
              <td colspan="6" style="text-align:center;color:var(--text-tertiary);padding:2rem;font-size:.875rem">Nenhuma recorrência</td>
            </tr>
            <tr v-for="t in todas" :key="t.id">
              <td>
                <div style="font-weight:500;color:var(--text-primary)">{{ t.desc }}</div>
                <div v-if="t.obs" class="text-muted" style="font-size:.75rem">{{ t.obs }}</div>
              </td>
              <td class="text-muted text-sm">{{ t.cli || '—' }}</td>
              <td>
                <span class="badge" :class="t.tipo==='entrada'?'badge-accent':'badge-danger'">
                  {{ t.tipo==='entrada'?'Receita':'Despesa' }}
                </span>
              </td>
              <td>
                <span class="rec-freq-tag">{{ t.rec==='mensal'?'Mensal':'Anual' }}</span>
              </td>
              <td style="text-align:right;font-weight:700;font-family:var(--font-display)"
                :style="{ color: t.tipo==='entrada'?'var(--accent)':'var(--status-danger)' }">
                {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
              </td>
              <td>
                <button class="btn btn-ghost btn-icon btn-sm"
                  style="color:var(--status-danger)"
                  title="Remover"
                  @click="rmTx(t.id)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- DRAWER: nova recorrência -->
  <div v-show="novaRecOpen" class="drawer-bg" @click="novaRecOpen=false"></div>
  <div v-show="novaRecOpen" class="drawer">
    <div class="drawer-header">
      <h3 class="drawer-title">{{ novaRecTipo==='entrada'?'Nova Receita Fixa':'Nova Despesa Fixa' }}</h3>
      <button class="btn btn-ghost btn-icon" @click="novaRecOpen=false">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="drawer-body">
      <div class="drawer-section">
        <p class="drawer-section-title">Informações</p>
        <div class="form-group"><label class="form-label">Descrição *</label><input v-model="novaRecForm.desc" class="form-input" placeholder="Ex: Mensalidade Iron House" /></div>
        <div class="form-group"><label class="form-label">Valor (R$) *</label><input v-model.number="novaRecForm.val" class="form-input" type="number" placeholder="97.00" step="0.01" min="0" /></div>
        <div class="form-group"><label class="form-label">Cliente</label><input v-model="novaRecForm.cli" class="form-input" placeholder="Nome do cliente" /></div>
      </div>
      <div class="drawer-section">
        <p class="drawer-section-title">Classificação</p>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select v-model="novaRecForm.cat" class="form-select">
            <option>Site</option><option>Google Meu Negócio</option><option>Tráfego</option>
            <option>Automação</option><option>Manutenção</option><option>Ferramentas</option>
            <option>Assinatura</option><option>Marketing</option><option>Outros</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Frequência</label>
          <select v-model="novaRecForm.rec" class="form-select">
            <option value="mensal">Mensal</option>
            <option value="anual">Anual</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Data de início</label><input v-model="novaRecForm.data" class="form-input" type="date" /></div>
        <div v-if="novaRecTipo==='entrada'" class="form-group">
          <label class="form-label">Status inicial</label>
          <select v-model="novaRecForm.st" class="form-select">
            <option value="recebido">Recebido</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </div>
      <div class="drawer-section">
        <p class="drawer-section-title">Extras</p>
        <div class="form-group"><label class="form-label">Observação</label><input v-model="novaRecForm.obs" class="form-input" placeholder="Vencimento, forma de pagamento..." /></div>
      </div>
    </div>
    <div class="drawer-footer">
      <button class="btn btn-secondary" @click="novaRecOpen=false">Cancelar</button>
      <button class="btn btn-primary" style="flex:1;justify-content:center" @click="saveNovaRec">Salvar</button>
    </div>
  </div>

  <!-- DRAWER: atualizar pagamento -->
  <div v-show="pgtoOpen" class="drawer-bg" @click="pgtoOpen=false"></div>
  <div v-show="pgtoOpen" class="drawer">
    <div class="drawer-header">
      <h3 class="drawer-title">Pagamento — {{ pgtoTx?.desc }}</h3>
      <button class="btn btn-ghost btn-icon" @click="pgtoOpen=false">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="drawer-body">
      <div class="drawer-section">
        <p class="drawer-section-title">Status do mês — {{ mesLabel }}</p>
        <div class="form-group">
          <label class="form-label">Status</label>
          <div class="st-opcoes">
            <label v-for="opt in stOpcoes" :key="opt.val"
              class="st-opcao" :class="{ 'st-opcao--sel': pgtoForm.st === opt.val, [`st--${opt.val}`]: true }"
              @click="pgtoForm.st = opt.val">
              <span class="st-dot"></span>
              {{ opt.label }}
            </label>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Data</label><input v-model="pgtoForm.data" class="form-input" type="date" /></div>
        <div class="form-group"><label class="form-label">Observação</label><input v-model="pgtoForm.obs" class="form-input" placeholder="Pago via Pix, boleto..." /></div>
      </div>
    </div>
    <div class="drawer-footer">
      <button class="btn btn-secondary" @click="pgtoOpen=false">Cancelar</button>
      <button class="btn btn-primary" style="flex:1;justify-content:center" @click="savePgto">Salvar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFinStore } from '@/stores/fin'
import { useSaving } from '@/composables/useSaving'

const fin = useFinStore()
const { run, toast } = useSaving()
const fmt = fin.fmt

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const now    = new Date()
const mesSel = ref(String(now.getMonth() + 1).padStart(2,'0'))

const meses12 = computed(() => Array.from({ length: 12 }, (_, i) => ({
  val:   String(i+1).padStart(2,'0'),
  label: MESES_SHORT[i]
})))

const mesLabel = computed(() => MESES[parseInt(mesSel.value) - 1])

const todas   = computed(() => fin.fin.filter(t => t.rec === 'mensal' || t.rec === 'anual'))
const mensais = computed(() => fin.fin.filter(t => t.rec === 'mensal'))

const kpis = computed(() => {
  const rE   = todas.value.filter(t => t.tipo==='entrada').reduce((a,t) => a+Number(t.val), 0)
  const rS   = todas.value.filter(t => t.tipo==='saida').reduce((a,t) => a+Number(t.val), 0)
  const clis = new Set(todas.value.filter(t => t.tipo==='entrada' && t.cli).map(t => t.cli)).size
  return { rE, rS, saldo: rE-rS, clis }
})

function pgtoKey(txId)  { return txId + '_' + now.getFullYear() + '-' + mesSel.value }
function pgtoInfo(txId) { return fin.pgto[pgtoKey(txId)] }

const ST_BADGE = { pago:'badge-accent', pendente:'badge-warning', atrasado:'badge-danger' }
const ST_LABEL = { pago:'Pago', pendente:'Pendente', atrasado:'Atrasado' }
function stBadge(st) { return ST_BADGE[st] || 'badge-warning' }
function stLabel(st) { return ST_LABEL[st] || 'Pendente' }

const stOpcoes = [
  { val:'pago',     label:'Pago' },
  { val:'pendente', label:'Pendente' },
  { val:'atrasado', label:'Atrasado' },
]

// Drawer nova recorrência
const novaRecOpen  = ref(false)
const novaRecTipo  = ref('entrada')
const novaRecForm  = ref({ desc:'', val:'', cat:'Site', rec:'mensal', st:'recebido', cli:'', obs:'', data:'' })

function openNovaRec(tipo) {
  novaRecTipo.value = tipo
  novaRecForm.value = {
    desc:'', val:'', cat:'Site', rec:'mensal',
    st: tipo==='entrada' ? 'recebido' : 'pago',
    cli:'', obs:'',
    data: now.toISOString().split('T')[0]
  }
  novaRecOpen.value = true
}

async function saveNovaRec() {
  if (!novaRecForm.value.desc || !novaRecForm.value.val) {
    toast('Preencha descrição e valor', 'error'); return
  }
  const tx = {
    id:   't' + Date.now(),
    tipo: novaRecTipo.value,
    desc: novaRecForm.value.desc,
    cat:  novaRecForm.value.cat,
    val:  novaRecForm.value.val,
    data: novaRecForm.value.data || now.toISOString().split('T')[0],
    rec:  novaRecForm.value.rec,
    st:   novaRecForm.value.st,
    cli:  novaRecForm.value.cli,
    obs:  novaRecForm.value.obs,
  }
  fin.fin.unshift(tx)
  await run(() => fin.upsert(tx), 'Recorrência salva')
  novaRecOpen.value = false
}

// Drawer pagamento
const pgtoOpen = ref(false)
const pgtoTx   = ref(null)
const pgtoForm = ref({ st:'pendente', data:'', obs:'' })

function openPgto(t) {
  pgtoTx.value = t
  const info = pgtoInfo(t.id)
  pgtoForm.value = {
    st:   info?.st   || 'pendente',
    data: info?.data || now.toISOString().split('T')[0],
    obs:  info?.obs  || ''
  }
  pgtoOpen.value = true
}

async function savePgto() {
  if (!pgtoTx.value) return
  const key = pgtoKey(pgtoTx.value.id)
  fin.pgto[key] = { ...pgtoForm.value }
  await run(() => fin.savePgtoEntry(key, pgtoForm.value), 'Atualizado')
  pgtoOpen.value = false
}

async function rmTx(id) {
  if (!confirm('Remover esta recorrência?')) return
  fin.fin = fin.fin.filter(t => t.id !== id)
  await run(() => fin.remove(id), 'Removido')
}
</script>

<style scoped>
/* Lista de recorrências */
.rec-empty {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:.5rem; padding:2.5rem; color:var(--text-tertiary); text-align:center;
  margin-top:.75rem;
}
.rec-empty svg { opacity:.3; }
.rec-empty p   { font-size:.9375rem; font-weight:600; color:var(--text-secondary); margin:0; }
.rec-empty span{ font-size:.8125rem; }

.rec-list { display:flex; flex-direction:column; margin-top:.75rem; }

.rec-row {
  display:flex; align-items:center; gap:.875rem;
  padding:.75rem 0; border-bottom:1px solid var(--border-subtle);
}
.rec-row:last-child { border-bottom:none; }

.rec-tipo-dot {
  width:8px; height:8px; border-radius:50%; flex-shrink:0;
}
.dot-entrada { background:var(--accent); }
.dot-saida   { background:var(--status-danger); }

.rec-info { flex:1; min-width:0; }
.rec-name {
  font-size:.875rem; font-weight:500; color:var(--text-primary);
  display:flex; align-items:center; gap:.5rem;
}
.rec-cli  { font-size:.75rem; color:var(--text-tertiary); }
.rec-sub  { font-size:.75rem; color:var(--text-tertiary); margin-top:.1rem; }

.rec-val {
  font-size:.9rem; font-weight:700;
  font-family:var(--font-display); flex-shrink:0; min-width:80px; text-align:right;
}
.rec-status  { flex-shrink:0; }
.rec-actions { flex-shrink:0; }

/* Frequência tag */
.rec-freq-tag {
  display:inline-block; font-size:.7rem; font-weight:600;
  background:var(--status-info-subtle); color:var(--status-info);
  border:1px solid var(--status-info);
  border-radius:var(--radius-full); padding:.15rem .5rem;
  white-space:nowrap; opacity:.8;
}

/* Status opcoes no drawer */
.st-opcoes { display:flex; gap:.5rem; }
.st-opcao {
  flex:1; display:flex; align-items:center; justify-content:center; gap:.4rem;
  padding:.5rem .75rem; border-radius:var(--radius-md);
  border:1px solid var(--border-default);
  font-size:.82rem; font-weight:500; color:var(--text-tertiary);
  cursor:pointer; transition:all 120ms ease; user-select:none;
}
.st-opcao:hover { border-color:var(--border-strong); color:var(--text-primary); }
.st-dot { width:7px; height:7px; border-radius:50%; background:currentColor; flex-shrink:0; }

.st--pago.st-opcao--sel     { background:var(--accent-subtle); border-color:var(--accent); color:var(--accent); }
.st--pendente.st-opcao--sel { background:var(--status-warning-subtle); border-color:var(--status-warning); color:var(--status-warning); }
.st--atrasado.st-opcao--sel { background:var(--status-danger-subtle); border-color:var(--status-danger); color:var(--status-danger); }

/* Drawer padrão */
.drawer-bg { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:800; }
[data-theme="light"] .drawer-bg { background:rgba(200,200,210,0.3); }
.drawer { position:fixed; top:0; right:0; height:100vh; width:400px; max-width:95vw; background:rgba(18,18,18,0.38); backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%); border-left:1px solid rgba(255,255,255,0.08); box-shadow:-8px 0 40px rgba(0,0,0,.5); z-index:801; display:flex; flex-direction:column; overflow:hidden; }
[data-theme="light"] .drawer { background:rgba(255,255,255,0.42); border-left:1px solid rgba(255,255,255,0.75); box-shadow:-8px 0 40px rgba(0,0,0,.1); }
.drawer-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.drawer-title  { font-size:.9375rem; font-weight:700; color:var(--text-primary); }
.drawer-body   { flex:1; overflow-y:auto; padding:.875rem 1.25rem; display:flex; flex-direction:column; gap:.875rem; }
.drawer-section { display:flex; flex-direction:column; gap:.5rem; padding-bottom:.875rem; border-bottom:1px solid var(--border-subtle); }
.drawer-section:last-child { border-bottom:none; }
.drawer-section-title { font-size:.62rem; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--text-tertiary); margin:0; }
.drawer-footer { display:flex; align-items:center; gap:.5rem; padding:.875rem 1.25rem; border-top:1px solid var(--border-default); flex-shrink:0; }

@media(max-width:768px) { .drawer{width:100%;} .st-opcoes{flex-direction:column;} }
</style>
