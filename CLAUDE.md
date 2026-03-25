# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# SLAC — Sano Lab Advanced CRM

## Projeto

CRM completo para gestão de leads, financeiro e prospecção da Sano Lab.

- **Stack:** Vue 3 + Vite + Pinia + Vue Router + Supabase
- **Deploy:** Vercel — sanolab-advanced-crm.vercel.app (auto-deploy ao push main)
- **Repo:** github.com/eduardospinolagit/SLAC (branch main)
- **Supabase project ID:** jqmnmudfxxdcjfradvcj
- **Local:** `C:\Users\Eduardo\Pictures\Sano Lab Sites\SLAC\v2\slac\SiposCommandCenter`

---

## Comandos

```bash
npm install       # Instalar dependências
npm run dev       # Servidor de desenvolvimento (http://localhost:5173, HMR)
npm run build     # Build de produção → dist/
npm run preview   # Preview do build de produção
```

Não há testes automatizados. Validação é feita manualmente no browser.

---

## Estrutura de arquivos

```
src/
  main.js                          # Cria app Vue + registra Pinia + Router + monta #app
  App.vue                          # Root: toast iOS pill (Teleport), saving indicator, auth.init(), session refresh
  router/index.js                  # Rotas: /login público + AppLayout com children autenticados
  styles/global.css                # TODOS os tokens CSS e componentes base compartilhados
  lib/
    supabase.js                    # Cliente Supabase singleton (persistSession, lock sem deadlock, realtime)
  utils/
    uid.js                         # uid() centralizado — retorna auth.user.id (usado pelos 3 stores)
  stores/
    auth.js                        # Sessão Supabase, userName, isLoggedIn, loading
    leads.js                       # Leads/CRM — ETAPAS kanban, stats, followUpsAlerta
    fin.js                         # Financeiro — transações, recorrências, meta, calcPeriodo(), fmt()
    mapa.js                        # Mapa mental — objetivos por categoria com status
  composables/
    useAppInit.js                  # Carrega todas as stores + Realtime Supabase + BroadcastChannel
    useTheme.js                    # Dark/light mode com localStorage e data-theme no documentElement
    useSaving.js                   # Wrapper run(fn, msg) com saving indicator + toast via inject
    useRealtime.js                 # Canal Supabase Realtime (legacy, não usado na UI)
    usePushNotifications.ts        # Web Push subscription
  components/
    layout/AppLayout.vue           # Sidebar (collapsible) + Topbar + Search + User menu + mobile nav + welcome modal
    crm/FecharNegocioModal.vue     # Modal de fechamento de negócio com cálculo de parcelas
  views/
    LoginView.vue                  # Form login — fora do AppLayout
    DashboardView.vue              # KPIs + charts + transações recentes
    CRMView.vue                    # Kanban leads + tabela + drawer + follow-up + relead
    FinanceiroView.vue             # Receitas/despesas + charts + drawer recorrências
    RecorrenciasView.vue           # Controle mensal de recorrências com drawers
    ProspeccaoView.vue             # Importar CSV + Modo Foco fullscreen + tabela
    MapaView.vue                   # Mapa mental — status de objetivos por categoria
```

---

## Arquitetura geral

```
Browser (SPA)
├── Vue 3 (Composition API + Pinia + Router)
│   ├── App.vue — Toast pill + Saving + onAuthStateChange + session refresh ao voltar aba
│   ├── AppLayout.vue — Sidebar + Topbar + mobile nav (pai de todas as views autenticadas)
│   ├── Views — Dashboard, CRM, Financeiro, Recorrências, Prospecção, Mapa
│   ├── Stores (Pinia) — auth, leads, fin, mapa
│   └── Composables — useAppInit, useTheme, useSaving
├── lib/supabase.js — cliente singleton
└── Service Worker (PWA + Web Push)
         ↓ HTTP/WebSocket
Supabase (jqmnmudfxxdcjfradvcj)
├── PostgreSQL — leads, financeiro, pagamentos, configuracoes, conversas, push_subscriptions
├── Auth — email/password, session em localStorage ('slac-auth')
├── Realtime — postgres_changes listener (leads, financeiro, configuracoes)
└── Edge Functions — notify-daily (push notifications)
```

---

## Fluxo de inicialização

