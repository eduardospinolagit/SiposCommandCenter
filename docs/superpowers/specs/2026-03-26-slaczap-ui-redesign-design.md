# SlacZap UI/UX Redesign — Design Spec

## Goal

Reformular a interface do `SlacZapView.vue` para o padrão SLAC (minimalista, dark, tokens globais), removendo elementos desnecessários e adicionando um modal glass de configuração de lead com 5 seções.

## Contexto

`SlacZapView.vue` é o inbox de WhatsApp integrado ao SLAC CRM. A view atual tem botões de "Exportar" e "Abrir no CRM" na toolbar do chat que serão substituídos por um único botão ⚙️ que abre um modal glass com todas as configurações e análises do lead ativo.

`activeLead` é uma `ref` local já existente no componente que armazena o objeto do lead ativo (com campos `id`, `nome`, `telefone`, etc.). Não é do store — é estado local da view.

---

## 1. Remoção de elementos

Da `.sz-chat-toolbar`:
- **Botão "Exportar conversa"** (`exportarConversa`) — removido: botão, método, e qualquer CSS exclusivo
- **Botão "Informações do contato"** (`openContact`) — removido: botão, método, e painel `.sz-info-panel` (se existir) com todo o seu CSS
- **Botão "Abrir no CRM"** (`irCRM`) — substituído pelo botão ⚙️

Ao remover `openContact`, remover também o painel lateral de contato (`sz-info-panel`, `sz-info-overlay`) e qualquer estado reativo associado (`infoOpen`, `showInfo`, etc.), pois essa funcionalidade migra para a seção Contato do modal.

---

## 2. Botão ⚙️ (Settings)

Posição: último item da `.sz-chat-toolbar`, visível apenas quando `activeLead?.id` existe.

Ícone: `Settings` inline SVG (Lucide — stroke, 15×15px, `stroke-width="1.8"`). SVG inline para evitar dependência de versão do pacote Lucide.

Ao clicar: `configModalOpen.value = true`.

---

## 3. Ícones — SVGs Inline

Todos os ícones do modal são SVGs inline (Lucide visual style: stroke, rounded caps, 16×16, stroke-width 1.8). Não usar pacote npm Lucide para evitar problemas de versão. Usar o SVG path diretamente, como já feito no resto da view.

Paths de referência para os 5 ícones da nav:
- **User**: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`
- **StickyNote**: `<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><polyline points="15 3 15 9 21 9"/>`
- **CalendarClock**: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="16" cy="16" r="3"/><path d="M16 14.5V16l1 1"/>`
- **DollarSign**: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`
- **Sparkles**: `<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>`

---

## 4. Modal Glass

### Abertura / Fechamento
- `v-if="configModalOpen"` com Vue `<Transition name="sz-fade">` (opacity 0→1, 150ms ease-out, já definida no componente ou adicionada no scoped CSS)
- Fecha ao clicar no `.sz-modal-overlay` (não no `.sz-modal`)
- Fecha ao pressionar `Escape`
- Fecha ao clicar no botão `✕`

Listener Escape:
```js
function onEscModal(e) { if (e.key === 'Escape') configModalOpen.value = false }
watch(configModalOpen, (val) => {
  if (val) document.addEventListener('keydown', onEscModal)
  else document.removeEventListener('keydown', onEscModal)
})
```

Reset ao trocar de lead:
```js
watch(activeLead, () => {
  activeSection.value = 'contato'
  configModalOpen.value = false
})
```

### Estrutura HTML
```
.sz-modal-overlay        → overlay fullscreen, fecha ao clicar; role="dialog"; aria-label="Configurações do lead"
  .sz-modal              → glass panel, posicionado por flexbox do overlay
    .sz-modal-close      → botão ✕ canto superior direito
    .sz-modal-nav        → nav vertical esquerda, 64px
      button.sz-modal-nav-item ×5  → SVG inline + title="Nome da seção"
    .sz-modal-body       → conteúdo à direita, overflow-y auto
      [v-if por activeSection] → seção ativa
