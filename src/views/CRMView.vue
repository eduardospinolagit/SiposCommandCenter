<template>
  <div class="page-layout">

    <div class="page-header">
      <div>
        <h1 class="page-title">CRM <span class="page-count">{{ leads.stats.total }} leads</span></h1>
        <p class="page-subtitle">Gerencie seu pipeline de vendas</p>
      </div>
      <div class="page-actions">
        <button
          class="btn btn-sm"
          :class="notifAtiva ? 'btn-notif-on' : 'btn-secondary'"
          :disabled="notifAtiva"
          @click="pedirNotificacao"
          :title="notifAtiva ? 'Notificações ativadas' : 'Ativar alertas de follow-up'"
        >
          <svg v-if="!notifAtiva" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {{ notifAtiva ? 'Alertas ativos' : 'Alertas' }}
        </button>
        <button class="btn btn-primary" @click="openNew()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo lead
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid kpi-grid--5">
      <div class="kpi-card"><span class="kpi-label">Total</span><span class="kpi-value" style="color:var(--status-info)">{{ leads.stats.total }}</span><span class="kpi-sub">leads</span></div>
      <div class="kpi-card"><span class="kpi-label">Negociando</span><span class="kpi-value kpi-value--warning">{{ leads.stats.negociando }}</span><span class="kpi-sub">demo + negoc.</span></div>
      <div class="kpi-card"><span class="kpi-label">Fechados</span><span class="kpi-value kpi-value--accent">{{ leads.stats.fechados }}</span><span class="kpi-sub">convertidos</span></div>
      <div class="kpi-card"><span class="kpi-label">Follow-up hoje<InfoTip text="Leads com data de retorno agendada para hoje ou que já venceram. Clique na aba Follow-up para ver a lista completa." /></span><span class="kpi-value kpi-value--danger">{{ leads.stats.fuHoje }}</span><span class="kpi-sub">pendentes</span></div>
      <div class="kpi-card"><span class="kpi-label">Pipeline<InfoTip text="Soma dos valores potenciais de todos os leads em negociação ativa. Representa a receita que pode entrar caso todos fechem." /></span><span class="kpi-value" style="color:var(--status-info)">{{ fmt(leads.stats.pipe) }}</span><span class="kpi-sub">potencial</span></div>
    </div>

    <!-- Sel bar -->
    <Transition name="sel-bar">
      <div v-if="selected.size > 0" class="sel-bar">
        <span class="sel-count">{{ selected.size }} selecionado{{ selected.size !== 1 ? 's' : '' }}</span>
        <select v-model="selEtapa" class="form-select" style="width:auto;font-size:.82rem;padding:.35rem .7rem">
          <option value="">Mover para...</option>
          <option v-for="e in ETAPAS" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="moverSelecionados">Mover</button>
        <button class="btn btn-danger btn-sm" @click="excluirSelecionados">Excluir</button>
        <button class="btn btn-ghost btn-sm" @click="selected = new Set()">Limpar</button>
      </div>
    </Transition>

    <!-- Toolbar: tabs + busca -->
    <div class="toolbar">
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'kanban' }" @click="changeTab('kanban')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Kanban
        </button>
        <button class="tab" :class="{ active: tab === 'tabela' }" @click="changeTab('tabela')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Tabela
        </button>
        <button class="tab" :class="{ active: tab === 'followup' }" @click="changeTab('followup')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Follow-up
          <span v-if="listaFollowUp.length" class="tab-badge tab-badge--orange">{{ listaFollowUp.length }}</span>
        </button>
        <button class="tab" :class="{ active: tab === 'relead' }" @click="changeTab('relead')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Relead
          <span v-if="listaRelead.length" class="tab-badge tab-badge--purple">{{ listaRelead.length }}</span>
        </button>
      </div>
      <div class="kb-search-box">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" class="kb-search-input" placeholder="Buscar lead..." />
        <button v-if="search" class="kb-search-clear" @click="search = ''">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- KANBAN -->
    <div v-if="tab === 'kanban'" class="kanban-board">
      <div v-for="e in ETAPAS" :key="e.id" class="kb-col"
        :class="{ 'drop-over': dragOver === e.id }"
        @dragover.prevent="dragOver = e.id"
        @dragleave="dragOver = null"
        @drop.prevent="onDrop(e.id)">
        <div class="kb-head">
          <div class="kb-title">
            <span class="kb-dot" :style="{ background: e.color }"></span>
            <span :style="{ color: e.color }">{{ e.label }}</span>
          </div>
          <span class="kb-count">{{ byEtapaFiltrado(e.id).length }}</span>
        </div>
        <div class="kb-cards">
          <div v-for="l in byEtapaFiltrado(e.id)" :key="l.id"
            class="kb-card" draggable="true"
            @dragstart="onDragStart(l)" @dragend="dragOver = null"
            @click="openLead(l.id)">
            <div class="kb-drag-handle">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            </div>
            <div class="kb-name">{{ l.nome }}</div>
            <div v-if="diasNaEtapa(l)" class="kb-etapa-tempo">{{ diasNaEtapa(l) }}</div>
            <div v-if="l.negocio" class="kb-negocio">{{ l.negocio }}</div>
            <div v-if="l.site_atual" class="kb-servico">{{ l.site_atual }}</div>
            <div v-if="l.notas" class="kb-notas">{{ l.notas.slice(0,80) }}{{ l.notas.length > 80 ? '...' : '' }}</div>
            <div class="kb-footer">
              <span class="kb-pri" :class="`pri-${l.prioridade}`">{{ l.prioridade }}</span>
              <span v-if="l.ultima_direcao" class="kb-interacao" :class="l.ultima_direcao === 'recebido' ? 'kb-interacao--in' : 'kb-interacao--out'"
                :title="l.ultima_direcao === 'recebido' ? 'Lead respondeu — você deve responder' : 'Você enviou — aguardando lead'">
                <svg v-if="l.ultima_direcao === 'recebido'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                <svg v-else width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                {{ l.ultima_direcao === 'recebido' ? 'Lead' : 'Você' }}
              </span>
            </div>
            <div v-if="work.leadsComWork.has(l.id)" class="kb-work-bar">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              Em execução
            </div>
            <div v-if="l.proximo_followup" class="kb-fu-bar">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {{ fmtDataHora(l.proximo_followup) }}
            </div>
            <div v-if="l.relead_data" class="kb-relead-bar">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              {{ fmtDataHora(l.relead_data) }}
            </div>
          </div>
          <button class="kb-add" @click="openNewEtapa(e.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar
          </button>
        </div>
      </div>
    </div>

    <!-- TABELA -->
    <div v-if="tab === 'tabela'" class="tabela-wrap">
      <div class="tabela-filters">
        <select v-model="filterEtapa" class="form-select" style="width:auto;font-size:.82rem">
          <option value="">Todas etapas</option>
          <option v-for="e in ETAPAS" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
        <select v-model="filterPri" class="form-select" style="width:auto;font-size:.82rem">
          <option value="">Todas prioridades</option>
          <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
        </select>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:36px"><input type="checkbox" class="cb" @change="toggleAll($event.target.checked)" /></th>
              <th class="th-sort" @click="toggleSort('nome')">Nome <span class="sort-icon">{{ sortKey==='nome'?(sortDir==='asc'?'↑':'↓'):'↕' }}</span></th>
              <th class="th-sort" @click="toggleSort('negocio')">Negócio <span class="sort-icon">{{ sortKey==='negocio'?(sortDir==='asc'?'↑':'↓'):'↕' }}</span></th>
              <th>Telefone</th>
              <th class="th-sort" @click="toggleSort('etapa')">Etapa <span class="sort-icon">{{ sortKey==='etapa'?(sortDir==='asc'?'↑':'↓'):'↕' }}</span></th>
              <th class="th-sort" @click="toggleSort('prioridade')">Prioridade <span class="sort-icon">{{ sortKey==='prioridade'?(sortDir==='asc'?'↑':'↓'):'↕' }}</span></th>
              <th class="th-sort" @click="toggleSort('proximo_followup')">Follow-up <span class="sort-icon">{{ sortKey==='proximo_followup'?(sortDir==='asc'?'↑':'↓'):'↕' }}</span></th>
              <th class="th-sort" @click="toggleSort('valor_estimado')" style="text-align:right">Valor <span class="sort-icon">{{ sortKey==='valor_estimado'?(sortDir==='asc'?'↑':'↓'):'↕' }}</span></th>
              <th style="width:36px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!listaFiltrada.length"><td colspan="9" style="text-align:center;color:var(--text-tertiary);padding:2rem;font-size:.875rem">Nenhum lead encontrado</td></tr>
            <tr v-for="l in listaFiltrada" :key="l.id" :class="{ 'row-sel': selected.has(l.id) }">
              <td @click.stop><input type="checkbox" class="cb" :checked="selected.has(l.id)" @change="toggleSel(l.id, $event.target.checked)" /></td>
              <!-- Células clicáveis copiam o valor -->
              <td class="td-copy" @click="copyText(l.nome)" title="Clique para copiar">{{ l.nome }}</td>
              <td class="td-copy text-muted" @click="copyText(l.negocio)" title="Clique para copiar">{{ l.negocio || '—' }}</td>
              <td><button class="wa-link" @click.stop="router.push('/slaczap?lead='+l.id)">{{ l.telefone }}</button></td>
              <td><span class="etapa-tag" :style="{ background: etapaColor(l.etapa)+'18', color: etapaColor(l.etapa) }">{{ etapaLabel(l.etapa) }}</span></td>
              <td><span class="kb-pri" :class="`pri-${l.prioridade}`">{{ l.prioridade }}</span></td>
              <td class="td-copy text-muted text-sm" @click="copyText(l.proximo_followup ? fmtDataHora(l.proximo_followup) : '')" title="Clique para copiar">{{ l.proximo_followup ? fmtDataHora(l.proximo_followup) : '—' }}</td>
              <td class="td-copy" style="text-align:right;font-weight:600;color:var(--accent)" @click="copyText(l.valor_estimado ? fmt(l.valor_estimado) : '')" title="Clique para copiar">{{ l.valor_estimado ? fmt(l.valor_estimado) : '—' }}</td>
              <td @click.stop><button class="btn btn-ghost btn-icon btn-sm" @click="openLead(l.id)" title="Editar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- FOLLOW-UP TAB -->
    <div v-if="tab === 'followup'" class="fu-wrap">
      <div v-if="!listaFollowUp.length" class="fu-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>Nenhum follow-up agendado</p>
        <span>Adicione datas de follow-up nos leads para vê-los aqui</span>
      </div>
      <div v-else class="fu-list">
        <div v-for="l in listaFollowUp" :key="l.id"
          class="fu-card" :class="{ 'fu-vencido': isFuVencido(l), 'fu-hoje': isFuHoje(l) }"
          @click="openLead(l.id)">
          <div class="fu-card-left">
            <div class="fu-datetime">
              <span class="fu-date">{{ fmtFuDate(l.proximo_followup) }}</span>
              <span class="fu-time">{{ fmtFuTime(l.proximo_followup) }}</span>
            </div>
            <div class="fu-status-dot" :class="{ 'dot-vencido': isFuVencido(l), 'dot-hoje': isFuHoje(l), 'dot-futuro': !isFuVencido(l) && !isFuHoje(l) }"></div>
          </div>
          <div class="fu-card-body">
            <div class="fu-nome">{{ l.nome }}</div>
            <div class="fu-neg">{{ l.negocio || l.categoria || '—' }}</div>
            <div class="fu-meta">
              <span class="etapa-tag" :style="{ background: etapaColor(l.etapa)+'18', color: etapaColor(l.etapa) }">{{ etapaLabel(l.etapa) }}</span>
              <span v-if="l.notas" class="fu-nota">{{ l.notas.slice(0, 60) }}{{ l.notas.length > 60 ? '...' : '' }}</span>
            </div>
          </div>
          <div class="fu-card-right">
            <button class="btn btn-primary btn-sm fu-concluido" @click.stop="concluirFollowUp(l)" title="Marcar follow-up como concluído">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Concluído
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" @click.stop="router.push('/slaczap?lead='+l.id)" title="SlacZap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" @click.stop="openLead(l.id)" title="Editar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- RELEAD TAB -->
    <div v-if="tab === 'relead'" class="fu-wrap">
      <div v-if="!listaRelead.length" class="fu-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        <p>Nenhum relead agendado</p>
        <span>Leads com interesse que precisam de uma nova abordagem</span>
      </div>
      <div v-else class="fu-list">
        <div v-for="l in listaRelead" :key="l.id"
          class="fu-card fu-relead"
          @click="openLead(l.id)">
          <div class="fu-card-left">
            <div class="fu-datetime">
              <span class="fu-date">{{ fmtFuDate(l.relead_data) }}</span>
              <span class="fu-time">{{ fmtFuTime(l.relead_data) }}</span>
            </div>
            <div class="fu-status-dot dot-purple"></div>
          </div>
          <div class="fu-card-body">
            <div class="fu-nome">{{ l.nome }}</div>
            <div class="fu-neg">{{ l.negocio || l.categoria || '—' }}</div>
            <div class="fu-meta">
              <span class="etapa-tag" :style="{ background: etapaColor(l.etapa)+'18', color: etapaColor(l.etapa) }">{{ etapaLabel(l.etapa) }}</span>
              <span v-if="l.notas" class="fu-nota">{{ l.notas.slice(0, 60) }}{{ l.notas.length > 60 ? '...' : '' }}</span>
            </div>
          </div>
          <div class="fu-card-right">
            <button class="btn btn-purple btn-sm fu-concluido" @click.stop="concluirRelead(l)" title="Marcar relead como concluído">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Concluído
            </button>
            <button class="btn btn-secondary btn-sm btn-icon" @click.stop="router.push('/slaczap?lead='+l.id)" title="SlacZap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" @click.stop="openLead(l.id)" title="Editar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>


  <!-- MODAL RELEAD: escolher data -->
  <Transition name="modal-fade">
    <div v-if="releadModal" class="modal-backdrop" @click.self="releadModal = null">
      <div class="relead-modal">
        <div class="card-modal-header">
          <div>
            <h3 class="card-modal-name">Agendar Relead</h3>
            <p class="card-modal-neg">{{ releadModal.nome }} — {{ releadModal.negocio || releadModal.categoria || '' }}</p>
          </div>
          <button class="btn btn-ghost btn-icon" @click="releadModal = null">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="card-modal-body">
          <p style="font-size:.8125rem;color:var(--text-tertiary);margin:0 0 1rem">
            Escolha quando abordar este lead novamente. Ele aparecerá na aba Relead no dia escolhido.
          </p>
          <div class="fu-datetime-input">
            <input v-model="releadDate" class="form-input" type="date" style="flex:1.4" />
            <input v-model="releadTime" class="form-input" type="time" style="flex:1" />
          </div>
          <!-- Atalhos rápidos -->
          <div class="relead-shortcuts">
            <button class="btn btn-ghost btn-sm" @click="setReleadShortcut(7)">1 semana</button>
            <button class="btn btn-ghost btn-sm" @click="setReleadShortcut(14)">2 semanas</button>
            <button class="btn btn-ghost btn-sm" @click="setReleadShortcut(30)">1 mês</button>
            <button class="btn btn-ghost btn-sm" @click="setReleadShortcut(90)">3 meses</button>
          </div>
        </div>
        <div class="card-modal-footer">
          <button class="btn btn-secondary" @click="releadModal = null">Cancelar</button>
          <button class="btn btn-purple" style="flex:1;justify-content:center" @click="confirmarRelead">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Agendar Relead
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- TOAST CÓPIA -->
  <Transition name="toast-anim">
    <div v-if="copyToast" class="copy-toast">✓ Copiado</div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLeadsStore, ETAPAS } from '@/stores/leads'
