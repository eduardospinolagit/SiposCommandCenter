<template>
  <div style="min-height:100vh;background:#0f0f0f;color:#f0f0f0;font-family:'Inter',sans-serif">

    <!-- TOPBAR -->
    <div class="prosp-topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <router-link to="/dashboard" class="back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          SLAC
        </router-link>
        <h1 style="font-size:1rem;font-weight:700">📋 Prospecção</h1>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="prosp-btn prosp-btn-gh" @click="metaOpen=true">⏱ Meta</button>
        <button v-if="allRows.length" class="prosp-btn prosp-btn-gh" @click="abrirFoco">🎯 Modo Foco</button>
        <button class="prosp-btn prosp-btn-gh" @click="abrirCSV">↑ Importar CSV</button>
        <button v-if="allRows.length" class="prosp-btn prosp-btn-red" @click="limparLista">🗑 Limpar</button>
        <input ref="fileInput" type="file" accept=".csv" style="display:none" @change="handleFile" />
      </div>
    </div>

    <!-- STATS -->
    <div v-if="allRows.length" class="prosp-stats">
      <div class="prosp-stat"><div class="prosp-stat-n">{{ allRows.length }}</div><div class="prosp-stat-l">Total</div></div>
      <div class="prosp-stat"><div class="prosp-stat-n" style="color:#999">{{ pendentes }}</div><div class="prosp-stat-l">Pendentes</div></div>
      <div class="prosp-stat"><div class="prosp-stat-n">{{ contatados }}</div><div class="prosp-stat-l">Contatados</div></div>
      <div class="prosp-stat"><div class="prosp-stat-n" style="color:#f87171">{{ semSite }}</div><div class="prosp-stat-l">Sem site</div></div>
    </div>

    <!-- INDICADOR DIÁRIO -->
    <div v-if="allRows.length" class="prosp-daily">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:10px">
        <div>
          <div style="font-size:1.5rem;font-weight:800;line-height:1">
            <span style="color:#22c55e">{{ contatados }}</span>
            <span style="color:#333;margin:0 4px">/</span>
            <span>{{ allRows.length }}</span>
          </div>
          <div style="font-size:.72rem;color:#666;margin-top:3px">contatos totais</div>
        </div>
        <div style="width:1px;height:48px;background:rgba(255,255,255,.08);flex-shrink:0"></div>
        <div>
          <div style="font-size:.72rem;color:#666;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Meta diária</div>
          <div style="display:flex;align-items:center;gap:6px">
            <input v-model.number="meta" type="number" min="1" max="500"
              style="width:62px;padding:5px 8px;background:#0d0d0d;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#f0f0f0;font-family:'Inter',sans-serif;font-size:.9rem;font-weight:700;outline:none;text-align:center" />
            <span style="font-size:.78rem;color:#666">/ dia</span>
          </div>
          <div style="font-size:.72rem;color:#666;margin-top:4px">{{ etaText }}</div>
        </div>
        <div style="width:1px;height:48px;background:rgba(255,255,255,.08);flex-shrink:0"></div>
        <div>
          <div style="font-size:.72rem;color:#666;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Média real</div>
          <div style="font-size:1.4rem;font-weight:800;color:#22c55e">{{ mediaReal || '—' }}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.05);border-radius:999px;height:8px;overflow:hidden">
        <div :style="{ width: pctTotal + '%', height:'100%', borderRadius:'999px', transition:'width .5s', background: pctTotal>=100?'linear-gradient(90deg,#f59e0b,#fbbf24)':pctTotal>=50?'linear-gradient(90deg,#d97706,#f59e0b)':'linear-gradient(90deg,#16a34a,#22c55e)' }"></div>
      </div>
      <div style="font-size:.75rem;margin-top:6px" :style="{ color: pctTotal>=50?'#22c55e':'#666' }">{{ indicadorMsg }}</div>
    </div>

    <!-- ALERTA 28H -->
    <div v-if="alerta28h" class="prosp-alert" @click="filterStatus='pendente'">
      ⚠️ {{ alerta28h }} lead{{ alerta28h!==1?'s':'' }} sem resposta há mais de 28h — clique para filtrar
    </div>

    <!-- SEL BAR -->
    <div v-if="selected.size" class="prosp-selbar">
      <span style="font-size:.82rem;font-weight:600;color:#22c55e">{{ selected.size }} selecionado{{ selected.size!==1?'s':'' }}</span>
      <button class="prosp-btn prosp-btn-g" style="padding:5px 12px;font-size:.78rem" @click="enviarSelecionados">→ Enviar ao Kanban</button>
      <button class="prosp-btn prosp-btn-red" style="padding:5px 12px;font-size:.78rem" @click="excluirSelecionados">Excluir</button>
      <button class="prosp-btn prosp-btn-gh" style="padding:5px 10px;font-size:.78rem" @click="selected.clear();selected=new Set(selected)">Limpar</button>
    </div>

    <!-- IMPORT ZONE -->
    <div v-if="!allRows.length && !showMap" class="prosp-import" @click="abrirCSV" @dragover.prevent @drop.prevent="handleDrop">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p style="font-size:.9rem;color:#999;margin-bottom:6px">Clique ou arraste um arquivo <strong style="color:#22c55e">.csv</strong> aqui</p>
      <span style="font-size:.78rem;color:#666">Qualquer formato: vírgula, ponto-e-vírgula, tab</span>
    </div>

    <!-- COL MAP -->
    <div v-if="showMap" style="margin:0 20px 20px;background:#161616;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:20px">
      <h3 style="font-size:.88rem;font-weight:700;margin-bottom:4px">Mapear colunas</h3>
      <p style="font-size:.78rem;color:#666;margin-bottom:16px">{{ csvRawRows.length }} linhas encontradas. Associe as colunas do CSV.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
        <div v-for="f in FIELDS" :key="f.key" style="display:flex;flex-direction:column;gap:5px">
          <label style="font-size:.72rem;color:#999;font-weight:500;text-transform:uppercase;letter-spacing:.06em">{{ f.label }}{{ f.required?' *':'' }}</label>
          <select v-model="colMap[f.key]" style="padding:7px 10px;background:#0f0f0f;border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#f0f0f0;font-family:'Inter',sans-serif;font-size:.82rem;outline:none">
            <option v-if="!f.required" value="">— ignorar —</option>
            <option v-for="h in csvHeaders" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="prosp-btn prosp-btn-g" @click="importarDados">Importar</button>
        <button class="prosp-btn prosp-btn-gh" @click="cancelarImport">Cancelar</button>
      </div>
    </div>

    <!-- FILTROS -->
    <div v-if="allRows.length" class="prosp-filters">
      <div style="position:relative;flex:1;min-width:200px">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;stroke:#666;fill:none;stroke-width:2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" style="width:100%;padding:8px 12px 8px 32px;background:#161616;border:1px solid rgba(255,255,255,.08);border-radius:7px;color:#f0f0f0;font-family:'Inter',sans-serif;font-size:.83rem;outline:none" placeholder="Buscar..." />
      </div>
      <select v-model="filterStatus" class="prosp-sel">
        <option value="">Status</option>
        <option value="pendente">Pendentes</option>
        <option value="contatado">Contatados</option>
        <option value="sem_site">Sem site</option>
      </select>
      <select v-model="filterCat" class="prosp-sel">
        <option value="">Categorias</option>
        <option v-for="c in categorias" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCidade" class="prosp-sel">
        <option value="">Cidades</option>
        <option v-for="c in cidades" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- TABELA -->
    <div v-if="allRows.length && !showMap" style="padding:16px 20px;overflow-x:auto">
      <div style="border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:.83rem">
          <thead>
            <tr style="background:#161616;border-bottom:1px solid rgba(255,255,255,.08)">
              <th style="padding:11px 14px"><input type="checkbox" style="accent-color:#22c55e;cursor:pointer" @change="toggleAll($event.target.checked)" /></th>
              <th class="prosp-th sortable" @click="sortBy('nome')" :class="sortField==='nome'?'sort-'+sortDir:''">Nome</th>
              <th class="prosp-th sortable" @click="sortBy('telefone')" :class="sortField==='telefone'?'sort-'+sortDir:''">Telefone</th>
              <th class="prosp-th">Categoria</th>
              <th class="prosp-th">Cidade</th>
              <th class="prosp-th">Site</th>
              <th class="prosp-th">Status</th>
              <th class="prosp-th">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!paginado.length">
              <td colspan="8" style="text-align:center;color:#666;padding:24px">Nenhum resultado</td>
            </tr>
            <tr v-for="r in paginado" :key="r._id"
              :style="{ opacity: r._status==='contatado'?.45:1, background: selected.has(r._id)?'rgba(34,197,94,.05)':'transparent' }"
              style="border-bottom:1px solid rgba(255,255,255,.04)">
              <td style="padding:11px 14px"><input type="checkbox" style="accent-color:#22c55e;cursor:pointer" :checked="selected.has(r._id)" @change="toggleSel(r._id,$event.target.checked)" /></td>
              <td style="padding:11px 14px">
                <div style="font-weight:600;cursor:pointer;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" @click="copiar(r.nome,'nome')" title="Copiar nome">{{ r.nome }}</div>
                <div v-if="r._status==='contatado'" style="font-size:.67rem;color:#666;cursor:pointer" @click="abrirHistorico(r)">📋 histórico {{ r._contatado_em ? '· '+fmtDataHora(r._contatado_em) : '' }}</div>
              </td>
              <td style="padding:11px 14px">
                <div style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.88rem;font-weight:600" @click="copiar(formatTel(r.telefone),'tel')">
                  {{ formatTel(r.telefone) }}
                  <span style="font-size:.65rem;color:#22c55e;opacity:0" class="copy-hint">copiar</span>
                </div>
              </td>
              <td style="padding:11px 14px;font-size:.78rem;color:#999">{{ r.categoria || '—' }}</td>
              <td style="padding:11px 14px;font-size:.78rem;color:#999">{{ r.cidade || '—' }}</td>
              <td style="padding:11px 14px">
                <a v-if="r.site" :href="r.site" target="_blank" rel="noopener" style="color:#22c55e;text-decoration:none;font-size:.75rem;white-space:nowrap;overflow:hidden;display:block;max-width:120px;text-overflow:ellipsis">{{ r.site.replace(/^https?:\/\//,'') }}</a>
                <span v-else style="color:#666;font-size:.75rem">—</span>
              </td>
              <td style="padding:11px 14px">
                <span :style="{ background: r._status==='contatado'?'rgba(34,197,94,.1)':!r.site?'rgba(239,68,68,.08)':'rgba(255,255,255,.06)', color: r._status==='contatado'?'#22c55e':!r.site?'#f87171':'#999', border: '1px solid ' + (r._status==='contatado'?'rgba(34,197,94,.2)':!r.site?'rgba(239,68,68,.15)':'rgba(255,255,255,.08)') }"
                  style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:.68rem;font-weight:600;white-space:nowrap">
                  {{ r._status==='contatado'?'✓ Contatado':!r.site?'Sem site':'Pendente' }}
                </span>
              </td>
              <td style="padding:11px 14px">
                <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
                  <button
                    :disabled="r._status==='contatado'"
                    style="padding:5px 11px;border-radius:6px;font-size:.72rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;white-space:nowrap"
                    :style="{ border: '1px solid rgba(34,197,94,.3)', background:'rgba(34,197,94,.06)', color:'#22c55e', opacity: r._status==='contatado'?.5:1 }"
                    @click="marcarContato(r._id)">
                    {{ r._status==='contatado'?'✓ Contatei':'📲 Contatei' }}
                  </button>
                  <button style="padding:5px 9px;border-radius:6px;font-size:.8rem;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;border:1px solid rgba(239,68,68,.25);background:transparent;color:rgba(239,68,68,.6)" @click="excluirLead(r._id)">🗑</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINAÇÃO -->
      <div v-if="totalPages > 1" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0 0;flex-wrap:wrap;gap:8px">
        <span style="font-size:.78rem;color:#666">{{ pagInfo }}</span>
        <div style="display:flex;gap:4px">
          <button class="prosp-pag" :disabled="page===1" @click="page--">←</button>
          <button v-for="p in pageRange" :key="p" class="prosp-pag" :class="{ active: p===page }" @click="typeof p==='number'&&(page=p)">{{ p }}</button>
          <button class="prosp-pag" :disabled="page===totalPages" @click="page++">→</button>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding:12px 20px;font-size:.68rem;color:#222;border-top:1px solid rgba(255,255,255,.04)">
      Desenvolvido por <strong style="color:#2a2a2a">Sano Lab</strong>
    </div>
  </div>

  <!-- MODO FOCO -->
  <div v-if="focoOpen" style="position:fixed;inset:0;background:#0a0a0a;z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">
    <div :class="{ flash: focoFlash }" style="background:#111;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px 36px;max-width:440px;width:100%;text-align:center;position:relative;transition:border-color .2s,box-shadow .2s">
      <button style="position:absolute;top:14px;right:16px;background:transparent;border:none;color:#666;cursor:pointer;font-size:1.1rem;font-family:'Inter',sans-serif;padding:4px 8px" @click="focoOpen=false">✕</button>
      <div style="margin-bottom:16px">
        <div style="font-size:.72rem;color:#666;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">{{ focoIdx+1 }} / {{ focoLista.length }} pendentes</div>
        <div style="background:rgba(255,255,255,.06);border-radius:999px;height:4px;overflow:hidden">
          <div :style="{ width: focoPct+'%', height:'100%', background:'linear-gradient(90deg,#16a34a,#22c55e)', borderRadius:'999px', transition:'width .4s' }"></div>
        </div>
      </div>
      <div v-if="focoLead" >
        <div style="font-size:1.55rem;font-weight:800;margin-bottom:6px;letter-spacing:-.02em;cursor:pointer" @click="copiar(focoLead.nome,'nome')">{{ focoLead.nome }}</div>
        <div style="font-size:.82rem;color:#666;margin-bottom:2px">{{ focoLead.categoria }}</div>
        <div style="font-size:.78rem;color:#3a3a3a;margin-bottom:24px">{{ focoLead.cidade }}</div>
        <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:24px;padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.08);cursor:pointer;font-size:1.05rem;font-weight:700" @click="copiar(formatTel(focoLead.telefone),'tel')">
          {{ formatTel(focoLead.telefone) }}
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a :href="'https://wa.me/55'+focoLead.telefone.replace(/\D/g,'')" target="_blank" class="prosp-btn prosp-btn-g" style="text-decoration:none">WhatsApp</a>
          <button class="prosp-btn prosp-btn-g" :disabled="focoContatando" @click="focoMarcar">📲 Contatei</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;gap:10px">
          <button class="prosp-btn prosp-btn-gh" :disabled="focoIdx===0" @click="focoIdx--">← Anterior</button>
          <button style="background:transparent;border:1px solid rgba(239,68,68,.2);color:rgba(239,68,68,.6);padding:7px 14px;border-radius:7px;font-family:'Inter',sans-serif;font-size:.78rem;cursor:pointer" @click="focoIdx++">Pular →</button>
          <button class="prosp-btn prosp-btn-gh" :disabled="focoIdx>=focoLista.length-1" @click="focoIdx++">Próximo →</button>
        </div>
      </div>
    </div>
  </div>

  <!-- HISTÓRICO MODAL -->
  <div v-if="histLead" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:600;display:flex;align-items:center;justify-content:center;padding:20px" @click.self="histLead=null">
    <div style="background:#111;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px;max-width:460px;width:100%;max-height:80vh;overflow-y:auto;position:relative">
      <button style="position:absolute;top:12px;right:14px;background:transparent;border:none;color:#666;cursor:pointer;font-size:1rem;font-family:'Inter',sans-serif;padding:4px 8px" @click="histLead=null">✕</button>
      <h3 style="font-size:.95rem;font-weight:700;margin-bottom:16px">{{ histLead.nome }}</h3>
      <div v-for="item in histItems" :key="item.l" style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0;margin-top:5px"></div>
        <div>
          <div style="font-size:.85rem;font-weight:600">{{ item.l }}</div>
          <div v-if="item.ts" style="font-size:.72rem;color:#666;margin-top:2px">{{ new Date(item.ts).toLocaleString('pt-BR') }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL META -->
  <div v-if="metaOpen" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:700;display:flex;align-items:center;justify-content:center;padding:20px" @click.self="metaOpen=false">
    <div style="background:#111;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:28px;max-width:360px;width:100%;position:relative">
      <button style="position:absolute;top:12px;right:14px;background:transparent;border:none;color:#666;cursor:pointer;font-size:1rem;font-family:'Inter',sans-serif;padding:4px 8px" @click="metaOpen=false">✕</button>
      <div style="font-size:.97rem;font-weight:700;margin-bottom:6px">Meta diária</div>
      <div style="font-size:.8rem;color:#555;margin-bottom:20px;line-height:1.6">Quantos contatos você quer fazer por dia?</div>
      <input v-model.number="metaTemp" type="number" min="1" max="500"
        style="width:100%;padding:11px 14px;background:#0d0d0d;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#f0f0f0;font-family:'Inter',sans-serif;font-size:1.1rem;font-weight:700;outline:none;text-align:center;margin-bottom:14px" />
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        <button v-for="s in [20,30,50,80,100]" :key="s" @click="metaTemp=s"
          :style="{ border:'1px solid '+(metaTemp===s?'rgba(34,197,94,.4)':'rgba(255,255,255,.1)'), background:metaTemp===s?'rgba(34,197,94,.08)':'transparent', color:metaTemp===s?'#22c55e':'#888', fontWeight:metaTemp===s?600:400 }"
          style="padding:6px 14px;border-radius:6px;font-family:'Inter',sans-serif;font-size:.78rem;cursor:pointer;transition:all .2s">{{ s }}</button>
      </div>
      <button class="prosp-btn prosp-btn-g" style="width:100%;justify-content:center;padding:11px" @click="salvarMeta">Salvar</button>
    </div>
  </div>

  <!-- TOAST -->
  <div class="toast" :class="[toastType, { show: toastShow }]">{{ toastMsg }}</div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { sb } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// ── STATE ──
const allRows = ref([])
const fileInput = ref(null)
const csvHeaders = ref([])
const csvRawRows = ref([])
const showMap = ref(false)
const colMap = ref({})
const search = ref('')
const filterStatus = ref('')
const filterCat = ref('')
const filterCidade = ref('')
const sortField = ref('')
const sortDir = ref('asc')
const page = ref(1)
const PAGE_SIZE = 50
const selected = ref(new Set())
const meta = ref(50)
const metaTemp = ref(50)
const metaOpen = ref(false)
const histLead = ref(null)

// Foco
const focoOpen = ref(false)
const focoLista = ref([])
const focoIdx = ref(0)
const focoFlash = ref(false)
const focoContatando = ref(false)

// Toast
const toastMsg = ref('')
const toastType = ref('ok')
const toastShow = ref(false)
let toastTimer = null

const FIELDS = [
  { key:'nome', label:'Nome', required:true },
  { key:'telefone', label:'Telefone', required:true },
  { key:'categoria', label:'Categoria', required:false },
  { key:'cidade', label:'Cidade', required:false },
  { key:'site', label:'Site atual', required:false },
  { key:'instagram', label:'Instagram', required:false },
  { key:'endereco', label:'Endereço', required:false },
]

const AUTO_MAP = {
  'title':'nome','name':'nome','nome':'nome','razão social':'nome',
  'phone':'telefone','telefone':'telefone','celular':'telefone','whatsapp':'telefone',
  'categoryname':'categoria','categoria':'categoria','category':'categoria','segmento':'categoria',
  'city':'cidade','cidade':'cidade','municipio':'cidade',
  'website':'site','site':'site','url':'site',
  'instagram':'instagram',
  'address':'endereco','endereco':'endereco','endereço':'endereco',
}

// ── COMPUTED ──
const contatados = computed(() => allRows.value.filter(r => r._status==='contatado').length)
const pendentes = computed(() => allRows.value.length - contatados.value)
const semSite = computed(() => allRows.value.filter(r => !r.site).length)
const pctTotal = computed(() => allRows.value.length ? Math.min(100, Math.round(contatados.value/allRows.value.length*100)) : 0)

const mediaReal = computed(() => {
  const cont = allRows.value.filter(r => r._status==='contatado' && r._contatado_em)
  if (!cont.length) return 0
  const datas = cont.map(r => new Date(r._contatado_em))
  const primeira = new Date(Math.min(...datas))
  const hoje = new Date()
  primeira.setHours(0,0,0,0); hoje.setHours(0,0,0,0)
  const dias = Math.max(1, Math.round((hoje-primeira)/86400000)+1)
  return Math.round(cont.length/dias*10)/10
})

const etaText = computed(() => {
  const faltam = allRows.value.length - contatados.value
  if (faltam <= 0 && allRows.value.length) return '🎉 Lista zerada!'
  if (!meta.value || !faltam) return ''
  const dias = Math.ceil(faltam / meta.value)
  return '~' + dias + ' dia' + (dias!==1?'s':'') + ' para zerar'
})

const indicadorMsg = computed(() => {
  const total = allRows.value.length
  const atual = contatados.value
  const pct = pctTotal.value
  const faltam = total - atual
  if (!total) return 'Importe uma lista para começar.'
  if (!atual) return 'Bora! ' + total + ' empresas aguardando contato.'
  if (pct < 30) return 'Bom começo! Faltam ' + faltam + ' contatos.'
  if (pct < 60) return 'No caminho certo! Mais da metade foi. 💪'
  if (pct < 100) return 'Quase lá! Só ' + faltam + ' empresa' + (faltam!==1?'s':'') + ' pendente' + (faltam!==1?'s':'') + '.'
  return '🎯 Lista zerada! ' + atual + ' empresas contatadas.'
})

const alerta28h = computed(() => {
  const agora = Date.now()
  return allRows.value.filter(r => r._status!=='contatado' && r._contatado_em && agora-new Date(r._contatado_em).getTime() > 28*3600000).length || 0
})

const categorias = computed(() => [...new Set(allRows.value.map(r=>r.categoria).filter(Boolean))].sort())
const cidades = computed(() => [...new Set(allRows.value.map(r=>r.cidade).filter(Boolean))].sort())

const filtrado = computed(() => {
  let lista = allRows.value
  if (search.value) { const q=search.value.toLowerCase(); lista=lista.filter(r=>(r.nome+' '+r.telefone+' '+r.cidade+' '+r.categoria).toLowerCase().includes(q)) }
  if (filterStatus.value==='sem_site') lista = lista.filter(r=>!r.site)
  else if (filterStatus.value) lista = lista.filter(r=>r._status===filterStatus.value)
  if (filterCat.value) lista = lista.filter(r=>r.categoria===filterCat.value)
  if (filterCidade.value) lista = lista.filter(r=>r.cidade===filterCidade.value)
  if (sortField.value) {
    lista = [...lista].sort((a,b) => {
      const av=(a[sortField.value]||'').toLowerCase(), bv=(b[sortField.value]||'').toLowerCase()
      return sortDir.value==='asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }
  return lista
})

const totalPages = computed(() => Math.ceil(filtrado.value.length/PAGE_SIZE))
const paginado = computed(() => filtrado.value.slice((page.value-1)*PAGE_SIZE, page.value*PAGE_SIZE))
const pagInfo = computed(() => {
  const start=(page.value-1)*PAGE_SIZE+1, end=Math.min(page.value*PAGE_SIZE,filtrado.value.length)
  return start+'–'+end+' de '+filtrado.value.length
})
const pageRange = computed(() => {
  const p=page.value, t=totalPages.value
  if (t<=7) return Array.from({length:t},(_,i)=>i+1)
  if (p<=4) return [1,2,3,4,5,'...',t]
  if (p>=t-3) return [1,'...',t-4,t-3,t-2,t-1,t]
  return [1,'...',p-1,p,p+1,'...',t]
})

// Foco
const focoLead = computed(() => focoLista.value[focoIdx.value])
const focoPct = computed(() => focoLista.value.length ? Math.round(focoIdx.value/focoLista.value.length*100) : 0)

// Histórico
const histItems = computed(() => {
  if (!histLead.value) return []
  const r = histLead.value
  return [
    r._contatado_em && { l:'📲 Contatado', ts: r._contatado_em },
    { l:'📞 '+formatTel(r.telefone) },
    r.site && { l:'🌐 '+r.site },
    r.categoria && { l:'🏷 '+r.categoria },
    r.cidade && { l:'📍 '+r.cidade },
    r.instagram && { l:'📸 '+r.instagram },
    r.endereco && { l:'📌 '+r.endereco },
  ].filter(Boolean)
})

// ── WATCH ──
watch(filtrado, () => { page.value = 1 })

// ── LIFECYCLE ──
onMounted(() => { carregarDados() })

// ── PERSISTÊNCIA ──
async function carregarDados() {
  // Primeiro localStorage (rápido)
  try {
    const local = localStorage.getItem('slac_prosp_lista')
    if (local) allRows.value = JSON.parse(local)
  } catch {}
  // Depois Supabase
  if (auth.user) {
    try {
      const { data } = await sb.from('configuracoes').select('valor')
        .eq('user_id', auth.user.id).eq('chave','prospeccao_lista').maybeSingle()
      if (data?.valor) { allRows.value = data.valor; localStorage.setItem('slac_prosp_lista', JSON.stringify(data.valor)) }
    } catch {}
  }
  // Carregar meta
  const m = parseInt(localStorage.getItem('slac_prosp_meta')||'50', 10)
  if (m>0) meta.value = m
}

async function salvarDados() {
  localStorage.setItem('slac_prosp_lista', JSON.stringify(allRows.value))
  if (auth.user) {
    try {
      await sb.from('configuracoes').upsert({
        id: auth.user.id+'_prospeccao_lista',
        user_id: auth.user.id, chave:'prospeccao_lista',
        valor: allRows.value, updated_at: new Date().toISOString()
      }, { onConflict:'id' })
    } catch {}
  }
}

// ── CSV ──
function abrirCSV() { fileInput.value.value=''; fileInput.value.click() }
function handleDrop(e) { const f=e.dataTransfer.files[0]; if(f) processFile(f) }
function handleFile(e) { const f=e.target.files[0]; if(f) processFile(f) }

function processFile(file) {
  if (!file.name.endsWith('.csv')) { toast('Selecione um arquivo .csv', 'err'); return }
  const reader = new FileReader()
  reader.onload = e => {
    const { headers, rows } = parseCSV(e.target.result)
    if (!headers.length||!rows.length) { toast('CSV inválido ou vazio','err'); return }
    csvHeaders.value = headers
    csvRawRows.value = rows
    // Auto-map
    const map = {}
    FIELDS.forEach(f => {
      const h = headers.find(h => AUTO_MAP[h.toLowerCase()] === f.key)
      map[f.key] = h || ''
    })
    colMap.value = map
    showMap.value = true
    toast(rows.length+' linhas encontradas','info')
  }
  reader.readAsText(file, 'UTF-8')
}

function detectDelimiter(text) {
  const line = text.split('\n')[0]||''
  const counts = { ',':0, ';':0, '\t':0 }
  let inQ=false
  for(const ch of line){ if(ch==='"')inQ=!inQ; if(!inQ&&counts[ch]!==undefined)counts[ch]++ }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0]
}

function parseCSV(text) {
  if (text.charCodeAt(0)===0xFEFF) text=text.slice(1)
  const delim = detectDelimiter(text)
  const lines = text.split(/\r?\n/).filter(l=>l.trim())
  if (!lines.length) return {headers:[],rows:[]}
  const headers = parseLine(lines[0],delim).map(h=>h.trim().replace(/^["']|["']$/g,''))
  const rows = []
  for(let i=1;i<lines.length;i++){
    const vals=parseLine(lines[i],delim)
    const obj={}
    headers.forEach((h,j)=>{ obj[h]=(vals[j]||'').trim().replace(/^["']|["']$/g,'') })
    rows.push(obj)
  }
  return {headers,rows}
}

function parseLine(line,delim=','){
  const result=[]; let cur='',inQ=false
  for(let i=0;i<line.length;i++){
    const ch=line[i]
    if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;continue}inQ=!inQ;continue}
    if(ch===delim&&!inQ){result.push(cur.trim());cur='';continue}
    cur+=ch
  }
  result.push(cur.trim()); return result
}

function importarDados() {
  if (!colMap.value.nome||!colMap.value.telefone) { toast('Selecione Nome e Telefone','err'); return }
  const novos = csvRawRows.value.map((row,i) => {
    const nome=(row[colMap.value.nome]||'').trim()
    const tel=limparTel(row[colMap.value.telefone]||'')
    if (!nome&&!tel) return null
    return {
      _id: Date.now()+'_'+i, _status:'pendente',
      nome: nome||tel, telefone:tel,
      categoria: colMap.value.categoria?row[colMap.value.categoria]?.trim():'',
      cidade: colMap.value.cidade?row[colMap.value.cidade]?.trim():'',
      site: colMap.value.site?row[colMap.value.site]?.trim():'',
      instagram: colMap.value.instagram?row[colMap.value.instagram]?.trim():'',
      endereco: colMap.value.endereco?row[colMap.value.endereco]?.trim():'',
    }
  }).filter(Boolean)
  const existTels = new Set(allRows.value.map(r=>r.telefone))
  const unicos = novos.filter(r=>!existTels.has(r.telefone))
  allRows.value = [...unicos,...allRows.value]
  salvarDados()
  showMap.value = false
  toast(unicos.length+' importadas ('+(novos.length-unicos.length)+' duplicatas ignoradas)','ok')
}

function cancelarImport() { showMap.value=false }
function limparTel(t) { const d=t.replace(/\D/g,''); return (d.startsWith('55')&&d.length>11)?d.slice(2):d }

// ── AÇÕES ──
async function marcarContato(id) {
  const row = allRows.value.find(r=>r._id===id)
  if (!row||row._status==='contatado') return
  row._status='contatado'
  row._contatado_em=new Date().toISOString()
  salvarDados()
  if (auth.user) {
    try {
      const notas=[
        row.endereco&&'Endereço: '+row.endereco,
        row.site&&'Site: '+row.site,
        row.instagram&&'Instagram: '+row.instagram,
        'Contatado: '+new Date(row._contatado_em).toLocaleString('pt-BR'),
        'Origem: Prospecção CSV'
      ].filter(Boolean).join('\n')
      await sb.from('leads').upsert({
        id:'prosp_'+id, user_id:auth.user.id,
        nome:row.nome, telefone:row.telefone, negocio:row.nome,
        categoria:row.categoria||'', cidade:row.cidade||'',
        instagram:row.instagram||'', site_atual:row.site||'',
        etapa:'contato', prioridade:'media', origem:'prospeccao',
        notas, created_at:row._contatado_em, updated_at:row._contatado_em
      },{onConflict:'id'})
      toast(row.nome+' → Kanban ✓','ok')
    } catch { toast('Salvo localmente','info') }
    try { new BroadcastChannel('slac_crm').postMessage({type:'lead_novo'}) } catch {}
  }
}

function excluirLead(id) {
  if (!confirm('Remover esta empresa da lista?')) return
  allRows.value = allRows.value.filter(r=>r._id!==id)
  selected.value.delete(id); selected.value=new Set(selected.value)
  salvarDados()
  toast('Removido ✓','ok')
}

function limparLista() {
  if (!confirm('Limpar a lista de '+allRows.value.length+' empresas? Não pode ser desfeito.')) return
  allRows.value=[]; selected.value=new Set()
  salvarDados(); toast('Lista limpa ✓','ok')
}

// ── SELEÇÃO ──
function toggleSel(id, checked) {
  if (checked) selected.value.add(id); else selected.value.delete(id)
  selected.value = new Set(selected.value)
}
function toggleAll(checked) {
  paginado.value.forEach(r => checked?selected.value.add(r._id):selected.value.delete(r._id))
  selected.value = new Set(selected.value)
}

async function enviarSelecionados() {
  const ids=[...selected.value]; let ok=0
  for (const id of ids) {
    const r=allRows.value.find(x=>x._id===id)
    if (!r||r._status==='contatado') continue
    await marcarContato(id); ok++
  }
  selected.value=new Set(); if (ok) toast(ok+' enviados ao Kanban ✓','ok')
}

function excluirSelecionados() {
  if (!selected.value.size) return
  if (!confirm('Excluir '+selected.value.size+' empresa(s)? Não pode ser desfeito.')) return
  allRows.value = allRows.value.filter(r=>!selected.value.has(r._id))
  selected.value=new Set(); salvarDados(); toast('Removidos ✓','ok')
}

// ── MODO FOCO ──
function abrirFoco() {
  focoLista.value = allRows.value.filter(r=>r._status!=='contatado')
  if (!focoLista.value.length) { toast('Nenhum lead pendente!','info'); return }
  focoIdx.value=0; focoOpen.value=true
}

async function focoMarcar() {
  const r=focoLead.value; if (!r) return
  focoContatando.value=true
  focoFlash.value=true; setTimeout(()=>focoFlash.value=false,500)
  tocarSom()
  await marcarContato(r._id)
  focoLista.value=allRows.value.filter(r=>r._status!=='contatado')
  setTimeout(()=>{
    if (focoIdx.value>=focoLista.value.length) { focoOpen.value=false; toast('Todos processados! 🎯','ok') }
    focoContatando.value=false
  },450)
}

function tocarSom() {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)()
    const osc=ctx.createOscillator(), gain=ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(520,ctx.currentTime)
    osc.frequency.setValueAtTime(660,ctx.currentTime+0.08)
    gain.gain.setValueAtTime(0.15,ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.25)
  } catch {}
  if (navigator.vibrate) navigator.vibrate([40,20,40])
}

// ── SORT ──
function sortBy(field) {
  sortDir.value = sortField.value===field?(sortDir.value==='asc'?'desc':'asc'):'asc'
  sortField.value = field
}

// ── HISTÓRICO ──
function abrirHistorico(r) { histLead.value=r }

// ── META ──
function salvarMeta() {
  if (metaTemp.value>0) { meta.value=metaTemp.value; localStorage.setItem('slac_prosp_meta',metaTemp.value) }
  metaOpen.value=false; toast('Meta: '+meta.value+' contatos/dia ✓','ok')
}

// ── UTILS ──
function formatTel(t) {
  if (!t) return '—'
  const d=t.replace(/\D/g,'')
  if (d.length===11) return '('+d.slice(0,2)+') '+d.slice(2,7)+'-'+d.slice(7)
  if (d.length===10) return '('+d.slice(0,2)+') '+d.slice(2,6)+'-'+d.slice(6)
  return t
}

function fmtDataHora(d) {
  return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
}

async function copiar(text, tipo='') {
  try { await navigator.clipboard.writeText(text); toast('"'+text+'" copiado!','ok') } catch {}
}

function toast(msg, type='ok') {
  toastMsg.value=msg; toastType.value=type; toastShow.value=true
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastShow.value=false,3000)
}
</script>

<style scoped>
.prosp-topbar { display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#111;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;z-index:50;gap:12px;flex-wrap:wrap }
.back-btn { display:flex;align-items:center;gap:6px;padding:7px 13px;border-radius:7px;border:1px solid rgba(255,255,255,.08);background:transparent;color:#999;font-size:.8rem;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;text-decoration:none }
.back-btn:hover { border-color:rgba(255,255,255,.2);color:#f0f0f0 }
.prosp-btn { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;font-size:.8rem;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;border:none;white-space:nowrap }
.prosp-btn-g { background:#22c55e;color:#fff }
.prosp-btn-g:hover { background:#16a34a }
.prosp-btn-gh { background:transparent;border:1px solid rgba(255,255,255,.08);color:#999 }
.prosp-btn-gh:hover { border-color:rgba(255,255,255,.2);color:#f0f0f0 }
.prosp-btn-red { background:transparent;border:1px solid rgba(239,68,68,.3);color:#ef4444 }
.prosp-btn-red:hover { background:rgba(239,68,68,.1) }
.prosp-stats { display:flex;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;background:#111 }
.prosp-stat { background:#161616;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 16px;min-width:90px;text-align:center }
.prosp-stat-n { font-size:1.4rem;font-weight:700;color:#22c55e;line-height:1 }
.prosp-stat-l { font-size:.68rem;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.06em }
.prosp-daily { background:#111;border-bottom:1px solid rgba(255,255,255,.08);padding:14px 20px }
.prosp-alert { background:rgba(245,158,11,.06);border-left:3px solid #f59e0b;padding:8px 16px;margin:0 20px 8px;font-size:.8rem;color:#fbbf24;cursor:pointer;border-radius:0 8px 8px 0}
.prosp-selbar { display:flex;align-items:center;gap:10px;padding:10px 20px;background:rgba(34,197,94,.06);border-bottom:1px solid rgba(34,197,94,.15);flex-wrap:wrap }
.prosp-import { margin:20px;border:2px dashed rgba(255,255,255,.08);border-radius:12px;padding:40px 24px;text-align:center;cursor:pointer;transition:border-color .2s }
.prosp-import:hover { border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.03) }
.prosp-filters { display:flex;align-items:center;gap:8px;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap }
.prosp-sel { padding:8px 12px;background:#161616;border:1px solid rgba(255,255,255,.08);border-radius:7px;color:#f0f0f0;font-family:'Inter',sans-serif;font-size:.8rem;outline:none;cursor:pointer }
.prosp-th { padding:11px 14px;text-align:left;font-size:.7rem;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap }
.prosp-th.sortable { cursor:pointer;user-select:none }
.prosp-th.sortable:hover { color:#f0f0f0 }
.prosp-th.sort-asc::after { content:' ↑' }
.prosp-th.sort-desc::after { content:' ↓' }
.prosp-pag { padding:5px 10px;border-radius:5px;border:1px solid rgba(255,255,255,.08);background:transparent;color:#999;font-size:.78rem;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s }
.prosp-pag:hover:not(:disabled) { border-color:rgba(255,255,255,.2);color:#f0f0f0 }
.prosp-pag.active { background:#22c55e;border-color:#22c55e;color:#fff }
.prosp-pag:disabled { opacity:.3;cursor:default }
.flash { border-color:#22c55e!important;box-shadow:0 0 0 3px rgba(34,197,94,.25)!important }
.toast { position:fixed;bottom:20px;right:20px;padding:10px 18px;border-radius:8px;font-size:.82rem;font-weight:500;opacity:0;transform:translateY(8px);transition:all .3s;pointer-events:none;z-index:999 }
.toast.show { opacity:1;transform:none }
.toast.ok { background:#22c55e;color:#fff }
.toast.err { background:#ef4444;color:#fff }
.toast.info { background:#3b82f6;color:#fff }
</style>