```

### CSS do modal (scoped)
```css
.sz-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.sz-modal {
  display: flex;
  width: min(720px, 95vw);
  height: min(560px, 90vh);
  background: rgba(22, 22, 22, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  position: relative;
}
.sz-modal-close {
  position: absolute; top: 12px; right: 12px;
  background: none; border: none; cursor: pointer;
  color: var(--text-tertiary); padding: 4px; border-radius: 4px;
  transition: color 0.15s;
}
.sz-modal-close:hover { color: var(--text-primary); }
.sz-modal-nav {
  width: 64px; flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex; flex-direction: column;
  padding: 48px 0 12px; gap: 2px;
}
.sz-modal-nav-item {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 44px;
  background: none; border: none; cursor: pointer;
  color: var(--text-tertiary);
  border-left: 2px solid transparent;
  transition: color 0.15s, background 0.15s;
}
.sz-modal-nav-item:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
.sz-modal-nav-item--active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--accent-subtle);
}
.sz-modal-body {
  flex: 1; overflow-y: auto; padding: 24px;
}
.sz-modal-body::-webkit-scrollbar { width: 4px; }
.sz-modal-body::-webkit-scrollbar-track { background: transparent; }
.sz-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
.sz-modal-section-title {
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
  color: var(--text-secondary); text-transform: uppercase;
  margin-bottom: 16px;
}
/* Transition */
.sz-fade-enter-active, .sz-fade-leave-active { transition: opacity 0.15s ease; }
.sz-fade-enter-from, .sz-fade-leave-to { opacity: 0; }
/* Mobile */
@media (max-width: 768px) {
  .sz-modal {
    width: 100vw; height: 100vh;
    border-radius: 0; border: none;
    flex-direction: column;
  }
  .sz-modal-nav {
    width: 100%; height: 52px; flex-shrink: 0;
    flex-direction: row;
    border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0; overflow-x: auto; overflow-y: hidden;
    scrollbar-width: none;
  }
  .sz-modal-nav::-webkit-scrollbar { display: none; }
  .sz-modal-nav-item {
    flex-shrink: 0; width: 52px; height: 100%;
    border-left: none; border-bottom: 2px solid transparent;
  }
  .sz-modal-nav-item--active {
    border-left-color: transparent;
    border-bottom-color: var(--accent);
  }
  .sz-modal-body { padding: 16px; }
}
```

---

## 5. Seções do Modal

### 5 seções na ordem da nav

| # | Seção | SVG ícone (ref seção 3) | `activeSection` value |
|---|-------|------------------------|----------------------|
| 1 | Contato | User | `contato` |
| 2 | Anotações | StickyNote | `anotacoes` |
| 3 | Follow-up | CalendarClock | `followup` |
| 4 | Financeiro | DollarSign | `financeiro` |
| 5 | Análise IA | Sparkles | `analise` |

---

### Seção 1 — Contato

Exibe os campos do lead em grid 2 colunas usando `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea` do `global.css`.

**Campos editáveis:**
- Nome, Telefone, Email, Empresa (`.form-input`)
- Etapa (`<select class="form-select">` com `leads.ETAPAS`)
- Valor R$ (`<input type="number" class="form-input">`)
- Origem (`.form-input`)
- Observação (`<textarea class="form-textarea">`)

**Save por `@blur` com dirty check** — só salva se o valor mudou:
```js
function saveFieldIfDirty(field, value) {
  if (activeCrmLead.value[field] === value) return
  leads.upsert({ id: activeCrmLead.value.id, [field]: value })
}
```

**Resumo histórico** (bloco separado, título "Histórico", somente leitura):
- "Adicionado em: " + `new Date(activeCrmLead.value.created_at).toLocaleDateString('pt-BR')`
- "Follow-ups realizados: " + `activeCrmLead.value.followup_count ?? 0`
- "Releads: " + `activeCrmLead.value.relead_data ? '1' : 'Nenhum'`

---

### Seção 2 — Anotações

`<textarea>` com altura mínima 200px, `placeholder="Anote qualquer informação sobre este lead..."`.

Popula com `activeCrmLead.value.anotacoes ?? ''` ao montar.

**Debounce manual com `setTimeout`** (sem dependência externa):
```js
let anotacoesTimer = null
function onAnotacoesInput(val) {
  clearTimeout(anotacoesTimer)
  anotacoesTimer = setTimeout(() => {
    leads.upsert({ id: activeCrmLead.value.id, anotacoes: val })
  }, 800)
}
```

Requer nova coluna: `anotacoes text DEFAULT NULL`.

---

### Seção 3 — Follow-up

- `<input type="datetime-local" class="form-input">` — popula com `activeCrmLead.value.proximo_followup ? activeCrmLead.value.proximo_followup.slice(0,16) : ''`
- `<input type="text" class="form-input" placeholder="Contexto do follow-up">` — popula com `activeCrmLead.value.followup_obs ?? ''`
- Botão "Salvar follow-up" (`.btn.btn-primary.btn-sm`)

**Os campos não salvam por `@blur`** — apenas o botão salva (para não incrementar o contador sem intenção):
```js
async function saveFollowup() {
  await leads.upsert({
    id: activeCrmLead.value.id,
    proximo_followup: followupDate.value || null,
    followup_obs: followupObs.value || null,
    followup_count: (activeCrmLead.value.followup_count ?? 0) + 1
  })
}
```

Requer novas colunas: `followup_obs text DEFAULT NULL`, `followup_count integer DEFAULT 0`.

---

### Seção 4 — Financeiro

**Dados do contrato** (save por `@blur` com dirty check, igual seção Contato):
- Pacote: `<select class="form-select">` (opções: `''`=Não definido / `essencial`=Essencial R$797 / `profissional`=Profissional R$1.097 / `completo`=Completo R$1.397 / `personalizado`=Personalizado)
- Valor total: `<input type="number" class="form-input">`

**Parcelas** (estado local reativo — `const parcelas = ref([...activeCrmLead.value.parcelas])`):

Lista com cada item mostrando: `#número`, valor (formatado `R$ X.XXX`), data de vencimento, toggle "Pago".