import { useWorkStore } from '@/stores/work'
import { useFinStore } from '@/stores/fin'
import { useSaving } from '@/composables/useSaving'
import { usePushNotifications } from '@/composables/usePushNotifications'
import InfoTip from '@/components/ui/InfoTip.vue'

const router = useRouter()
const route  = useRoute()

const leads = useLeadsStore()
const work  = useWorkStore()
const fin   = useFinStore()
const { run, toast } = useSaving()
const fmt = fin.fmt

const tab         = ref('kanban')
function changeTab(t) {
  const y = window.scrollY
  tab.value = t
  nextTick(() => {
    window.scrollTo(0, y)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo(0, y))
    })
  })
}
const search      = ref('')
const filterEtapa = ref('')
const filterPri   = ref('')
const selected    = ref(new Set())
const selEtapa    = ref('')
const sortKey     = ref('')
const sortDir     = ref('asc')

// Copy toast
const copyToast = ref(false)
let copyToastTimer = null
function copyText(text) {
  if (!text || text === '—') return
  navigator.clipboard?.writeText(text).then(() => {
    clearTimeout(copyToastTimer)
    copyToast.value = true
    copyToastTimer = setTimeout(() => { copyToast.value = false }, 1500)
  })
}

// Drag-and-drop
const dragItem = ref(null)
const dragOver = ref(null)
function onDragStart(lead) { dragItem.value = lead }
async function onDrop(etapaDestino) {
  dragOver.value = null
  if (!dragItem.value || dragItem.value.etapa === etapaDestino) return
  const lead = dragItem.value; dragItem.value = null
  const payload = { ...lead, etapa: etapaDestino, updated_at: new Date().toISOString() }
  await run(() => leads.upsert(payload), `Movido para ${etapaLabel(etapaDestino)} ✓`)
}

