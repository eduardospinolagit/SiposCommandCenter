<template>
  <div class="page active">
    <div class="topbar">
      <h1>Financeiro</h1>
      <div class="tbar-right">
        <select v-model="mesFil" class="fs" style="font-size:.8rem;padding:6px 10px;width:auto">
          <option value="">Todo período</option>
          <option v-for="m in mesesDisponiveis" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>
        <select v-model="tipoFil" class="fs" style="font-size:.8rem;padding:6px 10px;width:auto">
          <option value="">Todos tipos</option>
          <option value="entrada">Receitas</option>
          <option value="saida">Despesas</option>
        </select>
        <button class="btn btn-g" @click="openModal('entrada')">+ Receita</button>
        <button class="btn btn-gh" @click="openModal('saida')">+ Despesa</button>
      </div>
    </div>

    <div class="content">
      <!-- KPIs -->
      <div class="kpi-grid" style="--cols:5">
        <div class="kpi"><div class="kl">Receita</div><div class="kv c-g">{{ fmt(f.rec) }}</div><div class="ks">{{ listaFiltrada.filter(t=>t.tipo==='entrada'&&t.st==='recebido').length }} tx</div></div>
        <div class="kpi"><div class="kl">A receber</div><div class="kv c-a">{{ fmt(f.pend) }}</div><div class="ks">pendente</div></div>
        <div class="kpi"><div class="kl">Despesas</div><div class="kv c-r">{{ fmt(f.sai) }}</div><div class="ks">{{ listaFiltrada.filter(t=>t.tipo==='saida').length }} tx</div></div>
        <div class="kpi"><div class="kl">Lucro</div><div class="kv" :class="f.lucro>=0?'c-g':'c-r'">{{ fmt(f.lucro) }}</div><div class="ks">{{ f.lucro>=0?'positivo':'negativo' }}</div></div>
        <div class="kpi"><div class="kl">Ticket médio</div><div class="kv c-b">{{ fmt(f.clis ? f.rec/f.clis : 0) }}</div><div class="ks">por cliente</div></div>
      </div>

      <!-- Gráficos -->
      <div class="chart-row">
        <div class="chart-box">
          <h3>Receita vs Despesa — ano</h3>
          <div class="chart-wrap"><canvas ref="chartMen"></canvas></div>
        </div>
        <div class="chart-box">
          <h3>Despesas por categoria</h3>
          <div class="chart-wrap"><canvas ref="chartCat"></canvas></div>
        </div>
      </div>

      <!-- Transações -->
      <div class="tbox">
        <div class="tbox-head">
          <h3>Transações</h3>
          <select v-model="catFil" class="fs" style="font-size:.8rem;padding:5px 8px;width:auto">
            <option value="">Todas categorias</option>
            <option v-for="c in cats" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Cliente</th><th>Status</th><th>Valor</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-if="!listaFiltrada.length">
                <td colspan="7" style="text-align:center;color:var(--gr);padding:16px">Nenhuma transação</td>
              </tr>
              <tr v-for="t in listaFiltrada" :key="t.id">
                <td style="color:var(--gr)">{{ t.data }}</td>
                <td>
                  {{ t.desc }}
                  <br v-if="t.obs" /><small v-if="t.obs" style="color:var(--gr)">{{ t.obs }}</small>
                </td>
                <td><span style="font-size:.72rem;background:#1a1a1a;padding:2px 7px;border-radius:999px;color:var(--lt)">{{ t.cat }}</span></td>
                <td style="color:var(--gr)">{{ t.cli || '—' }}</td>
                <td>
                  <span class="tag" :class="t.tipo==='entrada' ? (t.st==='pendente' ? 't-pend' : 't-in') : 't-out'">
                    {{ t.tipo==='entrada' ? (t.st==='pendente' ? 'Pendente' : 'Recebido') : 'Saída' }}
                  </span>
                </td>
                <td :style="{ fontWeight:600, color: t.tipo==='entrada'?'var(--g)':'var(--r)' }">
                  {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
                </td>
                <td style="white-space:nowrap;display:flex;gap:4px;align-items:center">
                  <button v-if="t.tipo==='entrada'&&t.st==='pendente'" class="it-btn" style="color:var(--g);border-color:rgba(34,197,94,.4)" title="Confirmar recebimento" @click="confirmarRecebimento(t.id)">✓</button>
                  <button class="it-btn" @click="editTx(t)">✏</button>
                  <button class="it-btn" style="color:var(--r)" @click="rmTx(t.id)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL TRANSAÇÃO -->
  <div class="mo" :class="{ open: modalOpen }">
    <div class="mo-box">
      <h3>{{ editId ? (modalTipo==='entrada'?'Editar Receita':'Editar Despesa') : (modalTipo==='entrada'?'Nova Receita':'Nova Despesa') }}</h3>
      <div class="fg"><label>Descrição *</label><input v-model="mForm.desc" class="fi" placeholder="Ex: Site Iron House — 50% entrada" /></div>
      <div class="fg"><label>Valor (R$) *</label><input v-model.number="mForm.val" class="fi" type="number" placeholder="797.00" step="0.01" min="0" /></div>
      <div class="fg"><label>Data *</label><input v-model="mForm.data" class="fi" type="date" /></div>
      <div class="fg"><label>Categoria</label>
        <select v-model="mForm.cat" class="fs">
          <option>Site</option><option>Google Meu Negócio</option><option>Tráfego</option>
          <option>Automação</option><option>Manutenção</option><option>Ferramentas</option>
          <option>Assinatura</option><option>Marketing</option><option>Outros</option>
        </select>
      </div>
      <div class="fg"><label>Recorrência</label>
        <select v-model="mForm.rec" class="fs">
          <option value="unica">Pagamento único</option>
          <option value="mensal">Mensal</option>
          <option value="anual">Anual</option>
        </select>
      </div>
      <div v-if="modalTipo==='entrada'" class="fg"><label>Status</label>
        <select v-model="mForm.st" class="fs">
          <option value="recebido">Recebido</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>
      <div class="fg"><label>Cliente</label><input v-model="mForm.cli" class="fi" placeholder="Nome do cliente" /></div>
      <div class="fg"><label>Observação</label><input v-model="mForm.obs" class="fi" placeholder="Parcela, vencimento..." /></div>
      <div class="mo-acts">
        <button class="btn btn-g" @click="saveTx">Salvar</button>
        <button class="btn btn-gh" @click="modalOpen=false">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useFinStore } from '@/stores/fin'
