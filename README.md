# SLAC — Sano Lab Advanced CRM (Vue 3 + Vite)

## Stack

- **Vue 3** (Composition API) — reatividade, componentes, sem bugs de DOM manual
- **Pinia** — estado global (leads, financeiro, mapa, auth)
- **Vue Router** — navegação SPA com auth guard
- **Vite** — build rápido, HMR, PWA
- **Supabase** — banco, auth, realtime (igual antes, sem mudança)
- **Vercel** — deploy (igual antes)

---

## Estrutura

```
src/
├── main.js                    # entry point
├── App.vue                    # toast + saving indicator globais
├── router/index.js            # rotas + auth guard
├── lib/supabase.js            # cliente Supabase
├── styles/global.css          # todo o CSS do sistema
│
├── stores/                    # Pinia — estado global
│   ├── auth.js                # login, logout, userName
│   ├── fin.js                 # financeiro, pagamentos, meta
│   ├── leads.js               # leads, conversas, stats
│   └── mapa.js                # mapa mental
│
├── composables/               # lógica reutilizável
│   ├── useAppInit.js          # carrega todos os dados ao entrar
│   ├── useRealtime.js         # Supabase Realtime + BroadcastChannel
│   └── useSaving.js           # indicador de salvamento + toast
│
├── components/layout/
│   └── AppLayout.vue          # sidebar + mobile nav + welcome modal
│
└── views/
    ├── LoginView.vue
    ├── DashboardView.vue
    ├── CRMView.vue            # Kanban + Drawer + Tabela
    ├── FinanceiroView.vue
    ├── RecorrenciasView.vue
    ├── MapaView.vue
    └── ProspeccaoView.vue     # CSV import + Modo Foco
```

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento (HMR ativo)
npm run dev

# 3. Build para produção
npm run build

# 4. Preview do build
npm run preview
```

Acesse: `http://localhost:5173`

---

## Deploy no Vercel

O `vercel.json` já está configurado para SPA routing.

```bash
# Via GitHub (recomendado)
# 1. Push para o branch vue3 no GitHub
# 2. Vercel detecta automaticamente como Vite
# 3. Deploy automático a cada push

# Ou via CLI
npx vercel --prod
```

**Configurações do Vercel:**
- Framework: Vite (detectado automático)
- Build Command: `npm run build`
- Output Directory: `dist`

---

## Ícones / PWA

Coloque seus ícones na pasta `public/icons/`:
- `icon-192.png`
- `icon-512.png`
- `favicon-96x96.png`
- `apple-touch-icon.png`
- `favicon.ico`

Gere em: https://realfavicongenerator.net usando o `logo.png` de fundo preto.

---

## Diferenças em relação ao HTML original

| Antes | Agora |
|---|---|
| DOM manual (`innerHTML`) | Templates declarativos Vue |
| Template literals aninhados | Componentes com dados reativos |
| Estado espalhado em variáveis | Pinia stores centralizados |
| `confirm()` nativo | Modal customizado (sem bloqueio) |
| `BroadcastChannel` frágil | Realtime Supabase + BroadcastChannel |
| Tudo em 1 arquivo HTML | Arquivos separados por responsabilidade |

---

## Bloco 2 (próxima sessão)

- Chat IA integrado (botão flutuante + modal)
- Modal de fechar negócio com cálculo de parcelas
- Serviços múltiplos no fechamento
- Notificações push (Supabase Edge Functions)

---

## Observações importantes

- A chave Supabase em `src/lib/supabase.js` é a `anon key` — segura para o client
- O `vercel.json` com rewrites é **obrigatório** para o Vue Router funcionar no Vercel
- Ícones precisam estar em `public/icons/` — **não** em `src/`
- O Vite não usa `node --check` — erros de sintaxe aparecem no terminal do `npm run dev`