function openNew(etapa = 'contato') {
  leads.drawerLeadId = '__new__:' + etapa
}
function openNewEtapa(etapa) {
  leads.drawerLeadId = '__new__:' + etapa
}
function openLead(id) {
  leads.drawerLeadId = id
}

// Follow-up list
const listaFollowUp = computed(() => {
  return leads.leads
    .filter(l => l.proximo_followup && l.etapa !== 'perdido')
    .sort((a, b) => new Date(a.proximo_followup) - new Date(b.proximo_followup))
})
function isFuVencido(l) { return new Date(l.proximo_followup) < new Date() && !isFuHoje(l) }
function isFuHoje(l) {
  const d = new Date(l.proximo_followup)
  const h = new Date()
  return d.toDateString() === h.toDateString()
}
function fmtFuDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
}
function fmtFuTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  const h = dt.getHours(), m = dt.getMinutes()
  if (h === 0 && m === 0) return ''
  return dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
}

// Kanban filtrado
const leadsByEtapa = computed(() => {
  const q = search.value.toLowerCase()
  const map = {}
  for (const l of leads.leads) {
    if (q && !(l.nome+l.negocio+l.telefone+l.categoria).toLowerCase().includes(q)) continue
    if (!map[l.etapa]) map[l.etapa] = []
    map[l.etapa].push(l)
  }
  return map
})
function byEtapaFiltrado(etapa) { return leadsByEtapa.value[etapa] || [] }