1. `main.js` → cria app Vue, registra Pinia + Router, monta em `#app`
2. `App.vue` `onMounted` → `auth.init()` (carrega sessão + userName, **uma única vez**)
3. `App.vue` → listener `onAuthStateChange` do Supabase (redireciona login/logout)
4. Router auth guard → aguarda `auth.loading === false` antes de decidir rota
5. `AppLayout.vue` `onMounted` → `useAppInit()`:
   - `Promise.all([fin.load(), leads.load(), mapa.load()])`
   - Setup Realtime (postgres_changes em leads, financeiro, configuracoes)
   - Setup `BroadcastChannel('slac_crm')` para sync entre abas (prospecção envia `lead_novo`)

---

## Roteamento

- `/login` — público, **fora** do AppLayout
- `/` → AppLayout (componente pai com sidebar):
  - `/dashboard` → DashboardView
  - `/crm` → CRMView
  - `/financeiro` → FinanceiroView
  - `/recorrencias` → RecorrenciasView
  - `/prospeccao` → ProspeccaoView

**Regra:** todas as rotas autenticadas são `children` do AppLayout — nunca criar rota de nível raiz para views autenticadas.

---

## Stores Pinia

Todos os stores importam `uid()` de `@/utils/uid.js` para filtrar por `user_id`. **Nunca declarar a função localmente.**

### auth.js — `useAuthStore()`
- `user`, `userName`, `loading` (refs) / `isLoggedIn` (computed)
- `init()` — carrega sessão + userName uma vez ao montar App.vue
- `login(email, password)`, `logout()`, `saveUserName(nome)`
- **NÃO tem `onAuthStateChange` interno** — o listener fica só no `App.vue`

### leads.js — `useLeadsStore()`
- `leads[]`, `conversas[]`
- `load()`, `upsert(payload)`, `remove(id)`, `addConversa(leadId, canal, direcao, msg)`
- `stats` (computed) — total, fechados, negociando, fuHoje, pipe
- `followUpsAlerta` (computed) — leads com próximo_followup vencido
- `ETAPAS` (const) — `['contato', 'interesse', 'demo', 'negociacao', 'fechado', 'perdido']`

### fin.js — `useFinStore()`
- `fin[]` (transações), `pgto{}` (recorrências por chave mes-ano), `meta{}`
- `load()`, `upsert(tx)`, `savePgtoEntry(chave, p)`, `saveMeta(m)`
- `calcPeriodo(mes?)` — calcula rec, pend, sai, lucro por período
- `fmt(v)` — formata valor em R$
- `mRec` (computed) — array 12 meses receitas / `gastosData()` — agrupa despesas por categoria

### mapa.js — `useMapaStore()`
- `dados[]` — array 8 categorias com items (status: `ok/doing/nope/future`)
- `load()`, `save()`, `changeStatus(catId, itemId, status)`, `removeItem()`, `addItem()`
- `stats` (computed) — contadores ok/doing/nope/future/total

---

## Composables

### useAppInit.js
Chamado **uma única vez** por user_id no `AppLayout.onMounted`. Carrega todas as stores em paralelo, inicializa Realtime e BroadcastChannel.

### useSaving.js
Wrapper para operações com feedback visual:
- `run(fn, successMsg, errorMsg)` — mostra saving pill → executa → toast resultado
- `runSilent(fn)` — executa sem feedback visual

### useTheme.js
- `initTheme()` — lê localStorage ou `prefers-color-scheme`
- `toggleTheme()` — alterna e persiste no localStorage
- Aplica `data-theme="dark|light"` no `document.documentElement`

---

## Injeções globais (App.vue → provide → inject nas views)

```js
const toast = inject('toast')
toast('Mensagem de sucesso', 'ok')   // tipos: 'ok' | 'error' | 'warn'

const { showSaving, hideSaving } = inject('saving')
```

- Toast iOS pill usa `<Teleport to="body">` — não mover, não recriar
- App.vue já remove checkmarks do texto — passar mensagem limpa em `run(fn, 'mensagem')`
- Saving pill: máx 8s visível, auto-limpa se `hideSaving` não for chamado

### Sessão (App.vue)
- `handleVisibilityChange` — se aba ficou invisível > 2min: faz `refreshSession` ao voltar
- `refreshSession` **NÃO chama** `auth.init()` — apenas atualiza o token

---

## Padrão de interface (OBRIGATÓRIO em todas as views)

### Estrutura de página
```vue
<div class="page-layout">
  <div class="page-header">
    <div>
      <h1 class="page-title">Título</h1>
      <p class="page-subtitle">Subtítulo</p>
    </div>
    <div class="page-actions">
      <!-- botões -->
    </div>
  </div>
  <!-- conteúdo -->
</div>
```

