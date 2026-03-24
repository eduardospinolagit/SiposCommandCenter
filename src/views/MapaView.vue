<template>
  <div class="page active">
    <div class="topbar">
      <h1>Mapa Mental</h1>
      <div class="tbar-right">
        <button class="btn btn-gh" @click="toggleAll">{{ allOpen ? 'Fechar tudo' : 'Abrir tudo' }}</button>
        <button class="btn btn-g" @click="openAddItem">+ Adicionar</button>
      </div>
    </div>
    <div class="content">
      <!-- KPIs -->
      <div class="kpi-grid" style="--cols:4;margin-bottom:18px">
        <div class="kpi"><div class="kl">Feito</div><div class="kv c-g">{{ mapa.stats.ok }}</div><div class="ks">{{ pct(mapa.stats.ok) }}%</div></div>
        <div class="kpi"><div class="kl">Em andamento</div><div class="kv c-a">{{ mapa.stats.doing }}</div><div class="ks">progresso</div></div>
        <div class="kpi"><div class="kl">Faltando</div><div class="kv c-r">{{ mapa.stats.nope }}</div><div class="ks">para fazer</div></div>
        <div class="kpi"><div class="kl">Futuro</div><div class="kv c-p">{{ mapa.stats.future }}</div><div class="ks">planejado</div></div>
      </div>

      <!-- Categorias -->
      <div v-for="cat in mapa.dados" :key="cat.id" class="cat-card">
        <div class="cat-head" @click="toggle(cat.id)">
          <div class="cat-ico">{{ cat.ico }}</div>
          <div class="cat-inf">
            <div class="cat-title">{{ cat.title }}</div>
            <div class="cat-prog">
              <div class="cat-bar"><div class="cat-fill" :style="{ width: catPct(cat) + '%' }"></div></div>
              <div class="cat-pct">{{ catOk(cat) }}/{{ cat.items.length }} · {{ catPct(cat) }}%</div>
            </div>
          </div>
          <span class="cat-arr" :class="{ open: openCats.has(cat.id) }">▼</span>
        </div>
        <div class="cat-body" :class="{ open: openCats.has(cat.id) }">
          <div class="ig">
            <div v-for="it in cat.items" :key="it.id" class="it">
              <div class="it-dot" :class="'d-' + it.s"></div>
              <div class="it-body">
                <div class="it-title">{{ it.title }}</div>
                <div class="it-desc">{{ it.desc }}</div>
                <span class="it-badge" :class="'b-' + it.s">{{ SL[it.s] }}</span>
                <div class="it-acts">
                  <button v-if="it.s !== 'ok'" class="it-btn" @click="chSt(cat.id, it.id, 'ok')">✓ Feito</button>
                  <button v-if="it.s !== 'doing'" class="it-btn" @click="chSt(cat.id, it.id, 'doing')">→ Iniciar</button>
                  <button class="it-btn" style="color:var(--r)" @click="rmIt(cat.id, it.id)">✕</button>
                </div>
              </div>
            </div>
          </div>
          <button class="btn btn-gh" style="margin-top:10px;font-size:.78rem;padding:5px 11px" @click="openAddItemCat(cat.id)">+ Adicionar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL ITEM -->
  <div class="mo" :class="{ open: modalOpen }">
    <div class="mo-box">
      <h3>Adicionar item</h3>
      <div class="fg"><label>Categoria</label>
        <select v-model="mForm.catId" class="fs">
          <option v-for="c in mapa.dados" :key="c.id" :value="c.id">{{ c.ico }} {{ c.title }}</option>
        </select>
      </div>
      <div class="fg"><label>Título *</label><input v-model="mForm.title" class="fi" placeholder="Ex: Criar Instagram" /></div>
      <div class="fg"><label>Descrição</label><input v-model="mForm.desc" class="fi" placeholder="Detalhes" /></div>
      <div class="fg"><label>Status</label>
        <select v-model="mForm.s" class="fs">
          <option value="nope">Faltando</option>
          <option value="doing">Em andamento</option>
          <option value="ok">Feito</option>
          <option value="future">Futuro</option>
        </select>
      </div>
      <div class="mo-acts">
        <button class="btn btn-g" @click="saveItem">Salvar</button>
        <button class="btn btn-gh" @click="modalOpen=false">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMapaStore } from '@/stores/mapa'
import { useSaving } from '@/composables/useSaving'

const mapa = useMapaStore()
const { run, toast } = useSaving()

const SL = { ok:'Feito', doing:'Em andamento', nope:'Faltando', future:'Futuro' }
const openCats = ref(new Set())
const allOpen = ref(false)

function pct(n) { return mapa.stats.total ? Math.round(n / mapa.stats.total * 100) : 0 }
function catOk(cat) { return cat.items.filter(i => i.s === 'ok').length }
function catPct(cat) { return cat.items.length ? Math.round(catOk(cat) / cat.items.length * 100) : 0 }

function toggle(id) {
  if (openCats.value.has(id)) openCats.value.delete(id)
  else openCats.value.add(id)
  openCats.value = new Set(openCats.value)
}

function toggleAll() {
  allOpen.value = !allOpen.value
  if (allOpen.value) openCats.value = new Set(mapa.dados.map(c => c.id))
  else openCats.value = new Set()
}

async function chSt(catId, itemId, s) {
  await run(() => mapa.changeStatus(catId, itemId, s), 'Atualizado ✓')
}

async function rmIt(catId, itemId) {
  if (!confirm('Remover este item?')) return
  await run(() => mapa.removeItem(catId, itemId), 'Removido ✓')
}

// Modal
const modalOpen = ref(false)
const mForm = ref({ catId: '', title: '', desc: '', s: 'nope' })

function openAddItem() {
  mForm.value = { catId: mapa.dados[0]?.id || '', title: '', desc: '', s: 'nope' }
  modalOpen.value = true
}

function openAddItemCat(catId) {
  mForm.value = { catId, title: '', desc: '', s: 'nope' }
  modalOpen.value = true
}

async function saveItem() {
  if (!mForm.value.title) { toast('Digite um título', 'err'); return }
  await run(() => mapa.addItem(mForm.value.catId, mForm.value.title, mForm.value.desc, mForm.value.s), 'Adicionado ✓')
  modalOpen.value = false
}
</script>