// Tabela filtrada
const listaFiltrada = computed(() => {
  let lista = leads.leads
  if (search.value) {
    const q = search.value.toLowerCase()
    lista = lista.filter(l => (l.nome+l.negocio+l.telefone+l.categoria).toLowerCase().includes(q))
  }
  if (filterEtapa.value) lista = lista.filter(l => l.etapa === filterEtapa.value)
  if (filterPri.value)   lista = lista.filter(l => l.prioridade === filterPri.value)
  if (sortKey.value) {
    const key = sortKey.value, dir = sortDir.value === 'asc' ? 1 : -1
    lista = [...lista].sort((a,b) => {
      const va = a[key]??'', vb = b[key]??''
      if (typeof va === 'number') return (va-vb)*dir
      return String(va).localeCompare(String(vb),'pt-BR')*dir
    })
  }
  return lista
})
function toggleSort(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value==='asc'?'desc':'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}

const ETAPA_LABEL = { contato:'Contato', interesse:'Interesse', demo:'Demo enviada', negociacao:'Negociação', fechado:'Fechado', perdido:'Perdido' }
const ETAPA_COLOR = { contato:'#3b82f6', interesse:'#f59e0b', demo:'#8b5cf6', negociacao:'#f97316', fechado:'#22c55e', perdido:'#6b7280' }
function etapaLabel(e) { return ETAPA_LABEL[e] || e }
function etapaColor(e) { return ETAPA_COLOR[e] || '#6b7280' }
function diasNaEtapa(l) {
  const ref = l.etapa_since || l.updated_at || l.created_at
  if (!ref) return null
  const dias = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return '1 dia'
  return `${dias} dias`
}

function fmtDataHora(d) {
  if (!d) return '—'
  const dt = new Date(d)
  const h = dt.getHours(), m = dt.getMinutes()
  const date = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
  if (h === 0 && m === 0) return date
  return `${date} ${dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`
}

function toggleSel(id, checked) {
  if (checked) selected.value.add(id); else selected.value.delete(id)
  selected.value = new Set(selected.value)
}
function toggleAll(checked) {
  listaFiltrada.value.forEach(l => checked ? selected.value.add(l.id) : selected.value.delete(l.id))
  selected.value = new Set(selected.value)
}

async function moverSelecionados() {
  if (!selEtapa.value) { toast('Escolha uma etapa','err'); return }
  const ids = [...selected.value]
  await run(async () => {
    for (const id of ids) {
      const l = leads.getById(id)
      if (l) await leads.upsert({...l, etapa:selEtapa.value, updated_at:new Date().toISOString()})
    }
    selected.value.clear(); selEtapa.value = ''
  }, ids.length+' leads movidos ✓')
}

async function excluirSelecionados() {
  const ids = [...selected.value]
  if (!ids.length) return
  if (!confirm('Excluir '+ids.length+' lead(s)?')) return
  ids.forEach(id => leads.remove(id)); selected.value.clear()
  toast(ids.length+' removido(s) ✓','ok')
}

// ── Follow-up ──
async function concluirFollowUp(lead) {
  await run(() => leads.upsert({ ...lead, proximo_followup: null }), 'Follow-up concluído')
}

async function concluirRelead(lead) {
  await run(() => leads.upsert({ ...lead, relead_data: null }), 'Relead concluído')
}

// ── Relead ──
const releadModal = ref(null)
const releadDate  = ref('')
const releadTime  = ref('09:00')


function setReleadShortcut(days) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const pad = n => String(n).padStart(2, '0')
  releadDate.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

async function confirmarRelead() {
  if (!releadDate.value || !releadModal.value) { toast('Escolha uma data', 'err'); return }
  const iso = new Date(`${releadDate.value}T${releadTime.value}:00`).toISOString()
  const lead = releadModal.value
  const payload = { ...lead, relead_data: iso, updated_at: new Date().toISOString() }
  await run(() => leads.upsert(payload), `Relead agendado para ${fmtFuDate(iso)} ✓`)
  releadModal.value = null
  tab.value = 'relead'
}

const listaRelead = computed(() =>
  leads.leads
    .filter(l => l.relead_data)
    .sort((a, b) => new Date(a.relead_data) - new Date(b.relead_data))
)

// Estado das notificações
const notifAtiva = ref(false)

const { subscribe, getSubscriptionStatus } = usePushNotifications()

onMounted(async () => {
  const s = await getSubscriptionStatus()
  notifAtiva.value = s === 'granted'
  if (route.query.tab) tab.value = route.query.tab
  if (route.query.lead) openLead(route.query.lead)
})

watch(() => route.query.tab, (t) => { if (t) tab.value = t })

async function pedirNotificacao() {
  if (notifAtiva.value) return
  console.log('[DEBUG] pedirNotificacao chamado')
  const ok = await subscribe()
  if (ok) {
    notifAtiva.value = true
    toast('Notificações ativadas', 'ok')
  } else {
    toast('Permissão negada', 'error')
  }
}
</script>

<style scoped>
/* Sel bar */
.sel-bar{display:flex;align-items:center;gap:.625rem;flex-wrap:wrap;background:var(--accent-subtle);border:1px solid var(--accent);border-radius:var(--radius-lg);padding:.625rem 1rem;}
.sel-count{font-size:.82rem;font-weight:700;color:var(--accent);}
.sel-bar-enter-active,.sel-bar-leave-active{transition:all 180ms ease;}
.sel-bar-enter-from,.sel-bar-leave-to{opacity:0;transform:translateY(-6px);}

/* Toolbar */
.toolbar{display:flex;align-items:center;gap:.875rem;flex-wrap:wrap;position:sticky;top:0;z-index:10;background:var(--bg-base);padding:.5rem 0;margin:-.5rem 0;}
.tabs{display:flex;gap:.25rem;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:.25rem;}
.tab{display:flex;align-items:center;gap:.4rem;padding:.4rem .875rem;border-radius:var(--radius-md);background:transparent;border:none;font-family:var(--font-body);font-size:.82rem;font-weight:500;color:var(--text-tertiary);cursor:pointer;transition:background 100ms ease,color 100ms ease;position:relative;}
.tab.active{background:var(--accent);color:#fff;}
.tab:not(.active):hover{background:var(--bg-overlay);color:var(--text-primary);}
.tab-badge{position:absolute;top:2px;right:2px;background:var(--status-danger);color:#fff;font-size:.55rem;font-weight:700;padding:.1rem .35rem;border-radius:99px;line-height:1.4;}

/* Search */
.kb-search-box{flex:1;max-width:320px;display:flex;align-items:center;gap:.5rem;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-full);padding:.375rem .875rem;transition:border-color 150ms ease,box-shadow 150ms ease;}
.kb-search-box:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-subtle);}
.kb-search-box svg{flex-shrink:0;color:var(--text-tertiary);}
.kb-search-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--font-body);font-size:.875rem;color:var(--text-primary);}
.kb-search-input::placeholder{color:var(--text-tertiary);}
.kb-search-clear{display:flex;align-items:center;background:none;border:none;cursor:pointer;color:var(--text-tertiary);padding:0;}
.kb-search-clear:hover{color:var(--text-primary);}