import { useSaving } from '@/composables/useSaving'

const fin = useFinStore()
const { run, toast } = useSaving()
const fmt = fin.fmt

const mesFil = ref('')
const tipoFil = ref('')
const catFil = ref('')

const chartMen = ref(null)
const chartCat = ref(null)
let charts = {}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const cats = ['Site','Google Meu Negócio','Tráfego','Automação','Manutenção','Ferramentas','Assinatura','Marketing','Outros']

const mesesDisponiveis = computed(() => {
  const ms = [...new Set(fin.fin.map(t => t.data?.substring(0,7)).filter(Boolean))].sort().reverse()
  return ms.map(m => {
    const [y, mo] = m.split('-')
    return { val: m, label: MESES[parseInt(mo)-1] + ' ' + y }
  })
})

const listaFiltrada = computed(() => {
  let lista = fin.fin
  if (mesFil.value) lista = lista.filter(t => t.data.includes(mesFil.value))
  if (tipoFil.value) lista = lista.filter(t => t.tipo === tipoFil.value)
  if (catFil.value) lista = lista.filter(t => t.cat === catFil.value)
  return lista
})

const f = computed(() => fin.calcPeriodo(mesFil.value))

// Modal
const modalOpen = ref(false)
const modalTipo = ref('entrada')
const editId = ref('')
const mForm = ref({ desc:'', val:'', data:'', cat:'Site', rec:'unica', st:'recebido', cli:'', obs:'' })

function openModal(tipo, rec = 'unica') {
  editId.value = ''
  modalTipo.value = tipo
  mForm.value = { desc:'', val:'', data: new Date().toISOString().split('T')[0], cat:'Site', rec, st:'recebido', cli:'', obs:'' }
  modalOpen.value = true
}