### Classes globais (já no global.css — NUNCA redefinir nas views)
- `.page-layout` — padding 1.25rem 1.5rem, flex column, gap 1.25rem
- `.page-header`, `.page-title`, `.page-subtitle`, `.page-actions`
- `.kpi-grid`, `.kpi-grid--5`, `.kpi-grid--4`, `.kpi-grid--3`
- `.kpi-card`, `.kpi-label`, `.kpi-value`, `.kpi-sub`
- `.kpi-value--accent` (verde), `.kpi-value--warning` (amarelo), `.kpi-value--danger` (vermelho)
- `.sec-header`, `.sec-title`, `.card-header`, `.card-title`
- `.card`, `.card--flat`, `.card--accent`
- `.tx-list`, `.tx-row`, `.tx-date`, `.tx-val`
- `.card--followup`, `.followup-header`, `.followup-title`
- `.badge`, `.badge-accent`, `.badge-warning`, `.badge-danger`
- `.form-input`, `.form-select`, `.form-label`, `.form-group`, `.form-textarea`
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`
- `.table-wrapper` — tabela com scroll horizontal
- `.text-muted`, `.text-sm`

### Drawer (padrão CRM/Financeiro/Recorrências)
```vue
<div v-show="open" class="drawer-bg" @click="open=false"></div>
<div v-show="open" class="drawer">
  <div class="drawer-header">...</div>
  <div class="drawer-body">
    <div class="drawer-section">
      <p class="drawer-section-title">Seção</p>
      ...
    </div>
  </div>
  <div class="drawer-footer">...</div>
</div>
```
CSS do drawer fica em `<style scoped>` de cada view — copiar de `FinanceiroView.vue` ou `CRMView.vue`.

---

## Tokens de design

```css
/* Dark mode (padrão) */
--bg-base: #080808
--bg-surface: #0f0f0f
--bg-elevated: #161616
--bg-overlay: #1c1c1c
--accent: #22c55e              /* Verde Sano */
--accent-subtle: rgba(34,197,94,.08)
--status-warning: #e8a838
--status-danger: #e05555
--status-info: #5b8dee
--text-primary: #f0f0f0
--text-secondary: #888888
--text-tertiary: #555555
--font-body: 'Plus Jakarta Sans'  /* Google Fonts, carregado no index.html */
```

Light mode: backgrounds brancos/cinzas claros, texto preto/cinza escuro — tokens já no `global.css`.

---

## Tabelas Supabase

| Tabela | Uso |
|--------|-----|
| `leads` | CRM leads (tem coluna `relead_data timestamptz`) |
| `financeiro` | Transações (tipo, descricao, cat, val, data, st, rec, cli, obs) |
| `pagamentos` | Controle mensal de recorrências (chave = mes-ano) |
| `configuracoes` | Settings por chave: meta, mapa, user_nome, prospecção lista |
| `conversas` | Histórico de conversas de leads (canal, direcao, mensagem) |
| `push_subscriptions` | Web Push (endpoint, p256dh, auth) |

---

## PWA e Web Push

- Vite PWA plugin com Workbox (offline) — manifesto em `vite.config.js`
- Tema PWA: `#0a0a0a`, display standalone, ícones em `public/icons/`
- VAPID Public: `BOMZjUrFnkPqyKg6T2rHhXE8xTTNfR33jrgR7OmbNzD5aZSDE9zN2OjN7ELvhJYYsv0DQff7CUapkexxUxb2dPc`
- VAPID Private: `6TB0NVCMWfrqetxRu_lneqjy4DisatDaoydUoG9iLHM`
- VAPID Subject: `mailto:eduardospinolamkt@gmail.com`
- Edge Function: `supabase/functions/notify-daily/index.ts`

---

## CSS — Regras críticas

- **Nunca** redefinir `.page-layout`, `.kpi-grid`, `.page-title` e similares nas views — já estão no `global.css`
- Usar `<style scoped>` apenas para classes exclusivas da view
- Charts (Chart.js via CDN) usam `window.Chart.defaults.font.family = 'Plus Jakarta Sans'`
- Tema muda via atributo `data-theme` no `<html>` — os tokens CSS respondem a isso

---

## Contexto do dono

- Eduardo Spinola — Sano Lab
- Negócio: criação de sites para pequenas empresas (Google Maps → prospecção fria)
- Pacotes: Essencial R$797 / Profissional R$1.097 / Completo R$1.397
- Sempre tratar por "Eduardo" ou "Chefe"