/* Kanban */
.kanban-board{display:grid;grid-template-columns:repeat(6,1fr);gap:.75rem;min-height:420px;}
.kb-col{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:flex;flex-direction:column;overflow:hidden;min-width:0;transition:border-color 150ms ease,background 150ms ease;}
.kb-col.drop-over{border-color:var(--accent);background:var(--accent-subtle);}
.kb-head{display:flex;align-items:center;justify-content:space-between;padding:.625rem .75rem;border-bottom:1px solid var(--border-subtle);}
.kb-title{display:flex;align-items:center;gap:.375rem;font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}
.kb-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.kb-count{font-size:.68rem;background:var(--bg-overlay);color:var(--text-tertiary);padding:.1rem .4rem;border-radius:var(--radius-full);font-weight:600;}
.kb-cards{flex:1;padding:.5rem;display:flex;flex-direction:column;gap:.375rem;overflow-y:auto;}
.kb-card{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:.625rem .75rem;cursor:pointer;position:relative;transition:box-shadow 120ms ease,border-color 120ms ease,transform 120ms ease;}
.kb-card:hover{box-shadow:var(--shadow-md);border-color:var(--accent);transform:translateY(-1px);}
.kb-drag-handle{position:absolute;top:.5rem;right:.5rem;color:var(--text-tertiary);opacity:0;transition:opacity 100ms ease;cursor:grab;}
.kb-card:hover .kb-drag-handle{opacity:.5;}
.kb-name{font-size:.82rem;font-weight:600;color:var(--text-primary);margin-bottom:.1rem;}
.kb-etapa-tempo{font-size:.65rem;color:var(--text-tertiary);margin-bottom:.15rem;}
.kb-interacao{display:inline-flex;align-items:center;gap:.2rem;font-size:.62rem;font-weight:700;padding:.1rem .35rem;border-radius:99px;}
.kb-interacao--in{background:rgba(34,197,94,.12);color:var(--accent);}
.kb-interacao--out{background:rgba(136,136,136,.1);color:var(--text-tertiary);}
.kb-negocio{font-size:.7rem;color:var(--text-tertiary);margin-bottom:.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.kb-neg{font-size:.72rem;color:var(--text-tertiary);margin-bottom:.375rem;}
.kb-servico{font-size:.65rem;color:var(--status-info);margin-bottom:.375rem;}
.kb-footer{display:flex;align-items:center;justify-content:space-between;}
.kb-tel{font-size:.65rem;color:var(--text-tertiary);}
.kb-pri{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;}
.pri-alta{color:var(--status-danger);}.pri-media{color:var(--status-warning);}.pri-baixa{color:var(--status-info);}
.kb-fu{display:flex;align-items:center;gap:.25rem;font-size:.65rem;color:var(--status-warning);margin-top:.375rem;}
.kb-add{display:flex;align-items:center;justify-content:center;gap:.25rem;width:100%;padding:.4rem;background:transparent;border:1px dashed var(--border-default);border-radius:var(--radius-md);color:var(--text-tertiary);font-size:.75rem;cursor:pointer;font-family:var(--font-body);transition:border-color 120ms,color 120ms,background 120ms;}
.kb-add:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-subtle);}