function editTx(t) {
  editId.value = t.id
  modalTipo.value = t.tipo
  mForm.value = { desc:t.desc, val:t.val, data:t.data, cat:t.cat, rec:t.rec||'unica', st:t.st, cli:t.cli||'', obs:t.obs||'' }
  modalOpen.value = true
}

async function saveTx() {
  if (!mForm.value.desc || !mForm.value.val || !mForm.value.data) {
    toast('Preencha descrição, valor e data', 'err'); return
  }
  const tx = {
    id: editId.value || 't' + Date.now(),
    tipo: modalTipo.value,
    desc: mForm.value.desc,
    cat: mForm.value.cat,
    val: mForm.value.val,
    data: mForm.value.data,
    rec: mForm.value.rec,
    st: modalTipo.value === 'entrada' ? mForm.value.st : 'pago',
    cli: mForm.value.cli,
    obs: mForm.value.obs
  }
  if (editId.value) {
    const idx = fin.fin.findIndex(t => t.id === editId.value)
    if (idx !== -1) fin.fin[idx] = tx
  } else {
    fin.fin.unshift(tx)
  }
  await run(() => fin.upsert(tx), editId.value ? 'Atualizado ✓' : 'Salvo ✓')
  modalOpen.value = false
}

async function rmTx(id) {
  if (!confirm('Remover esta transação?')) return
  fin.fin = fin.fin.filter(t => t.id !== id)
  await run(() => fin.remove(id), 'Removido ✓')
}

async function confirmarRecebimento(id) {
  const tx = fin.fin.find(t => t.id === id)
  if (!tx) return
  tx.st = 'recebido'
  tx.data = new Date().toISOString().split('T')[0]
  await run(() => fin.upsert(tx), '✓ Recebimento confirmado!')
}

function renderCharts() {
  if (!window.Chart) return
  nextTick(() => {
    if (chartMen.value) {
      if (charts.men) charts.men.destroy()
      const r = fin.mRec
      const s = Array.from({ length: 12 }, (_, i) => {
        const m = String(i+1).padStart(2,'0')
        return fin.fin.filter(t => t.tipo==='saida' && t.data.includes('-'+m+'-')).reduce((a,t)=>a+Number(t.val),0)
      })
      charts.men = new window.Chart(chartMen.value, {
        type: 'bar',
        data: {
          labels: MESES,
          datasets: [
            { label:'Receita', data:r, backgroundColor:'rgba(34,197,94,.35)', borderColor:'#22c55e', borderWidth:2, borderRadius:5 },
            { label:'Despesa', data:s, backgroundColor:'rgba(239,68,68,.35)', borderColor:'#ef4444', borderWidth:2, borderRadius:5 }
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ labels:{ color:'#666', boxWidth:11, font:{ size:10 } } } },
          scales:{
            x:{ grid:{ color:'rgba(255,255,255,.04)' }, ticks:{ color:'#555', font:{ size:10 } } },
            y:{ grid:{ color:'rgba(255,255,255,.04)' }, ticks:{ color:'#555', font:{ size:10 }, callback:v=>'R$'+v } }
          }
        }
      })
    }
    if (chartCat.value) {
      if (charts.cat) charts.cat.destroy()
      const gd = fin.gastosData()
      charts.cat = new window.Chart(chartCat.value, {
        type: 'doughnut',
        data: {
          labels: gd.labels,
          datasets: [{ data:gd.vals, backgroundColor:['rgba(239,68,68,.6)','rgba(245,158,11,.6)','rgba(59,130,246,.6)','rgba(139,92,246,.6)','rgba(34,197,94,.6)'], borderWidth:0 }]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#666', boxWidth:11, font:{ size:10 } } } } }
      })
    }
  })
}

onMounted(() => {
  if (!window.Chart) {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
    s.onload = renderCharts
    document.head.appendChild(s)
  } else {
    renderCharts()
  }
})

watch(() => fin.fin.length, renderCharts)
</script>