Ao alternar "Pago": atualiza item no array local e chama `saveParcelas()`.

Ao clicar "Adicionar parcela": adiciona `{ numero: parcelas.value.length + 1, valor: null, vencimento: null, pago: false }` ao array local. **Não salva automaticamente** — o usuário preenche os campos e o save ocorre no `@blur` de cada campo da parcela.

```js
function saveParcelas() {
  leads.upsert({ id: activeCrmLead.value.id, parcelas: parcelas.value })
}
```

Ordenação na exibição: `parcelas.value.slice().sort((a, b) => a.numero - b.numero)`.

**Transações vinculadas** (leitura de `fin.fin` já em memória):
```js
const transacoesLead = computed(() =>
  fin.fin
    .filter(t => t.cli?.toLowerCase() === activeCrmLead.value?.nome?.toLowerCase())
    .slice(0, 10)
)
```
- Se `transacoesLead.length === 0`: texto "Nenhuma transação vinculada." em `--text-tertiary`
- Se há resultados: lista com `.tx-row`, `.tx-date`, `.tx-val` do global.css

Requer novas colunas: `pacote text DEFAULT NULL`, `valor_contrato numeric DEFAULT NULL`, `parcelas jsonb DEFAULT '[]'`.

---

### Seção 5 — Análise IA

**Estado sem análise** (`activeCrmLead.value.analise_ia === null`):
- Texto descritivo (font-size 13px, `--text-secondary`): "A IA analisa as últimas mensagens e avalia o potencial deste lead."
- Botão "Analisar conversa" (`.btn.btn-primary`)

**Estado carregando** (`analisando.value === true`):
- Substituir botão por `.sz-typing` (spinner existente no componente)
- Texto: "Analisando conversa..."

**Ao clicar "Analisar":**
```js
async function analisarLead() {
  analisando.value = true
  erroAnalise.value = null
  try {
    const msgs = (wa.messages[activeLead.value.telefone] ?? [])
      .slice(-50)
      .map(m => ({ direcao: m.direcao, mensagem: m.mensagem.slice(0, 500), data: m.data }))

    const { data, error } = await supabase.functions.invoke('analyze-lead', {
      body: { leadId: activeCrmLead.value.id, messages: msgs }
    })
    if (error) throw error

    await leads.upsert({ id: activeCrmLead.value.id, analise_ia: data })
  } catch (e) {
    erroAnalise.value = 'Erro ao analisar. Tente novamente.'
  } finally {
    analisando.value = false
  }
}
```

**Estado com erro** (`erroAnalise.value !== null`):
- Texto de erro em `--status-danger` (font-size 13px)
- Botão "Tentar novamente"

**Estado com análise salva** (`activeCrmLead.value.analise_ia !== null`):
- Barra de score: `<div>` com largura `score%`, cor: `--accent` se >70, `--status-warning` se ≥40, `--status-danger` se <40. Label: "Score: XX/100"
- Texto do resumo (font-size 13px, `--text-primary`)
- Lista de `positivos[]`: cada item com ícone CheckCircle SVG (`--accent`) + texto
- Lista de `atencao[]`: cada item com ícone AlertCircle SVG (`--status-warning`) + texto
- Rodapé: "Gerado em: " + `new Date(analise_ia.geradoEm).toLocaleString('pt-BR')` + botão "Re-analisar" (`.btn-ghost.btn-sm`)

`analisando` e `erroAnalise` são `ref` locais da view.

Requer nova coluna: `analise_ia jsonb DEFAULT NULL`.

---

## 6. Nova Edge Function — `analyze-lead`

**Arquivo:** `supabase/functions/analyze-lead/index.ts`

**Padrão:** idêntico às outras Edge Functions do projeto — valida JWT Supabase no header `Authorization`, usa `ANTHROPIC_API_KEY` como secret (configurado via `supabase secrets set ANTHROPIC_API_KEY=<chave>`).

**Model ID:** `claude-haiku-4-5-20251001`

**Payload recebido:**
```json
{
  "leadId": "uuid",
  "messages": [
    { "direcao": "recebido|enviado", "mensagem": "texto truncado em 500 chars", "data": "iso8601" }
  ]
}
```