/* Tabela */
.tabela-wrap{display:flex;flex-direction:column;gap:.75rem;}
.tabela-filters{display:flex;gap:.625rem;flex-wrap:wrap;align-items:center;}
.cb{accent-color:var(--accent);cursor:pointer;width:14px;height:14px;}
.row-sel td{background:var(--accent-subtle) !important;}
.wa-link{color:var(--accent);font-size:.82rem;background:none;border:none;padding:0;cursor:pointer;}
.td-copy{cursor:pointer;user-select:none;}
.td-copy:hover{color:var(--accent);text-decoration:underline dotted;}
.etapa-tag{display:inline-block;font-size:.7rem;font-weight:600;padding:.15rem .5rem;border-radius:var(--radius-full);text-transform:uppercase;letter-spacing:.03em;white-space:nowrap;}
.th-sort{cursor:pointer;user-select:none;white-space:nowrap;}
.th-sort:hover{color:var(--accent);}
.sort-icon{font-size:.65rem;color:var(--text-tertiary);margin-left:.2rem;}

/* Follow-up tab */
.fu-wrap{display:flex;flex-direction:column;gap:.625rem;}
.fu-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:3rem;color:var(--text-tertiary);text-align:center;}
.fu-empty svg{opacity:.3;}
.fu-empty p{font-size:.9375rem;font-weight:600;color:var(--text-secondary);margin:0;}
.fu-empty span{font-size:.8125rem;}
.fu-list{display:flex;flex-direction:column;gap:.5rem;}
.fu-card{display:flex;align-items:stretch;gap:1rem;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:.875rem 1rem;cursor:pointer;transition:box-shadow 120ms ease,border-color 120ms ease;}
.fu-card:hover{box-shadow:var(--shadow-md);border-color:var(--border-strong);}
.fu-vencido{border-color:rgba(239,68,68,.3);background:var(--status-danger-subtle);}
.fu-hoje{border-color:rgba(245,158,11,.35);background:var(--status-warning-subtle);}
.fu-card-left{display:flex;flex-direction:column;align-items:center;gap:.375rem;min-width:52px;padding-right:.75rem;border-right:1px solid var(--border-subtle);}
.fu-date{font-size:.8125rem;font-weight:700;color:var(--text-primary);text-align:center;white-space:nowrap;}
.fu-time{font-size:.7rem;color:var(--text-tertiary);font-weight:500;}
.fu-status-dot{width:8px;height:8px;border-radius:50%;}
.dot-vencido{background:var(--status-danger);}
.dot-hoje{background:var(--status-warning);}
.dot-futuro{background:var(--accent);}
.fu-card-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:.25rem;}
.fu-nome{font-size:.9rem;font-weight:700;color:var(--text-primary);}
.fu-neg{font-size:.8rem;color:var(--text-tertiary);}
.fu-meta{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.2rem;}
.fu-nota{font-size:.75rem;color:var(--text-tertiary);font-style:italic;}
.fu-card-right{display:flex;flex-direction:column;gap:.375rem;justify-content:center;flex-shrink:0;}
.fu-concluido{gap:.375rem;}

