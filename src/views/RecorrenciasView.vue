<template>
  <div class="page active">
    <div class="topbar">
      <h1>Recorrências</h1>
      <div class="tbar-right">
        <button class="btn btn-g" @click="$emit('open-fin', 'entrada', 'mensal')">+ Receita mensal</button>
        <button class="btn btn-gh" @click="$emit('open-fin', 'saida', 'mensal')">+ Despesa mensal</button>
      </div>
    </div>
    <div class="content">
      <!-- KPIs -->
      <div class="kpi-grid" style="--cols:4">
        <div class="kpi"><div class="kl">Receita recorrente</div><div class="kv c-g">{{ fmt(kpis.rE) }}</div><div class="ks">por mês</div></div>
        <div class="kpi"><div class="kl">Despesas fixas</div><div class="kv c-r">{{ fmt(kpis.rS) }}</div><div class="ks">por mês</div></div>
        <div class="kpi"><div class="kl">Saldo</div><div class="kv" :class="kpis.saldo>=0?'c-g':'c-r'">{{ fmt(kpis.saldo) }}</div><div class="ks">líquido</div></div>
        <div class="kpi"><div class="kl">Clientes</div><div class="kv c-p">{{ kpis.clis }}</div><div class="ks">mensais</div></div>
      </div>

      <!-- Controle mensal -->
      <div class="tbox" style="margin-bottom:16px">
        <div class="tbox-head">
          <h3>Controle mensal</h3>
          <select v-model="mesSel" class="fs" style="font-size:.8rem;padding:5px 8px;width:auto">
            <option v-for="m in meses12" :key="m.val" :value="m.val">{{ m.label }}</option>
          </select>
        </div>
        <div v-if="!mensais.length" style="padding:16px 18px;color:var(--gr);font-size:.85rem">
          Adicione receitas ou despesas mensais para controlar aqui.
        </div>
        <div v-for="t in mensais" :key="t.id" class="rec-row">
          <div class="rec-info">
            <div class="rec-name">{{ t.desc }} <small v-if="t.cli" style="color:var(--gr)">— {{ t.cli }}</small></div>
            <div class="rec-sub">{{ t.cat }}{{ pgtoInfo(t.id)?.obs ? ' · ' + pgtoInfo(t.id)?.obs : '' }}</div>
          </div>
          <div class="rec-val" :style="{ color: t.tipo==='entrada'?'var(--g)':'var(--r)' }">
            {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
          </div>
          <div class="rec-st">
            <span :style="{ fontSize:'.78rem', fontWeight:600, color: stColor(pgtoInfo(t.id)?.st) }">
              {{ stLabel(pgtoInfo(t.id)?.st) }}
            </span>
          </div>
          <div class="rec-act">
            <button class="it-btn" @click="openPgto(t)">Atualizar</button>
          </div>
        </div>
      </div>

      <!-- Lista completa -->
      <div class="tbox">
        <div class="tbox-head"><h3>Todas as recorrências</h3></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Descrição</th><th>Cliente</th><th>Tipo</th><th>Freq.</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              <tr v-if="!todas.length"><td colspan="6" style="text-align:center;color:var(--gr);padding:16px">Nenhuma recorrência</td></tr>
              <tr v-for="t in todas" :key="t.id">
                <td>{{ t.desc }}<br v-if="t.obs"/><small v-if="t.obs" style="color:var(--gr)">{{ t.obs }}</small></td>
                <td style="color:var(--gr)">{{ t.cli || '—' }}</td>
                <td><span class="tag" :class="t.tipo==='entrada'?'t-in':'t-out'">{{ t.tipo==='entrada'?'Receita':'Despesa' }}</span></td>
                <td><span class="tag t-rec">{{ t.rec==='mensal'?'Mensal':'Anual' }}</span></td>
                <td :style="{ fontWeight:600, color: t.tipo==='entrada'?'var(--g)':'var(--r)' }">
                  {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
                </td>
                <td style="display:flex;gap:4px">
                  <button class="it-btn" style="color:var(--r)" @click="rmTx(t.id)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL PGTO -->
  <div class="mo" :class="{ open: pgtoOpen }">
    <div class="mo-box">
      <h3>Pagamento — {{ pgtoTx?.desc }}</h3>
      <div class="fg"><label>Status</label>
        <select v-model="pgtoForm.st" class="fs">
          <option value="pago">✓ Pago</option>
          <option value="pendente">⏳ Pendente</option>
          <option value="atrasado">⚠ Atrasado</option>
        </select>
      </div>
      <div class="fg"><label>Data</label><input v-model="pgtoForm.data" class="fi" type="date" /></div>
      <div class="fg"><label>Observação</label><input v-model="pgtoForm.obs" class="fi" placeholder="Pago via Pix..." /></div>
      <div class="mo-acts">
        <button class="btn btn-g" @click="savePgto">Salvar</button>
        <button class="btn btn-gh" @click="pgtoOpen=false">Cancelar</button>
      </div>
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

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const now = new Date()
const mesSel = ref(String(now.getMonth() + 1).padStart(2,'0'))

const meses12 = computed(() => Array.from({ length: 12 }, (_, i) => ({
  val: String(i+1).padStart(2,'0'),
  label: MESES[i]
})))

const todas = computed(() => fin.fin.filter(t => t.rec === 'mensal' || t.rec === 'anual'))
const mensais = computed(() => fin.fin.filter(t => t.rec === 'mensal'))

const kpis = computed(() => {
  const rE = todas.value.filter(t=>t.tipo==='entrada').reduce((a,t)=>a+Number(t.val),0)
  const rS = todas.value.filter(t=>t.tipo==='saida').reduce((a,t)=>a+Number(t.val),0)
  const clis = new Set(todas.value.filter(t=>t.tipo==='entrada'&&t.cli).map(t=>t.cli)).size
  return { rE, rS, saldo: rE-rS, clis }
})

function pgtoKey(txId) { return txId + '_' + new Date().getFullYear() + '-' + mesSel.value }
function pgtoInfo(txId) { return fin.pgto[pgtoKey(txId)] }

const ST_COLOR = { pago:'var(--g)', pendente:'var(--a)', atrasado:'var(--r)' }
const ST_LABEL = { pago:'✓ Pago', pendente:'Pendente', atrasado:'Atrasado' }
function stColor(st) { return ST_COLOR[st] || 'var(--a)' }
function stLabel(st) { return ST_LABEL[st] || 'Pendente' }

// Modal pgto
const pgtoOpen = ref(false)
const pgtoTx = ref(null)
const pgtoForm = ref({ st:'pendente', data:'', obs:'' })

function openPgto(t) {
  pgtoTx.value = t
  const info = pgtoInfo(t.id)
  pgtoForm.value = { st: info?.st||'pendente', data: info?.data||new Date().toISOString().split('T')[0], obs: info?.obs||'' }
  pgtoOpen.value = true
}

async function savePgto() {
  if (!pgtoTx.value) return
  const key = pgtoKey(pgtoTx.value.id)
  fin.pgto[key] = { ...pgtoForm.value }
  await run(() => fin.savePgtoEntry(key, pgtoForm.value), 'Atualizado ✓')
  pgtoOpen.value = false
}

async function rmTx(id) {
  if (!confirm('Remover esta recorrência?')) return
  fin.fin = fin.fin.filter(t => t.id !== id)
  await run(() => fin.remove(id), 'Removido ✓')
}
</script>