**Prompt do sistema** (em português, contexto de negócio da Sano Lab):
```
Você é um assistente de vendas da Sano Lab, empresa que cria sites para pequenas empresas.
Pacotes: Essencial R$797, Profissional R$1.097, Completo R$1.397.
Analise a conversa abaixo e retorne APENAS um JSON válido, sem markdown, com os campos:
- score (integer 0-100): probabilidade de fechar negócio
- resumo (string, máximo 2 frases): avaliação geral do lead
- positivos (array de strings, máximo 4 itens): sinais positivos na conversa
- atencao (array de strings, máximo 4 itens): pontos de atenção ou objeções
- geradoEm (string ISO 8601): data/hora atual

Considere score alto (>70) quando o lead demonstra interesse claro, pergunta sobre preços, ou tem necessidade óbvia.
Considere score baixo (<40) quando há objeções fortes, desinteresse ou sem resposta.
```

**Resposta retornada ao frontend:**
```json
{ "score": 75, "resumo": "...", "positivos": ["..."], "atencao": ["..."], "geradoEm": "2026-03-26T..." }
```

**Tratamento de erro na Edge Function:** se a chamada à API Anthropic falhar, retornar HTTP 500 com `{ "error": "Falha na análise" }`. O frontend captura o `error` do `supabase.functions.invoke` e exibe mensagem amigável.

**Limite de mensagens:** o frontend já trunca para 50 mensagens de até 500 chars cada = máximo ~25.000 chars de contexto, dentro do limite do Haiku.

---

## 7. Novas colunas na tabela `leads`

| Coluna | Tipo | Default | Seção |
|--------|------|---------|-------|
| `anotacoes` | `text` | `NULL` | Anotações |
| `followup_obs` | `text` | `NULL` | Follow-up |
| `followup_count` | `integer` | `0` | Follow-up / Contato |
| `pacote` | `text` | `NULL` | Financeiro |
| `valor_contrato` | `numeric` | `NULL` | Financeiro |
| `parcelas` | `jsonb` | `'[]'` | Financeiro |
| `analise_ia` | `jsonb` | `NULL` | Análise IA |

**SQL de migração** (rodar no Supabase SQL Editor):
```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS anotacoes text,
  ADD COLUMN IF NOT EXISTS followup_obs text,
  ADD COLUMN IF NOT EXISTS followup_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pacote text,
  ADD COLUMN IF NOT EXISTS valor_contrato numeric,
  ADD COLUMN IF NOT EXISTS parcelas jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS analise_ia jsonb;
```

Nota: `followup_count` é incrementado apenas no frontend. Para um CRM single-user (Eduardo), a inconsistência por múltiplas abas abertas é aceitável e consciente.

---

## 8. Estado reativo adicionado à view

```js
const configModalOpen = ref(false)
const activeSection = ref('contato')
const analisando = ref(false)
const erroAnalise = ref(null)

// Lead completo do store (reativo — atualiza ao upsert)
const activeCrmLead = computed(() =>
  activeLead.value?.id
    ? leads.leads.find(l => l.id === activeLead.value.id) ?? null
    : null
)

// Estado local das seções
const followupDate = ref('')
const followupObs = ref('')
const parcelas = ref([])
const anotacoesText = ref('')

// Sincroniza estado local ao abrir modal ou trocar de seção
watch([configModalOpen, activeSection], () => {
  if (!configModalOpen.value || !activeCrmLead.value) return
  const l = activeCrmLead.value
  if (activeSection.value === 'followup') {
    followupDate.value = l.proximo_followup ? l.proximo_followup.slice(0, 16) : ''
    followupObs.value = l.followup_obs ?? ''
  }
  if (activeSection.value === 'financeiro') {
    parcelas.value = [...(l.parcelas ?? [])]
  }
  if (activeSection.value === 'anotacoes') {
    anotacoesText.value = l.anotacoes ?? ''
  }
})

watch(activeLead, () => {
  activeSection.value = 'contato'
  configModalOpen.value = false
})
```

---

## 9. Store `leads.js` — verificação de `select('*')`

Antes de implementar, verificar no `load()` atual do store se ele usa `select('*')`. Se sim, os novos campos são retornados automaticamente sem alterar o store. Se usa `select` com lista explícita de campos, adicionar os 7 novos campos à lista.

Store `wa.js` — **sem alterações**.
Store `fin.js` — **sem alterações**.

---

## 10. O que NÃO muda

- Sidebar de contatos (`sz-sidebar`) — sem alterações
- Layout de chat (`.sz-chat`, `.sz-messages`, `.sz-composer`) — sem alterações estruturais
- Composer, gravação de áudio, envio de arquivos, envio de mensagem — sem alterações
- `global.css` — sem adições (usar apenas classes já existentes)
- `AppLayout.vue`, `useAppInit.js`, outras views — sem alterações