/* Relead modal — usa card-modal-* classes compartilhadas */
.card-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.25rem 1.25rem .875rem;}
.card-modal-name{font-size:1.125rem;font-weight:700;color:var(--text-primary);margin:0;}
.card-modal-neg{font-size:.8125rem;color:var(--text-tertiary);margin:.2rem 0 0;}
.card-modal-body{padding:.25rem 1.25rem 1rem;}
.card-modal-footer{display:flex;align-items:center;gap:.5rem;padding:.875rem 1.25rem;border-top:1px solid var(--border-default);}
.modal-fade-enter-active,.modal-fade-leave-active{transition:opacity 200ms ease;}
.modal-fade-enter-from,.modal-fade-leave-to{opacity:0;}

/* Copy toast */
.copy-toast{position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-full);padding:.375rem .875rem;font-size:.8rem;color:var(--accent);font-weight:600;box-shadow:var(--shadow-md);z-index:9999;pointer-events:none;}
.toast-anim-enter-active,.toast-anim-leave-active{transition:all 150ms ease;}
.toast-anim-enter-from,.toast-anim-leave-to{opacity:0;transform:translateX(-50%) translateY(6px);}

/* Follow-up datetime input */
.fu-datetime-input{display:flex;align-items:center;gap:.375rem;}

