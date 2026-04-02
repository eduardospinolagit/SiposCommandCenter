<template>
  <div class="page-layout">

    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Visão geral do negócio</p>
      </div>
      <div class="page-actions">
        <select v-model="mesSel" class="form-select" style="width:auto;font-size:.85rem">
          <option value="">Todos os meses</option>
          <option v-for="m in mesesDisponiveis" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>
        <button class="btn btn-secondary" @click="exportar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </div>
    </div>

    <!-- Follow-up + Próximas ações -->
    <div class="top-row">

      <!-- Card follow-up -->
      <div class="fu-card">
        <div class="fu-card-head">
          <div class="fu-card-titulo">
            <span v-if="fuHoje.length || fuVencidos.length" class="fu-dot-pulse"></span>
            Follow-up
            <span v-if="fuHoje.length + fuVencidos.length > 0" class="fu-count">{{ fuHoje.length + fuVencidos.length }}</span>
          </div>
          <router-link to="/crm?tab=followup" class="fu-arrow-link" title="Ver follow-ups no CRM">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </router-link>
        </div>

        <div v-if="fuVencidos.length || fuHoje.length" class="fu-list">
          <!-- Vencidos primeiro -->
          <div v-for="l in fuVencidos" :key="'v'+l.id" class="fu-item fu-item--venc" @click="$router.push('/slaczap?lead='+l.id)">
            <div class="fu-tempo fu-tempo--venc">
              <span class="fu-hora-val">{{ fmtHora(l.proximo_followup) }}</span>
              <span class="fu-data-label">{{ fmtFuLabel(l.proximo_followup) }}</span>
            </div>
            <div class="fu-info">
              <span class="fu-nome">{{ l.nome }}</span>
              <span v-if="l.negocio" class="fu-neg">{{ l.negocio }}</span>
            </div>
          </div>
          <!-- Hoje -->
          <div v-for="l in fuHoje" :key="'h'+l.id" class="fu-item fu-item--hoje" @click="$router.push('/slaczap?lead='+l.id)">
            <div class="fu-tempo fu-tempo--hoje">
              <span class="fu-hora-val">{{ fmtHora(l.proximo_followup) }}</span>
              <span class="fu-data-label">hoje</span>
            </div>
            <div class="fu-info">
              <span class="fu-nome">{{ l.nome }}</span>
              <span v-if="l.negocio" class="fu-neg">{{ l.negocio }}</span>
            </div>
          </div>
        </div>
        <div v-else class="fu-vazio">Nenhum follow-up pendente</div>
      </div>

      <!-- Card próximas ações -->
      <div v-if="proximasAcoes.length" class="acoes-card">
        <div class="acoes-header">
          <div class="acoes-titulo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Agenda
          </div>
          <router-link to="/crm" class="fu-arrow-link" title="Ver no CRM">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </router-link>
        </div>
        <div class="acoes-list">
          <div v-for="l in proximasAcoes" :key="l.id" class="acao-row">
            <div class="acao-quando-col">
              <span class="acao-quando" :class="l._urgClass">{{ l._quando }}</span>
              <span class="acao-tag" :style="{ background: l._etapaColor + '18', color: l._etapaColor }">{{ l._acaoLabel }}</span>
            </div>
            <div class="acao-info">
              <span class="acao-nome">{{ l.nome }}</span>
              <span v-if="l.negocio" class="acao-neg">{{ l.negocio }}</span>
            </div>
            <span class="badge acao-etapa-badge" :style="{ background: l._etapaColor + '18', color: l._etapaColor }">{{ l._etapaLabel }}</span>
            <div class="acao-btns">
              <button class="btn btn-secondary btn-sm acao-btn-crm" title="Abrir no CRM" @click.stop="$router.push('/crm?lead='+l.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm acao-btn-crm" title="Opções SLAC" @click.stop="wa.slacOptsLead = l; wa.opcoesSLACOpen = true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button class="btn btn-secondary btn-sm acao-btn-wa" title="Abrir no SlacZap" @click.stop="$router.push('/slaczap?lead='+l.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- KPIs Financeiros -->
    <div class="kpi-grid dash-kpi-grid">
      <div class="kpi-card kpi-card--split">
        <div class="kpi-split-half">
          <span class="kpi-label">Recebido</span>
          <div class="kpi-split-row">
            <span class="kpi-value kpi-value--accent">{{ fmt(f.rec) }}</span>
            <span class="kpi-sub">recebido</span>
          </div>
        </div>
        <div class="kpi-split-divider"></div>
        <div class="kpi-split-half">
          <span class="kpi-label">A receber</span>
          <div class="kpi-split-row">
            <span class="kpi-value kpi-value--warning">{{ fmt(f.pend) }}</span>
            <span class="kpi-sub">pendente</span>
          </div>
        </div>
      </div>
      <div class="kpi-card kpi-card--lucro" :class="(f.rec + f.pend - f.sai) < 0 ? 'kpi-card--lucro-neg' : ''">
        <span class="kpi-label">Lucro Projetado<InfoTip text="Receita recebida + a receber, menos todas as despesas do período. É o lucro caso todos os pagamentos pendentes se concretizem." /></span>
        <span class="kpi-value kpi-value--white">{{ fmt(f.rec + f.pend - f.sai) }}</span>
        <div class="kpi-rec-detail">
          <span class="kpi-lucro-atual">Atual: {{ fmt(f.lucro) }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Despesas</span>
        <span class="kpi-value kpi-value--danger">{{ fmt(f.sai) }}</span>
        <span class="kpi-sub">total</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Clientes pagos</span>
        <span class="kpi-value" style="color:var(--status-info)">{{ f.clis }}</span>
        <span class="kpi-sub">no período</span>
      </div>
    </div>

    <!-- Gráficos -->
    <div class="charts-row">
      <div class="card chart-card">
        <h3 class="chart-title">Receita mensal</h3>
        <div class="chart-wrap"><canvas ref="chartRec"></canvas></div>
      </div>
      <div class="card chart-card">
        <h3 class="chart-title">Despesas por categoria</h3>
        <div class="chart-wrap"><canvas ref="chartGas"></canvas></div>
      </div>
    </div>


    <!-- Funil de Conversão -->
    <div class="sec-header funil-header" style="margin-bottom:0" @click="toggleFunil">
      <div style="display:flex;align-items:center;gap:.625rem;min-width:0">
        <h2 class="sec-title" style="flex-shrink:0">Prospecção<InfoTip text="Funil de conversão dos seus leads: quantos estão em cada etapa e qual % chegou ao fechamento. Ajuda a identificar onde os negócios travam." /></h2>
        <span class="funil-taxa-geral" style="flex-shrink:0" :class="funnelStats.taxaGeral >= 10 ? 'funil-taxa--ok' : funnelStats.taxaGeral >= 5 ? 'funil-taxa--warn' : 'funil-taxa--bad'">
          {{ funnelStats.taxaGeral }}% conversão
        </span>
        <span class="text-muted text-sm" style="flex-shrink:0">
          {{ funnelStats.total }} leads · {{ funnelStats.perdido }} perdidos
        </span>
      </div>
      <svg class="funil-chevron" :class="{ 'funil-chevron--open': funilOpen }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <div v-show="funilOpen" class="funil-card">
      <!-- Etapas do funil -->
      <div class="funil-etapas">
        <div v-for="(e, i) in funnelStats.etapas" :key="e.id" class="funil-etapa-wrap">
          <div class="funil-row">
            <div class="funil-label-col">
              <span class="funil-dot" :style="{ background: e.color }"></span>
              <span class="funil-label">{{ e.label }}</span>
            </div>
            <div class="funil-bar-col">
              <div class="funil-bar-track">
                <div class="funil-bar-fill" :style="{ width: e.barWidth + '%', background: e.color }"></div>
              </div>
            </div>
            <div class="funil-nums-col">
              <span class="funil-count">{{ e.reached }}</span>
              <span class="funil-count-sub">{{ e.count }} aqui</span>
            </div>
          </div>
          <!-- Seta de conversão (entre etapas) -->
          <div v-if="i < funnelStats.etapas.length - 1" class="funil-conv-row">
            <div class="funil-conv-line"></div>
            <span class="funil-conv-rate" :class="e.rateClass">
              ↓ {{ funnelStats.etapas[i + 1].convRate }}% avançaram
            </span>
            <div class="funil-conv-line"></div>
          </div>
        </div>
      </div>

      <!-- Rodapé com métricas extras -->
      <div class="funil-footer">
        <div class="funil-footer-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          <span>{{ funnelStats.perdido }} perdidos</span>
        </div>
        <div class="funil-footer-sep"></div>
        <div class="funil-footer-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>Pipeline: <strong>{{ fmt(leads.stats.pipe) }}</strong></span>
        </div>
        <div class="funil-footer-sep"></div>
        <div class="funil-footer-item" :class="leads.stats.fuHoje > 0 ? 'funil-footer-item--warn' : ''">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{{ leads.stats.fuHoje }} follow-up{{ leads.stats.fuHoje !== 1 ? 's' : '' }} hoje</span>
        </div>
        <div v-if="fuVencidos.length" class="funil-footer-sep"></div>
        <div v-if="fuVencidos.length" class="funil-footer-item funil-footer-item--danger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{{ fuVencidos.length }} vencido{{ fuVencidos.length !== 1 ? 's' : '' }}</span>
        </div>
        <template v-if="tempoMedioFechamento !== null">
          <div class="funil-footer-sep"></div>
          <div class="funil-footer-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Fechamento médio: <strong>{{ tempoMedioFechamento === 0 ? '< 1 dia' : tempoMedioFechamento + (tempoMedioFechamento === 1 ? ' dia' : ' dias') }}</strong></span>
          </div>
        </template>
      </div>
    </div>

    <!-- Card IA Conversão -->
    <div class="ai-conv-card">
      <!-- Header -->
      <div class="ai-conv-header">
        <div class="ai-conv-title-row">
          <div class="ai-conv-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" style="fill:var(--accent)"/></svg>
          </div>
          <span class="ai-conv-title">Análise de conversão</span>
          <span class="ai-conv-badge">IA</span>
        </div>
        <div class="ai-conv-actions">
          <span v-if="aiConvTs" class="ai-conv-ts">{{ aiConvTs }}</span>
          <button class="btn btn-ghost btn-sm ai-conv-btn" @click="analisarConversao" :disabled="aiConvLoading">
            <svg v-if="!aiConvLoading" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="ai-conv-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
            {{ aiConvLoading ? 'Analisando...' : (aiConvData ? 'Reanalisar' : 'Analisar agora') }}
          </button>
        </div>
      </div>

      <!-- Erro -->
      <div v-if="aiConvError && !aiConvLoading" class="ai-conv-empty ai-conv-empty--error">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--status-danger)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>{{ aiConvError }}</p>
      </div>
      <!-- Vazio -->
      <div v-else-if="!aiConvData && !aiConvLoading" class="ai-conv-empty">
        <p>Clique em <strong>Analisar agora</strong> para gerar uma análise inteligente do seu funil de vendas.</p>
      </div>

      <!-- Loading skeleton -->
      <div v-else-if="aiConvLoading && !aiConvData" class="ai-conv-skeleton">
        <div class="ai-skel-score"></div>
        <div class="ai-skel-lines">
          <div class="ai-skel-line ai-skel-line--lg"></div>
          <div class="ai-skel-line"></div>
          <div class="ai-skel-line ai-skel-line--sm"></div>
        </div>
      </div>

      <!-- Resultado -->
      <div v-else-if="aiConvData" class="ai-conv-body">
        <!-- Score -->
        <div class="ai-conv-score-wrap">
          <div class="ai-conv-score" :class="aiConvScoreClass">
            <svg class="ai-conv-ring" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg-elevated)" stroke-width="4"/>
              <circle cx="28" cy="28" r="24" fill="none" :stroke="aiConvRingColor" stroke-width="4"
                stroke-linecap="round" stroke-dasharray="150.796"
                :stroke-dashoffset="150.796 * (1 - aiConvData.score / 100)"
                transform="rotate(-90 28 28)" style="transition:stroke-dashoffset .8s ease"/>
            </svg>
            <span class="ai-conv-score-num">{{ aiConvData.score }}</span>
          </div>
          <div class="ai-conv-score-info">
            <span class="ai-conv-label" :class="aiConvScoreClass">{{ aiConvData.label }}</span>
            <span class="ai-conv-label-sub">saúde do funil</span>
          </div>
        </div>

        <!-- Insights -->
        <div class="ai-conv-insights">
          <div v-for="(ins, i) in aiConvData.insights" :key="i" class="ai-conv-insight" :class="'ai-conv-insight--'+ins.tipo">
            <span class="ai-conv-insight-dot"></span>
            <span class="ai-conv-insight-txt">{{ ins.texto }}</span>
          </div>
        </div>

        <!-- Recomendação funil -->
        <div class="ai-conv-rec">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>{{ aiConvData.recomendacao }}</span>
        </div>

        <!-- Análise do script -->
        <div v-if="aiConvData.script" class="ai-script-section">
          <div class="ai-script-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>Script de vendas</span>
            <span class="ai-script-score" :class="aiScriptScoreClass">{{ aiConvData.script.score }}/100</span>
          </div>
          <div class="ai-script-items">
            <div v-for="(item, i) in aiConvData.script.pontos_fortes" :key="'f'+i" class="ai-conv-insight ai-conv-insight--positivo">
              <span class="ai-conv-insight-dot"></span>
              <span class="ai-conv-insight-txt">{{ item }}</span>
            </div>
            <div v-for="(item, i) in aiConvData.script.pontos_fracos" :key="'w'+i" class="ai-conv-insight ai-conv-insight--negativo">
              <span class="ai-conv-insight-dot"></span>
              <span class="ai-conv-insight-txt">{{ item }}</span>
            </div>
          </div>
          <div class="ai-conv-rec" style="margin-top:.25rem">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>{{ aiConvData.script.sugestao }}</span>
          </div>
        </div>
        <div v-else-if="aiConvData && !aiConvData.script" class="ai-script-sem">
          Script não configurado —
          <router-link to="/configuracoes" class="ai-script-link">configure em Configurações</router-link>
        </div>

        <!-- Análise de nichos -->
        <div v-if="aiConvData.nichos?.length" class="ai-nichos-section">
          <div class="ai-script-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
            <span>Nichos</span>
          </div>
          <div class="ai-nichos-list">
            <div v-for="n in aiConvData.nichos" :key="n.nome" class="ai-nicho-row" :class="'ai-nicho--'+n.status">
              <div class="ai-nicho-left">
                <span class="ai-nicho-dot"></span>
                <span class="ai-nicho-nome">{{ n.nome }}</span>
              </div>
              <div class="ai-nicho-right">
                <span class="ai-nicho-taxa">{{ n.taxa }}%</span>
                <span class="ai-nicho-sub">{{ n.total }} lead{{ n.total !== 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>
          <div v-if="aiConvData.nichos_insight" class="ai-conv-rec" style="margin-top:.25rem">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>{{ aiConvData.nichos_insight }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Últimas transações -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Últimas transações</h3>
        <router-link to="/financeiro"><button class="btn btn-ghost btn-sm">Ver todas →</button></router-link>
      </div>
      <div class="tx-list">
        <div v-if="!fin.fin.length" class="tx-empty">Nenhuma transação ainda</div>
        <div v-for="t in fin.fin.slice(0,5)" :key="t.id" class="tx-row">
          <div class="tx-date">
            <span class="tx-day">{{ fmtDay(t.data) }}</span>
            <span class="tx-month">{{ fmtMonth(t.data) }}</span>
          </div>
          <div class="tx-info">
            <span class="tx-desc">{{ t.desc }}</span>
            <span v-if="t.cli || t.cliente" class="tx-client text-muted">{{ t.cli || t.cliente }}</span>
          </div>
          <span class="badge" :class="t.tipo==='entrada'?(t.st==='pendente'?'badge-warning':'badge-accent'):'badge-danger'">
            {{ t.tipo==='entrada'?(t.st==='pendente'?'Pendente':'Entrada'):'Saída' }}
          </span>
          <span class="tx-val" :style="{ color: t.tipo==='entrada'?'var(--accent)':'var(--status-danger)' }">
            {{ t.tipo==='entrada'?'+':'-' }}{{ fmt(t.val) }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import { useFinStore } from '@/stores/fin'
import { useLeadsStore } from '@/stores/leads'
import { useWaStore } from '@/stores/wa'
import { useTheme } from '@/composables/useTheme'
import { sb } from '@/lib/supabase'
import InfoTip from '@/components/ui/InfoTip.vue'

const toast = inject('toast')

const fin   = useFinStore()
const leads = useLeadsStore()
const wa    = useWaStore()
const fmt   = fin.fmt
const { theme } = useTheme()

// ── Análise de Conversão IA ──
const AI_CONV_KEY   = 'slac-ai-conv'
const aiConvLoading = ref(false)
const aiConvData    = ref(null)
const aiConvTs      = ref('')
const aiConvError   = ref('')

// Carrega do localStorage na inicialização
;(() => {
  try {
    const saved = localStorage.getItem(AI_CONV_KEY)
    if (saved) {
      const { data, ts } = JSON.parse(saved)
      aiConvData.value = data
      aiConvTs.value   = ts
    }
  } catch {}
})()

function _aiConvSavedDate() {
  try {
    const saved = localStorage.getItem(AI_CONV_KEY)
    if (!saved) return null
    return JSON.parse(saved).savedDate || null
  } catch { return null }
}

function checkAutoUpdate() {
  const hoje = new Date()
  const hora  = hoje.getHours()
  const todayStr = hoje.toISOString().split('T')[0]
  const lastDate = _aiConvSavedDate()
  // Só dispara de manhã (7h–11h) e se não analisou hoje ainda
  if (hora >= 7 && hora < 11 && lastDate !== todayStr) {
    analisarConversao()
  }
}

const aiConvScoreClass = computed(() => {
  if (!aiConvData.value) return ''
  const s = aiConvData.value.score
  if (s >= 75) return 'ai-score--otimo'
  if (s >= 50) return 'ai-score--bom'
  if (s >= 30) return 'ai-score--regular'
  return 'ai-score--critico'
})

const aiScriptScoreClass = computed(() => {
  const s = aiConvData.value?.script?.score || 0
  if (s >= 75) return 'ai-score--otimo'
  if (s >= 50) return 'ai-score--bom'
  return 'ai-score--regular'
})

const aiConvRingColor = computed(() => {
  if (!aiConvData.value) return '#22c55e'
  const s = aiConvData.value.score
  if (s >= 75) return '#22c55e'
  if (s >= 50) return '#e8a838'
  if (s >= 30) return '#e05555'
  return '#e05555'
})

async function analisarConversao() {
  if (aiConvLoading.value) return
  aiConvLoading.value = true
  aiConvError.value   = ''
  try {
    const etapas = { contato: 0, interesse: 0, demo: 0, negociacao: 0, fechado: 0, perdido: 0 }
    leads.leads.forEach(l => { if (etapas[l.etapa] !== undefined) etapas[l.etapa]++ })

    const now = new Date()
    const month = now.getMonth()
    const rec6 = fin.mRec.slice(Math.max(0, month - 5), month + 1)

    const fAtual = fin.calcPeriodo(mesSel.value)

    // Agrupa leads por categoria/nicho
    const nichoMap = {}
    leads.leads.forEach(l => {
      const nicho = (l.categoria || l.negocio || '').trim()
      if (!nicho) return
      if (!nichoMap[nicho]) nichoMap[nicho] = { total: 0, fechados: 0, perdidos: 0, negociando: 0 }
      nichoMap[nicho].total++
      if (l.etapa === 'fechado')   nichoMap[nicho].fechados++
      if (l.etapa === 'perdido')   nichoMap[nicho].perdidos++
      if (l.etapa === 'demo' || l.etapa === 'negociacao') nichoMap[nicho].negociando++
    })
    const nichos = Object.entries(nichoMap)
      .filter(([, v]) => v.total >= 2)
      .map(([nome, v]) => ({ nome, ...v, taxa: Math.round(v.fechados / v.total * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)

    // Carrega script diretamente do Supabase para garantir dado atualizado
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    let scriptBase = ''
    try {
      const { data: scriptRow } = await sb
        .from('configuracoes').select('valor')
        .eq('user_id', auth.user.id).eq('chave', 'script_base').maybeSingle()
      scriptBase = scriptRow?.valor?.texto || ''
    } catch {}

    // Usa fetch direto para ter controle total sobre o erro
    const { data: { session } } = await sb.auth.getSession()
    const token = session?.access_token || ''
    const resp = await fetch('https://jqmnmudfxxdcjfradvcj.supabase.co/functions/v1/analisar-conversao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbW5tdWRmeHhkY2pmcmFkdmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDAxNTMsImV4cCI6MjA4OTYxNjE1M30.LKZz_djPhIc_PvdLxAAhLaV-BZxX70nGup-qODIDEF4',
      },
      body: JSON.stringify({
        leads: {
          total:      leads.stats.total,
          por_etapa:  etapas,
          fu_vencidos: leads.followUpsAlerta.length,
          pipeline:   leads.stats.pipe,
        },
        financeiro: {
          receita:   fAtual.rec,
          pendente:  fAtual.pend,
          despesas:  fAtual.sai,
          lucro:     fAtual.lucro,
          clientes:  fAtual.clis,
          rec6,
        },
        scriptBase,
        nichos,
      }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`HTTP ${resp.status}: ${text}`)
    }
    const data = await resp.json()
    if (data?.error) throw new Error(data.error)
    const saveAt    = new Date()
    const ts        = saveAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    const savedDate = saveAt.toISOString().split('T')[0]
    aiConvData.value = data
    aiConvTs.value   = ts
    localStorage.setItem(AI_CONV_KEY, JSON.stringify({ data, ts, savedDate }))
  } catch (e) {
    console.error('[analisar-conversao]', e)
    aiConvError.value = String(e?.message || e)
    toast?.('Erro na análise de conversão: ' + aiConvError.value, 'error')
  } finally {
    aiConvLoading.value = false
  }
}

// ── Tempo médio de fechamento ──
const tempoMedioFechamento = computed(() => {
  const fechados = leads.leads.filter(l =>
    l.etapa === 'fechado' && l.created_at && l.updated_at
  )
  if (!fechados.length) return null
  const total = fechados.reduce((sum, l) => {
    const dias = (new Date(l.updated_at) - new Date(l.created_at)) / 86400000
    return sum + Math.max(0, dias)
  }, 0)
  return Math.round(total / fechados.length)
})

// ── Funil de conversão ──
const FUNIL_ETAPAS = [
  { id: 'contato',    label: 'Contato',    color: '#3b82f6' },
  { id: 'interesse',  label: 'Interesse',  color: '#f59e0b' },
  { id: 'demo',       label: 'Demo',       color: '#8b5cf6' },
  { id: 'negociacao', label: 'Negociação', color: '#f97316' },
  { id: 'fechado',    label: 'Fechado',    color: '#22c55e' },
]

const funnelStats = computed(() => {
  const counts = { contato: 0, interesse: 0, demo: 0, negociacao: 0, fechado: 0, perdido: 0 }
  leads.leads.forEach(l => { if (counts[l.etapa] !== undefined) counts[l.etapa]++ })
  const total = leads.leads.length

  // reached[i] = leads nessa etapa + todas as posteriores (funil acumulado)
  const reached = FUNIL_ETAPAS.map((_, i) =>
    FUNIL_ETAPAS.slice(i).reduce((s, e) => s + counts[e.id], 0)
  )

  const etapas = FUNIL_ETAPAS.map((e, i) => {
    const prev      = i === 0 ? total : reached[i - 1]
    const convRate  = prev > 0 ? Math.round(reached[i] / prev * 100) : 0
    const barWidth  = total > 0 ? Math.round(reached[i] / total * 100) : 0
    const rateClass = convRate >= 50 ? 'rate--ok' : convRate >= 25 ? 'rate--warn' : 'rate--bad'
    return { ...e, count: counts[e.id], reached: reached[i], convRate, barWidth, rateClass }
  })

  const taxaGeral = total > 0 ? Math.round(counts.fechado / total * 100) : 0
  return { etapas, total, perdido: counts.perdido, taxaGeral }
})

// mesSel começa vazio — mostra todos os meses sem resetar ao voltar
const funilOpen = ref(localStorage.getItem('slac-funil-open') !== 'false')
function toggleFunil() {
  funilOpen.value = !funilOpen.value
  localStorage.setItem('slac-funil-open', funilOpen.value)
}

const mesSel   = ref('')
const chartRec = ref(null)
const chartGas = ref(null)
let charts = {}

const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ETAPA_LABEL = { contato:'Contato', interesse:'Interesse', demo:'Demo', negociacao:'Negociação', fechado:'Fechado', perdido:'Perdido' }
const CHART_FONT  = "'Sora', 'Helvetica Neue', Arial, sans-serif"

const mesesDisponiveis = computed(() => {
  const ms = [...new Set(fin.fin.map(t => t.data?.substring(0,7)).filter(Boolean))].sort().reverse()
  return ms.map(m => {
    const [y, mo] = m.split('-')
    return { val: m, label: MESES[parseInt(mo)-1] + ' ' + y }
  })
})

// f usa mesSel — string vazia = todos os meses (não filtra)
const f = computed(() => fin.calcPeriodo(mesSel.value))

const fuHoje = computed(() => {
  const hoje = new Date().toDateString()
  return leads.leads.filter(l => {
    if (!l.proximo_followup || l.etapa === 'fechado' || l.etapa === 'perdido') return false
    return new Date(l.proximo_followup).toDateString() === hoje
  }).sort((a, b) => new Date(a.proximo_followup) - new Date(b.proximo_followup))
})

const fuVencidos = computed(() => {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return leads.leads.filter(l => {
    if (!l.proximo_followup || l.etapa === 'fechado' || l.etapa === 'perdido') return false
    const d = new Date(l.proximo_followup)
    d.setHours(0, 0, 0, 0)
    if (d >= hoje) return false          // hoje ou futuro — não é vencido
    if (wa.isFuAutoActive(l)) return false // automático — não exibir
    return true
  }).sort((a, b) => new Date(a.proximo_followup) - new Date(b.proximo_followup))
})

const ETAPA_COLOR = { contato:'#3b82f6', interesse:'#f59e0b', demo:'#8b5cf6', negociacao:'#f97316', fechado:'#22c55e', perdido:'#555' }
const ETAPA_LBL   = { contato:'Contato', interesse:'Interesse', demo:'Demo', negociacao:'Negociação', fechado:'Fechado', perdido:'Perdido' }
const ETAPA_ACAO  = { contato:'Fazer contato', interesse:'Acompanhar', demo:'Apresentar demo', negociacao:'Fechar negócio', fechado:'Concluído', perdido:'Perdido' }

const proximasAcoes = computed(() => {
  const agora = new Date()
  const inicioHoje = new Date(); inicioHoje.setHours(0,0,0,0)
  const em7dias = new Date(inicioHoje); em7dias.setDate(em7dias.getDate() + 7)

  return leads.leads
    .filter(l => {
      if (!l.proximo_followup || l.etapa === 'fechado' || l.etapa === 'perdido') return false
      const d = new Date(l.proximo_followup)
      return d <= em7dias  // vencidos + hoje + próximos 7 dias
    })
    .sort((a, b) => new Date(a.proximo_followup) - new Date(b.proximo_followup))
    .slice(0, 5)
    .map(l => {
      const d    = new Date(l.proximo_followup)
      const dias = Math.floor((d - inicioHoje) / 86400000)
      let quando, urgClass
      if (dias < 0) {
        const n = Math.abs(dias)
        quando   = n === 1 ? 'ontem' : `há ${n} dias`
        urgClass = 'acao-quando--venc'
      } else if (dias === 0) {
        quando   = 'hoje ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
        urgClass = 'acao-quando--hoje'
      } else if (dias === 1) {
        quando   = 'amanhã'
        urgClass = 'acao-quando--breve'
      } else {
        quando   = `em ${dias} dias`
        urgClass = 'acao-quando--futuro'
      }
      return {
        ...l,
        _quando:      quando,
        _urgClass:    urgClass,
        _etapaLabel:  ETAPA_LBL[l.etapa]  || l.etapa,
        _etapaColor:  ETAPA_COLOR[l.etapa] || '#888',
        _acaoLabel:   ETAPA_ACAO[l.etapa]  || 'Follow-up',
      }
    })
})

function fmtVencido(d) {
  if (!d) return '—'
  const dias = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (dias === 1) return 'ontem'
  if (dias <= 6) return `há ${dias} dias`
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function etapaLabel(e) { return ETAPA_LABEL[e] || e }
function fmtData(d)    { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function fmtHora(d)    { if (!d) return '—'; return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function fmtFuData(d)  { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
function fmtFuLabel(d) {
  if (!d) return '—'
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1)
  const dia = new Date(d); dia.setHours(0,0,0,0)
  if (dia.getTime() === hoje.getTime())   return 'hoje'
  if (dia.getTime() === amanha.getTime()) return 'amanhã'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function safePercent(v, t) { return !t ? 0 : Math.round(v / t * 100) }

function fmtDay(d)   { if (!d) return '--'; return d.split('-')[2] || '--' }
function fmtMonth(d) { if (!d) return ''; const mo = parseInt(d.split('-')[1]) - 1; return MESES[mo] || '' }

function chartColors() {
  const dark = theme.value === 'dark'
  return {
    grid:   dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    tick:   dark ? '#555' : '#9ca3af',
    legend: dark ? '#777' : '#6b7280',
  }
}

function renderCharts() {
  if (!window.Chart) return
  window.Chart.defaults.font.family = CHART_FONT
  window.Chart.defaults.font.size   = 11
  nextTick(() => {
    const c = chartColors()
    if (chartRec.value) {
      if (charts.rec) charts.rec.destroy()
      charts.rec = new window.Chart(chartRec.value, {
        type: 'bar',
        data: { labels: MESES, datasets: [{ label:'Receita', data:fin.mRec, backgroundColor:'rgba(34,197,94,0.2)', borderColor:'#22c55e', borderWidth:2, borderRadius:6, borderSkipped:false }] },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ labels:{ color:c.legend, boxWidth:10, font:{ size:11, family:CHART_FONT } } } },
          scales:{
            x:{ grid:{ color:c.grid }, ticks:{ color:c.tick, font:{ size:10, family:CHART_FONT } } },
            y:{ grid:{ color:c.grid }, ticks:{ color:c.tick, font:{ size:10, family:CHART_FONT }, callback:v=>'R$'+v } }
          }
        }
      })
    }
    if (chartGas.value) {
      if (charts.gas) charts.gas.destroy()
      const gd = fin.gastosData()
      charts.gas = new window.Chart(chartGas.value, {
        type: 'doughnut',
        data: { labels:gd.labels, datasets:[{ data:gd.vals, backgroundColor:['rgba(224,85,85,.7)','rgba(232,168,56,.7)','rgba(91,141,238,.7)','rgba(139,92,246,.7)','rgba(34,197,94,.7)','rgba(20,184,166,.7)'], borderWidth:0, hoverOffset:6 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:c.legend, boxWidth:10, font:{ size:11, family:CHART_FONT }, padding:14 } } } }
      })
    }
  })
}

function exportar() {
  const rows = [['Data','Descrição','Categoria','Cliente','Tipo','Valor']]
  fin.fin.forEach(t => rows.push([t.data||'',t.desc||'',t.categoria||'',t.cli||t.cliente||'',t.tipo||'',t.val||0]))
  const csv = rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `slac-financeiro-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
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
  checkAutoUpdate()
})
onUnmounted(() => { Object.values(charts).forEach(c => c?.destroy()) })
watch(() => fin.fin.length, renderCharts)
watch(theme, renderCharts)
</script>

<style scoped>
/* Charts — exclusivo do Dashboard */
.charts-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; min-width:0; }
.chart-card { display:flex; flex-direction:column; gap:.875rem; min-width:0; }
.chart-title { font-size:.9375rem; font-weight:700; color:var(--text-primary); }
.chart-wrap  { height:200px; position:relative; min-width:0; }

@media (max-width:900px) { .charts-row { grid-template-columns:1fr; } }

/* ── Análise de Conversão IA ── */
.ai-conv-card {
  border-radius: var(--radius-lg);
  border: 1px solid rgba(34,197,94,.25);
  background: linear-gradient(135deg, rgba(34,197,94,.06) 0%, var(--bg-surface) 60%);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: .875rem;
}
.ai-conv-header {
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
}
.ai-conv-title-row {
  display: flex; align-items: center; gap: .5rem;
}
.ai-conv-icon {
  width: 26px; height: 26px; border-radius: 7px;
  background: var(--accent-subtle);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent); flex-shrink: 0;
}
.ai-conv-title {
  font-size: .875rem; font-weight: 700; color: var(--text-primary);
}
.ai-conv-badge {
  font-size: .6rem; font-weight: 800; letter-spacing: .08em;
  background: var(--accent-subtle); color: var(--accent);
  border-radius: 4px; padding: .1rem .35rem;
}
.ai-conv-actions {
  display: flex; align-items: center; gap: .625rem;
}
.ai-conv-ts {
  font-size: .72rem; color: var(--text-tertiary);
}
.ai-conv-btn { gap: .375rem; }
.ai-conv-spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.ai-conv-empty {
  font-size: .8125rem; color: var(--text-secondary);
  padding: .25rem 0;
}
.ai-conv-empty strong { color: var(--text-primary); }
.ai-conv-empty--error { display: flex; align-items: flex-start; gap: .4rem; color: var(--status-danger); }

/* Skeleton */
.ai-conv-skeleton { display: flex; gap: 1rem; align-items: center; padding: .25rem 0; }
.ai-skel-score {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--bg-elevated); flex-shrink: 0;
  animation: skel-pulse 1.4s ease-in-out infinite;
}
.ai-skel-lines { display: flex; flex-direction: column; gap: .5rem; flex: 1; }
.ai-skel-line {
  height: 10px; border-radius: 6px;
  background: var(--bg-elevated);
  animation: skel-pulse 1.4s ease-in-out infinite;
  width: 70%;
}
.ai-skel-line--lg { width: 90%; height: 14px; }
.ai-skel-line--sm { width: 50%; }
@keyframes skel-pulse {
  0%,100% { opacity: .4; }
  50%      { opacity: .8; }
}

/* Body */
.ai-conv-body { display: flex; flex-direction: column; gap: .75rem; }
.ai-conv-score-wrap { display: flex; align-items: center; gap: .875rem; }
.ai-conv-score {
  position: relative; width: 56px; height: 56px; flex-shrink: 0;
}
.ai-conv-ring { width: 56px; height: 56px; }
.ai-conv-score-num {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 800;
  color: var(--text-primary);
}
.ai-conv-score-info { display: flex; flex-direction: column; gap: .125rem; }
.ai-conv-label {
  font-size: 1rem; font-weight: 800;
}
.ai-score--otimo  .ai-conv-score-num,
.ai-conv-label.ai-score--otimo  { color: var(--accent); }
.ai-score--bom    .ai-conv-score-num,
.ai-conv-label.ai-score--bom    { color: var(--status-warning); }
.ai-score--regular .ai-conv-score-num,
.ai-conv-label.ai-score--regular { color: var(--status-danger); }
.ai-score--critico .ai-conv-score-num,
.ai-conv-label.ai-score--critico { color: var(--status-danger); }

.ai-conv-label-sub { font-size: .72rem; color: var(--text-tertiary); }

/* Insights */
.ai-conv-insights { display: flex; flex-direction: column; gap: .375rem; }
.ai-conv-insight {
  display: flex; align-items: flex-start; gap: .5rem;
  font-size: .8125rem; color: var(--text-secondary);
  padding: .3125rem .625rem; border-radius: 7px;
}
.ai-conv-insight--positivo { background: rgba(34,197,94,.06); }
.ai-conv-insight--atencao  { background: rgba(232,168,56,.06); }
.ai-conv-insight--negativo { background: rgba(224,85,85,.06); }
.ai-conv-insight-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 4px;
}
.ai-conv-insight--positivo .ai-conv-insight-dot { background: var(--accent); }
.ai-conv-insight--atencao  .ai-conv-insight-dot { background: var(--status-warning); }
.ai-conv-insight--negativo .ai-conv-insight-dot { background: var(--status-danger); }
.ai-conv-insight-txt { line-height: 1.4; }

/* Script */
.ai-script-section {
  display: flex; flex-direction: column; gap: .5rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-script-header {
  display: flex; align-items: center; gap: .4rem;
  font-size: .75rem; font-weight: 700; color: var(--text-secondary);
}
.ai-script-score {
  margin-left: auto; font-size: .72rem; font-weight: 800;
  padding: .1rem .4rem; border-radius: 99px;
}
.ai-script-score.ai-score--otimo  { background: rgba(34,197,94,.12);  color: var(--accent); }
.ai-script-score.ai-score--bom    { background: rgba(232,168,56,.12); color: var(--status-warning); }
.ai-script-score.ai-score--regular{ background: rgba(224,85,85,.12);  color: var(--status-danger); }
.ai-script-items { display: flex; flex-direction: column; gap: .3rem; }
/* Nichos */
.ai-nichos-section {
  display: flex; flex-direction: column; gap: .5rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-nichos-list { display: flex; flex-direction: column; gap: .25rem; }
.ai-nicho-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: .3rem .625rem; border-radius: 7px; gap: .75rem;
}
.ai-nicho--otimo    { background: rgba(34,197,94,.06); }
.ai-nicho--bom      { background: rgba(34,197,94,.04); }
.ai-nicho--regular  { background: rgba(232,168,56,.05); }
.ai-nicho--fraco    { background: rgba(224,85,85,.05); }
.ai-nicho-left { display: flex; align-items: center; gap: .45rem; min-width: 0; }
.ai-nicho-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.ai-nicho--otimo   .ai-nicho-dot { background: var(--accent); }
.ai-nicho--bom     .ai-nicho-dot { background: var(--accent); opacity: .6; }
.ai-nicho--regular .ai-nicho-dot { background: var(--status-warning); }
.ai-nicho--fraco   .ai-nicho-dot { background: var(--status-danger); }
.ai-nicho-nome { font-size: .8125rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ai-nicho-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.ai-nicho-taxa { font-size: .8125rem; font-weight: 700; }
.ai-nicho--otimo   .ai-nicho-taxa { color: var(--accent); }
.ai-nicho--bom     .ai-nicho-taxa { color: var(--accent); }
.ai-nicho--regular .ai-nicho-taxa { color: var(--status-warning); }
.ai-nicho--fraco   .ai-nicho-taxa { color: var(--status-danger); }
.ai-nicho-sub { font-size: .7rem; color: var(--text-tertiary); }

.ai-script-sem {
  font-size: .75rem; color: var(--text-tertiary);
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-script-link { color: var(--accent); text-decoration: underline; }

/* Recomendação */
.ai-conv-rec {
  display: flex; align-items: flex-start; gap: .5rem;
  font-size: .8rem; color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle);
  padding-top: .75rem;
}
.ai-conv-rec svg { color: var(--accent); margin-top: 1px; }

/* ── Funil de Conversão ── */
.funil-header {
  cursor: pointer;
  border-radius: var(--radius-lg);
  padding: .375rem .5rem;
  margin: 0 -.5rem;
  transition: background 120ms ease;
  user-select: none;
}
.funil-header:hover { background: var(--bg-elevated); }


.funil-chevron {
  color: var(--text-tertiary);
  transition: transform 200ms ease;
  flex-shrink: 0;
}
.funil-chevron--open { transform: rotate(180deg); }

.funil-taxa-geral {
  font-size: .7rem; font-weight: 700; border-radius: 99px;
  padding: .2rem .65rem; letter-spacing: .02em;
}
.funil-taxa--ok   { background: rgba(34,197,94,.12);  color: var(--accent); }
.funil-taxa--warn { background: rgba(232,168,56,.12); color: var(--status-warning); }
.funil-taxa--bad  { background: rgba(224,85,85,.12);  color: var(--status-danger); }

.funil-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  padding: 1rem 1.25rem;
}
.funil-etapas { display: flex; flex-direction: column; }
.funil-etapa-wrap { display: flex; flex-direction: column; }

.funil-row {
  display: grid;
  grid-template-columns: 130px 1fr 80px;
  align-items: center;
  gap: .75rem;
  padding: .45rem 0;
}
.funil-label-col { display: flex; align-items: center; gap: .5rem; }
.funil-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.funil-label { font-size: .8125rem; font-weight: 600; color: var(--text-primary); }

.funil-bar-col { min-width: 0; }
.funil-bar-track {
  height: 8px; border-radius: 99px;
  background: var(--bg-elevated);
  overflow: hidden;
}
.funil-bar-fill {
  height: 100%; border-radius: 99px;
  transition: width .6s ease;
  opacity: .85;
}

.funil-nums-col { display: flex; flex-direction: column; align-items: flex-end; gap: .05rem; }
.funil-count { font-size: .875rem; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.funil-count-sub { font-size: .65rem; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

.funil-conv-row {
  display: flex; align-items: center; gap: .5rem;
  padding: .1rem 0 .1rem 4px;
}
.funil-conv-line { flex: 1; height: 1px; background: var(--bg-elevated); }
.funil-conv-rate {
  font-size: .7rem; font-weight: 700; white-space: nowrap;
  padding: .15rem .5rem; border-radius: 99px;
}
.rate--ok   { background: rgba(34,197,94,.1);  color: var(--accent); }
.rate--warn { background: rgba(232,168,56,.1); color: var(--status-warning); }
.rate--bad  { background: rgba(224,85,85,.1);  color: var(--status-danger); }

.funil-footer {
  display: flex; align-items: center; gap: .625rem; flex-wrap: wrap;
  border-top: 1px solid var(--bg-elevated);
  margin-top: .75rem; padding-top: .75rem;
}
.funil-footer-item {
  display: flex; align-items: center; gap: .375rem;
  font-size: .78rem; color: var(--text-secondary);
}
.funil-footer-item svg { flex-shrink: 0; opacity: .6; }
.funil-footer-item--warn  { color: var(--status-warning); }
.funil-footer-item--warn svg { opacity: 1; }
.funil-footer-item--danger { color: var(--status-danger); }
.funil-footer-item--danger svg { opacity: 1; }
.funil-footer-sep { width: 1px; height: 14px; background: var(--bg-elevated); flex-shrink: 0; }

@media (max-width: 600px) {
  .funil-row { grid-template-columns: 100px 1fr 64px; gap: .5rem; }
}

/* ── Layout top row ── */
.top-row {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 760px) {
  .top-row { grid-template-columns: 1fr; }
}

/* ── Card Follow-up ── */
.fu-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  padding: .875rem 1rem;
  display: flex; flex-direction: column; gap: .6rem;
}
.fu-card-head {
  display: flex; align-items: center; justify-content: space-between;
}
.fu-card-titulo {
  display: flex; align-items: center; gap: .45rem;
  font-size: .875rem; font-weight: 700; color: var(--text-primary);
}
.fu-count {
  font-size: .7rem; font-weight: 700;
  background: var(--status-warning); color: #000;
  border-radius: 99px; padding: .1rem .45rem; line-height: 1.4;
}
.fu-dot-pulse {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--status-warning);
  box-shadow: 0 0 0 0 rgba(232,168,56,.6);
  animation: fu-pulse 1.6s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes fu-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(232,168,56,.6); }
  70%  { box-shadow: 0 0 0 6px rgba(232,168,56,0); }
  100% { box-shadow: 0 0 0 0 rgba(232,168,56,0); }
}
.fu-list { display: flex; flex-direction: column; gap: .2rem; }
.fu-item {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  gap: .5rem;
  padding: .4rem .45rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 100ms ease;
}
.fu-item--venc:hover { background: rgba(224,85,85,.06); }
.fu-item--hoje:hover { background: rgba(232,168,56,.06); }
.fu-tempo {
  display: flex; flex-direction: column; align-items: center; gap: .05rem;
  text-align: center; white-space: nowrap;
}
.fu-hora-val {
  font-size: .72rem; font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.fu-data-label {
  font-size: .62rem; font-weight: 600;
  opacity: .75;
}
.fu-tempo--venc .fu-hora-val,
.fu-tempo--venc .fu-data-label { color: var(--status-danger); }
.fu-tempo--hoje .fu-hora-val,
.fu-tempo--hoje .fu-data-label { color: var(--status-warning); }
.fu-info { display: flex; flex-direction: column; gap: .05rem; min-width: 0; }
.fu-nome { font-size: .8125rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-neg  { font-size: .7rem; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fu-arrow-link {
  color: var(--text-tertiary); opacity: .5;
  display: flex; align-items: center;
  transition: opacity 120ms ease, color 120ms ease;
}
.fu-arrow-link:hover { opacity: 1; color: var(--accent); }
.fu-vazio { font-size: .8rem; color: var(--text-tertiary); padding: .25rem 0; }

/* ── KPI grid dashboard ── */
.dash-kpi-grid { grid-template-columns: 2fr 1fr 1fr 1fr; }
@media (max-width: 960px) { .dash-kpi-grid { grid-template-columns: 1fr 1fr 1fr; } }
@media (max-width: 640px) { .dash-kpi-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 420px) { .dash-kpi-grid { grid-template-columns: 1fr; } }

/* ── Split card ── */
.kpi-card--split { flex-direction: row; align-items: stretch; padding: 0; gap: 0; }
.kpi-split-half { display: flex; flex-direction: column; justify-content: center; gap: .25rem; flex: 1; padding: .875rem 1.1rem; min-width: 0; }
.kpi-split-row { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
.kpi-split-divider { width: 1px; background: var(--border-subtle); flex-shrink: 0; margin: .75rem 0; }
[data-theme="light"] .kpi-split-divider { background: var(--border-default); }

/* ── KPI Lucro destacado ── */
.kpi-card--lucro { background: var(--accent); border-color: var(--accent); }
.kpi-card--lucro-neg { background: var(--status-danger); border-color: var(--status-danger); }
.kpi-card--lucro .kpi-label { color: rgba(255,255,255,.7); }
.kpi-value--white { color: #fff !important; }
.kpi-rec-detail { display: flex; align-items: center; gap: .3rem; flex-wrap: wrap; margin-top: .15rem; }
.kpi-lucro-atual { font-size: .7rem; font-weight: 500; color: rgba(255,255,255,.65); }

[data-theme="light"] .kpi-card--lucro .kpi-label { color: rgba(0,0,0,.55); }
[data-theme="light"] .kpi-value--white { color: #fff !important; }
[data-theme="light"] .kpi-lucro-atual { color: rgba(0,0,0,.45); }

/* ── Próximas ações ── */
.acoes-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  padding: .875rem 1rem;
  display: flex; flex-direction: column; gap: .6rem;
}
.acoes-header {
  display: flex; align-items: center; justify-content: space-between;
}
.acoes-titulo {
  display: flex; align-items: center; gap: .4rem;
  font-size: .8rem; font-weight: 700; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: .04em;
}
.acoes-titulo svg { color: var(--text-secondary); flex-shrink: 0; }
.acoes-list { display: flex; flex-direction: column; gap: .25rem; }

.acao-row {
  display: grid;
  grid-template-columns: minmax(95px, auto) 1fr auto auto;
  align-items: center;
  gap: .35rem;
  padding: .28rem .35rem;
  border-radius: 7px;
  transition: background 100ms ease;
}
.acao-row:hover { background: var(--bg-elevated); }

.acao-quando-col { display: flex; flex-direction: column; gap: .2rem; }
.acao-quando {
  font-size: .68rem; font-weight: 700;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.acao-quando--venc  { color: var(--status-danger); }
.acao-quando--hoje  { color: var(--status-warning); }
.acao-quando--breve { color: var(--status-info); }
.acao-quando--futuro { color: var(--text-tertiary); }

.acao-info { display: flex; flex-direction: column; gap: .05rem; min-width: 0; }
.acao-nome { font-size: .775rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acao-neg  { font-size: .675rem; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.acao-tag {
  font-size: .65rem; font-weight: 700; white-space: nowrap;
  padding: .12rem .45rem; border-radius: 99px;
  width: fit-content;
}
.acao-etapa-badge { font-size: .65rem; padding: .15rem .45rem; white-space: nowrap; border-radius: 99px; }

.acao-btns { display: flex; align-items: center; gap: .25rem; flex-shrink: 0; }
.acao-btn-crm {
  color: var(--text-secondary); opacity: .55; padding: .3rem .45rem;
  transition: opacity 120ms ease;
}
.acao-btn-crm:hover { opacity: 1; color: var(--accent); }
.acao-btn-wa {
  color: #25d366; opacity: .55; padding: .3rem .45rem;
  transition: opacity 120ms ease;
}
.acao-btn-wa:hover { opacity: 1; }

@media (max-width: 600px) {
  .acao-row { grid-template-columns: 72px 1fr auto; }
  .acao-etapa-badge { display: none; }
}

</style>