/* Kanban card notas */
.kb-notas{font-size:.7rem;color:var(--text-tertiary);margin-bottom:.375rem;line-height:1.4;font-style:italic;}

/* Faixa amarela de follow-up no card */
.kb-fu-bar{
  position:absolute;bottom:0;left:0;right:0;
  display:flex;align-items:center;gap:.3rem;
  font-size:.62rem;font-weight:600;
  color:#92400e;
  background:linear-gradient(135deg,#fbbf24,#f59e0b);
  padding:.25rem .6rem;
  border-radius:0 0 var(--radius-md) var(--radius-md);
}
.kb-card{padding-bottom:.625rem;}
.kb-card:has(.kb-fu-bar){padding-bottom:1.75rem;}
.kb-card:has(.kb-relead-bar){padding-bottom:1.75rem;}
.kb-card:has(.kb-work-bar){padding-bottom:1.75rem;}
.kb-card:has(.kb-fu-bar):has(.kb-relead-bar){padding-bottom:3.25rem;}
.kb-card:has(.kb-fu-bar):has(.kb-work-bar){padding-bottom:3.25rem;}
.kb-card:has(.kb-relead-bar):has(.kb-work-bar){padding-bottom:3.25rem;}
.kb-card:has(.kb-fu-bar):has(.kb-relead-bar):has(.kb-work-bar){padding-bottom:4.75rem;}

/* Barra azul de work no card */
.kb-work-bar{
  position:absolute;bottom:0;left:0;right:0;
  display:flex;align-items:center;gap:.3rem;
  font-size:.62rem;font-weight:600;
  color:#dbeafe;
  background:linear-gradient(135deg,#60a5fa,#3b82f6);
  padding:.25rem .6rem;
  border-radius:0 0 var(--radius-md) var(--radius-md);
}
/* Barra roxa de relead no card */
.kb-relead-bar{
  position:absolute;bottom:0;left:0;right:0;
  display:flex;align-items:center;gap:.3rem;
  font-size:.62rem;font-weight:600;
  color:#ede9fe;
  background:linear-gradient(135deg,#a78bfa,#8b5cf6);
  padding:.25rem .6rem;
  border-radius:0 0 var(--radius-md) var(--radius-md);
}
/* Empilhamento das barras */
.kb-card:has(.kb-fu-bar) .kb-relead-bar{bottom:1.5rem;border-radius:0;}
.kb-card:has(.kb-fu-bar) .kb-work-bar{bottom:1.5rem;border-radius:0;}
.kb-card:has(.kb-relead-bar) .kb-work-bar{bottom:1.5rem;border-radius:0;}
.kb-card:has(.kb-fu-bar):has(.kb-relead-bar) .kb-work-bar{bottom:3rem;border-radius:0;}
.kb-card:has(.kb-fu-bar):has(.kb-work-bar) .kb-relead-bar{bottom:3rem;border-radius:0;}

/* Tab badge roxo */
.tab-badge--purple{background:#8b5cf6;}
.tab-badge--orange{background:var(--status-warning);}

/* Botões novos */
.btn-warning{background:rgba(245,158,11,.15);color:#d97706;border:1px solid rgba(245,158,11,.35);}
.btn-warning:hover{background:rgba(245,158,11,.25);color:#b45309;}
.btn-purple{background:rgba(139,92,246,.15);color:#7c3aed;border:1px solid rgba(139,92,246,.35);}
.btn-purple:hover{background:rgba(139,92,246,.25);color:#6d28d9;}

/* Relead modal */
.relead-modal{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-xl,16px);box-shadow:var(--shadow-lg);width:100%;max-width:400px;overflow:hidden;}
.relead-shortcuts{display:flex;gap:.375rem;flex-wrap:wrap;margin-top:.75rem;}

/* Relead card */
.fu-relead{border-color:rgba(139,92,246,.25);}
.fu-relead:hover{border-color:rgba(139,92,246,.5);}
.dot-purple{background:#8b5cf6;}

/* Botão alertas ativo */
.btn-notif-on {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 1px solid var(--accent);
  cursor: default;
  opacity: 1;
}
.btn-notif-on:disabled { opacity: 1; cursor: default; }

@media(max-width:1200px){.kanban-board{grid-template-columns:repeat(3,1fr);}}
@media(max-width:768px){.kanban-board{grid-template-columns:repeat(2,1fr);}.fu-card{flex-wrap:wrap;}.card-modal-grid{grid-template-columns:1fr;}}
</style>
