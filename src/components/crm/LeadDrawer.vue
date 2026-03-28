<template>
  <!-- Backdrop -->
  <div v-show="isOpen" class="drawer-bg" @click="close"></div>

  <!-- Drawer -->
  <div v-show="isOpen" class="drawer">
    <!-- Header -->
    <div class="drawer-header">
      <h3 class="drawer-title">{{ isNewLead ? 'Novo Lead' : (drawerLead?.nome || 'Lead') }}</h3>
      <button class="btn btn-ghost btn-icon" @click="close">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Tabs: apenas Dados quando novo lead -->
    <div class="drawer-tabs">
      <button class="drawer-tab" :class="{ active: drawerTab === 'dados' }" @click="drawerTab = 'dados'">Dados</button>
      <template v-if="!isNewLead">
        <button class="drawer-tab" :class="{ active: drawerTab === 'followup' }" @click="drawerTab = 'followup'">
          Follow-up
          <span v-if="drawerLead && wa.isFuAutoActive(drawerLead)" class="drawer-tab-dot"></span>
        </button>
        <button class="drawer-tab" :class="{ active: drawerTab === 'financeiro' }" @click="drawerTab = 'financeiro'">Financeiro</button>
        <button class="drawer-tab" :class="{ active: drawerTab === 'ia' }" @click="drawerTab = 'ia'">
          IA
          <span v-if="drawerLead && (wa.isSdrActive(drawerLead) || wa.isFuAutoActive(drawerLead))" class="drawer-tab-dot"></span>
        </button>
        <button class="drawer-tab" :class="{ active: drawerTab === 'historico' }" @click="drawerTab = 'historico'">Timeline</button>
      </template>
    </div>

    <div class="drawer-body">

      <!-- ── ABA DADOS ── -->
      <div v-show="drawerTab === 'dados'">
        <div class="drawer-section">
          <p class="drawer-section-title">Informações</p>
          <div class="form-group"><label class="form-label">Nome *</label><input v-model="form.nome" class="form-input" placeholder="Nome do responsável" /></div>
          <div class="form-group"><label class="form-label">Negócio</label><input v-model="form.negocio" class="form-input" placeholder="Ex: Salão da Maria" /></div>
          <div class="form-group"><label class="form-label">Telefone *</label><input v-model="form.telefone" class="form-input" placeholder="(47) 99999-9999" /></div>
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <select v-model="form.categoria" class="form-select">
              <option value="">Selecionar...</option>
              <option>Academia</option><option>Salão de Beleza</option><option>Clínica</option>
              <option>Restaurante</option><option>Pet Shop</option><option>Oficina Mecânica</option>
              <option>Confecção</option><option>Advocacia</option><option>Personal Trainer</option><option>Outro</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Cidade</label><input v-model="form.cidade" class="form-input" placeholder="Ex: Brusque/SC" /></div>
          <div class="form-group"><label class="form-label">Instagram</label><input v-model="form.instagram" class="form-input" placeholder="@perfil" /></div>
        </div>
        <div class="drawer-section">
          <p class="drawer-section-title">Funil</p>
          <div class="form-group">
            <label class="form-label">Serviço de interesse</label>
            <select v-model="form.site_atual" class="form-select">
              <option value="">Selecionar...</option>
              <option>Site Essencial</option><option>Site Profissional</option><option>Site Completo</option>
              <option>Google Meu Negócio</option><option>Tráfego Pago</option>
              <option>Automação WhatsApp</option><option>Manutenção</option><option>Pacote Completo</option><option>Outro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Etapa</label>
            <select v-model="form.etapa" class="form-select">
              <option v-for="e in ETAPAS" :key="e.id" :value="e.id">{{ e.label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select v-model="form.prioridade" class="form-select">
              <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
            </select>
          </div>
        </div>
        <div class="drawer-section">
          <p class="drawer-section-title">Notas</p>
          <div class="form-group"><textarea v-model="form.notas" class="form-textarea" placeholder="Observações, objeções, contexto..."></textarea></div>
        </div>
        <div v-if="histEtapas.length" class="drawer-section">
          <p class="drawer-section-title">Histórico de etapas</p>
          <div v-for="h in histEtapas" :key="h.ts" class="hist-row">
            <span style="color:var(--accent)">{{ h.de }}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <span>{{ h.para }}</span>
            <span class="hist-time">{{ fmtDataHora(h.ts) }}</span>
          </div>
        </div>
      </div><!-- /aba dados -->

      <!-- ── ABA FOLLOW-UP ── -->
      <div v-show="drawerTab === 'followup'">
        <div class="drawer-section">
          <p class="drawer-section-title">Follow-up manual</p>
          <div class="form-group">
            <label class="form-label">Data e hora</label>
            <input type="datetime-local" class="form-input" v-model="drawerFollowupDate" />
          </div>
          <div class="form-group">
            <label class="form-label">Contexto</label>
            <input type="text" class="form-input" v-model="drawerFollowupObs" placeholder="Ex.: ligar às 14h sobre proposta" />
          </div>
          <button class="btn btn-primary btn-sm" style="width:fit-content" @click="drawerSaveFollowup">Salvar follow-up</button>
          <div v-if="drawerLead?.proximo_followup" class="fu-hint" style="margin-top:4px">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Agendado: {{ fmtDataHora(drawerLead.proximo_followup) }}
          </div>
        </div>
        <div class="drawer-section">
          <p class="drawer-section-title">Follow-up automático</p>
          <div class="sz-sdr-toggle-row">
            <div>
              <p class="sz-sdr-toggle-title">Ativar neste chat</p>
              <p class="sz-sdr-toggle-sub text-sm text-muted">{{ drawerLead && wa.isFuAutoActive(drawerLead) ? 'Enviará follow-up se não houver resposta no prazo' : 'Manda follow-up automático se o lead não responder' }}</p>
            </div>
            <button class="sz-sdr-pill" :class="{ 'sz-sdr-pill--on': drawerLead && wa.isFuAutoActive(drawerLead) }" @click="drawerToggleFuAutoChat">
              <span class="sz-sdr-pill-thumb"></span>
            </button>
          </div>
          <div class="form-group">
            <label class="form-label">Enviar se não responder em</label>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <select class="form-select" v-model="drawerFuAutoHorasLocal" style="width:auto">
                <option :value="1">1 hora</option><option :value="2">2 horas</option><option :value="3">3 horas</option>
                <option :value="4">4 horas</option><option :value="6">6 horas</option><option :value="8">8 horas</option>
                <option :value="12">12 horas</option><option :value="24">24 horas</option>
              </select>
              <span class="text-muted text-sm">após a última mensagem</span>
            </div>
            <button class="btn btn-primary btn-sm" style="margin-top:8px;width:fit-content" @click="drawerSaveFuAutoHoras">Salvar</button>
          </div>
          <div v-if="drawerLead && wa.isFuAutoActive(drawerLead)" class="sz-sdr-active-info">
            <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Follow-up automático habilitado</div>
            <div v-if="drawerLead && wa.fuAutoChats[wa.fuAutoKey(drawerLead)]?.lastSentAt" class="sz-sdr-active-row">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Último: {{ fmtDataHora(wa.fuAutoChats[wa.fuAutoKey(drawerLead)]?.lastSentAt) }}
            </div>
          </div>
        </div>
      </div><!-- /aba followup -->

      <!-- ── ABA FINANCEIRO ── -->
      <div v-show="drawerTab === 'financeiro'">
        <div class="drawer-section">
          <p class="drawer-section-title">Serviços</p>
          <!-- Chips dos serviços adicionados -->
          <div v-if="drawerServicosLead.length" class="serv-chips">
            <span v-for="s in drawerServicosLead" :key="s" class="serv-chip">
              {{ s }}
              <button class="serv-chip-rm" @click="drawerRemoveServico(s)" title="Remover">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          </div>
          <!-- Input de busca/adição -->
          <div class="serv-input-wrap" @focusout="e => { if (!e.currentTarget.contains(e.relatedTarget)) drawerServicosOpen = false }">
            <div class="serv-input-row">
              <input
                class="form-input"
                v-model="drawerServicosSearch"
                placeholder="Buscar ou adicionar serviço..."
                @focus="drawerServicosOpen = true"
                @keydown.enter.prevent="drawerAddServico(drawerServicosSearch)"
                @keydown.escape="drawerServicosOpen = false"
              />
              <button class="btn btn-primary btn-sm btn-icon" @click="drawerAddServico(drawerServicosSearch)" title="Adicionar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <div v-if="drawerServicosOpen && drawerServicosFiltered.length" class="serv-dropdown">
              <button
                v-for="s in drawerServicosFiltered"
                :key="s"
                class="serv-dropdown-item"
                @mousedown.prevent="drawerAddServico(s)"
              >{{ s }}</button>
            </div>
          </div>
          <div class="form-group" style="margin-top:.75rem">
            <label class="form-label">Valor estimado (R$)</label>
            <input type="number" class="form-input" :value="drawerLead?.valor_estimado ?? form.valor_estimado ?? ''" @blur="e => { form.valor_estimado = e.target.value ? Number(e.target.value) : ''; saveField('valor_estimado', e.target.value ? Number(e.target.value) : null) }" placeholder="797" />
          </div>
        </div>
        <div class="drawer-section">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">
            <p class="drawer-section-title" style="margin:0">Parcelas</p>
            <button class="btn btn-ghost btn-sm" @click="drawerAdicionarParcela">+ Adicionar</button>
          </div>
          <div v-if="!drawerParcelasLocal.length" style="font-size:13px;color:var(--text-tertiary);padding:.25rem 0">Nenhuma parcela cadastrada.</div>
          <div v-for="(p, idx) in drawerParcelasLocal.slice().sort((a,b) => a.numero - b.numero)" :key="p.numero" class="sz-parcela-row">
            <span class="sz-parcela-num">#{{ p.numero }}</span>
            <input type="number" class="form-input sz-parcela-input" placeholder="Valor" :value="p.valor" @blur="e => { drawerParcelasLocal[idx].valor = e.target.value ? Number(e.target.value) : null; drawerSaveParcelas() }" />
            <input type="date" class="form-input sz-parcela-input" :value="p.vencimento" @blur="e => { drawerParcelasLocal[idx].vencimento = e.target.value || null; drawerSaveParcelas() }" />
            <label class="sz-parcela-pago"><input type="checkbox" :checked="p.pago" @change="drawerTogglePago(idx)" /><span>Pago</span></label>
          </div>
        </div>
        <div class="drawer-section">
          <p class="drawer-section-title">Transações vinculadas</p>
          <p v-if="!drawerTransacoesLead.length" style="font-size:13px;color:var(--text-tertiary)">Nenhuma transação vinculada a este contato.</p>
          <div v-for="t in drawerTransacoesLead" :key="t.id" class="crmtx-row">
            <div class="crmtx-top">
              <span class="crmtx-desc">{{ t.desc }}</span>
              <span class="crmtx-val" :class="isEntrada(t) ? 'crmtx-val--in' : 'crmtx-val--out'">
                {{ isEntrada(t) ? '+' : '−' }} R$ {{ Number(t.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
              </span>
            </div>
            <div class="crmtx-bottom">
              <span class="crmtx-date">{{ fmtTxDate(t.data) }}</span>
              <span class="tx-st-badge" :class="isPago(t) ? 'tx-st--pago' : 'tx-st--pend'">{{ isPago(t) ? 'recebido' : 'pendente' }}</span>
            </div>
          </div>
        </div>
      </div><!-- /aba financeiro -->

      <!-- ── ABA IA ── -->
      <div v-show="drawerTab === 'ia'">
        <div class="drawer-section">
          <p class="drawer-section-title">SDR por IA</p>
          <div v-if="!wa.sdrConfig.enabled" class="sz-sdr-section-warn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            SDR desativado globalmente. Ative em <router-link to="/sdr" class="sz-sdr-link">SDR IA</router-link>.
          </div>
          <div class="sz-sdr-toggle-row">
            <div>
              <p class="sz-sdr-toggle-title">Ativar SDR neste chat</p>
              <p class="sz-sdr-toggle-sub text-sm text-muted">{{ drawerLead && wa.isSdrActive(drawerLead) ? 'SDR respondendo automaticamente · ' + (wa.sdrChats[wa.sdrChatKey(drawerLead)]?.msgCount || 0) + ' msgs' : 'O agente responderá mensagens automaticamente' }}</p>
            </div>
            <button class="sz-sdr-pill" :class="{ 'sz-sdr-pill--on': drawerLead && wa.isSdrActive(drawerLead) }" @click="drawerLead && wa.toggleSdrChat(drawerLead)" :disabled="!wa.sdrConfig.enabled">
              <span class="sz-sdr-pill-thumb"></span>
            </button>
          </div>
          <div v-if="drawerLead && wa.isSdrActive(drawerLead)" class="sz-sdr-active-info">
            <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Respostas automáticas habilitadas</div>
            <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Horário: {{ wa.sdrConfig.horaInicio }} – {{ wa.sdrConfig.horaFim }}</div>
            <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>Limite: {{ wa.sdrConfig.limiteMsg }} msgs por chat</div>
            <div v-if="!wa.sdrIsInHours()" class="sz-sdr-active-row sz-sdr-active-row--warn">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ drawerSdrForaMotivo }}
            </div>
          </div>
        </div>
        <div class="drawer-section">
          <p class="drawer-section-title">Análise de conversa</p>
          <div v-if="drawerAnalisando" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0">
            <div class="sz-typing"><span></span><span></span><span></span></div>
            <p style="font-size:13px;color:var(--text-secondary)">Analisando conversa...</p>
          </div>
          <div v-else-if="drawerErroAnalise">
            <p style="font-size:13px;color:var(--status-danger);margin-bottom:12px">{{ drawerErroAnalise }}</p>
            <button class="btn btn-primary btn-sm" @click="drawerAnalisarLead">Tentar novamente</button>
          </div>
          <div v-else-if="!drawerLead?.analise_ia">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">A IA analisa as últimas mensagens e avalia o potencial deste lead.</p>
            <button class="btn btn-primary" @click="drawerAnalisarLead">Analisar conversa</button>
          </div>
          <div v-else>
            <div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:12px;color:var(--text-secondary)">Score</span>
                <span style="font-size:12px;font-weight:600" :style="{ color: drawerLead.analise_ia.score > 70 ? 'var(--accent)' : drawerLead.analise_ia.score >= 40 ? 'var(--status-warning)' : 'var(--status-danger)' }">{{ drawerLead.analise_ia.score }}/100</span>
              </div>
              <div style="height:6px;background:var(--bg-overlay);border-radius:3px;overflow:hidden">
                <div style="height:100%;border-radius:3px;transition:width 0.3s" :style="{ width: drawerLead.analise_ia.score + '%', background: drawerLead.analise_ia.score > 70 ? 'var(--accent)' : drawerLead.analise_ia.score >= 40 ? 'var(--status-warning)' : 'var(--status-danger)' }"></div>
              </div>
            </div>
            <p style="font-size:13px;color:var(--text-primary);line-height:1.6;margin-bottom:16px">{{ drawerLead.analise_ia.resumo }}</p>
            <div v-if="drawerLead.analise_ia.positivos?.length" style="margin-bottom:14px">
              <p style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Pontos positivos</p>
              <div v-for="p in drawerLead.analise_ia.positivos" :key="p" class="sz-analise-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><span>{{ p }}</span></div>
            </div>
            <div v-if="drawerLead.analise_ia.atencao?.length" style="margin-bottom:16px">
              <p style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Pontos de atenção</p>
              <div v-for="a in drawerLead.analise_ia.atencao" :key="a" class="sz-analise-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--status-warning)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>{{ a }}</span></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border-subtle)">
              <span style="font-size:11px;color:var(--text-tertiary)">
                {{ drawerLead.analise_ia.geradoEm ? 'Gerado em ' + new Date(drawerLead.analise_ia.geradoEm).toLocaleString('pt-BR') : 'Data não registrada — re-analise para atualizar' }}
              </span>
              <button class="btn btn-ghost btn-sm" @click="drawerAnalisarLead">Re-analisar</button>
            </div>
          </div>
        </div>
      </div><!-- /aba ia -->

      <!-- ── ABA HISTÓRICO / TIMELINE ── -->
      <div v-show="drawerTab === 'historico'">
        <div v-if="leads.drawerLeadId && !isNewLead" class="drawer-section">
          <p class="drawer-section-title">Linha do tempo</p>
          <div class="conv-list">
            <div v-if="!drawerTimeline.length" class="conv-empty">Nenhum registro ainda</div>
            <template v-for="c in drawerTimeline" :key="c.id">
              <!-- Evento de sistema (etapa/prioridade) -->
              <div v-if="c.canal === 'sistema'" class="tl-event">
                <span class="tl-event-line"></span>
                <span class="tl-event-dot"></span>
                <span class="tl-event-text">{{ c.mensagem }}</span>
                <span class="tl-event-time">{{ fmtDataHora(c.data) }}</span>
              </div>
              <!-- Mensagem normal -->
              <div v-else class="conv-item">
                <div class="conv-meta">
                  <span class="conv-canal">{{ c.canal }}</span>
                  <span :class="c.direcao === 'recebido' ? 'dir-in' : 'dir-out'">{{ c.direcao === 'recebido' ? '← Recebido' : '→ Enviado' }}</span>
                  <span class="conv-time">{{ fmtDataHora(c.data) }}</span>
                </div>
                <div class="conv-msg">{{ c.mensagem }}</div>
              </div>
            </template>
          </div>
          <div class="conv-composer">
            <div class="conv-selects">
              <div class="conv-select-wrap">
                <span class="conv-select-label">Canal</span>
                <select v-model="convCanal" class="form-select" style="font-size:.8rem;padding:.35rem .6rem">
                  <option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option>
                  <option value="email">Email</option><option value="ligacao">Ligação</option>
                </select>
              </div>
              <div class="conv-select-wrap">
                <span class="conv-select-label">Direção</span>
                <select v-model="convDir" class="form-select" style="font-size:.8rem;padding:.35rem .6rem">
                  <option value="enviado">Enviado</option><option value="recebido">Recebido</option>
                </select>
              </div>
            </div>
            <textarea v-model="convMsg" class="form-textarea" style="min-height:60px;font-size:.85rem;resize:none" placeholder="Registrar mensagem..." @keydown.ctrl.enter="addConversa"></textarea>
            <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center" @click="addConversa">+ Registrar</button>
          </div>
        </div>
      </div><!-- /aba historico -->

    </div><!-- /drawer-body -->

    <!-- Footer -->
    <div class="drawer-footer">
      <button class="btn btn-primary" style="flex:1;justify-content:center" @click="salvar">Salvar</button>
      <button v-if="!isNewLead && leads.drawerLeadId" class="btn btn-danger btn-icon" @click="deletar" title="Excluir">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  </div>

  <!-- Modal fechar negócio -->
  <FecharNegocioModal v-model="fecharOpen" :lead="fecharLead" @fechado="() => { fecharOpen = false; fecharLead = null }" />
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useLeadsStore, ETAPAS } from '@/stores/leads'
import { useFinStore } from '@/stores/fin'
import { useWaStore } from '@/stores/wa'
import { useAuthStore } from '@/stores/auth'
import { useSaving } from '@/composables/useSaving'
import { sb } from '@/lib/supabase'
import FecharNegocioModal from './FecharNegocioModal.vue'

const leads = useLeadsStore()
const fin   = useFinStore()
const wa    = useWaStore()
const auth  = useAuthStore()
const router = useRouter()
const toast  = inject('toast')
const { run } = useSaving()

// ── Computeds de controle ──
const isNewLead = computed(() => String(leads.drawerLeadId || '').startsWith('__new__'))
const isOpen    = computed(() => leads.drawerLeadId !== null)
const drawerLead = computed(() =>
  leads.drawerLeadId && !isNewLead.value
    ? leads.leads.find(l => l.id === leads.drawerLeadId) ?? null
    : null
)

// ── Estado do drawer ──
const drawerTab            = ref('dados')
const form                 = ref({ nome:'', negocio:'', telefone:'', categoria:'', cidade:'', instagram:'', site_atual:'', etapa:'contato', prioridade:'media', valor_estimado:'', notas:'' })
const histEtapas           = ref([])
const convCanal            = ref('whatsapp')
const convDir              = ref('enviado')
const convMsg              = ref('')
const drawerFollowupDate   = ref('')
const drawerFollowupObs    = ref('')
const drawerFuAutoHorasLocal = ref(4)
const drawerParcelasLocal  = ref([])
const drawerServicosSearch = ref('')
const drawerServicosOpen   = ref(false)
const drawerAnalisando     = ref(false)
const drawerErroAnalise    = ref(null)
const fecharOpen           = ref(false)
const fecharLead           = ref(null)

// ── Watch: popula form ao abrir lead ──
watch(() => leads.drawerLeadId, async (id) => {
  drawerTab.value = 'dados'
  drawerErroAnalise.value = null
  drawerAnalisando.value = false
  drawerParcelasLocal.value = []

  if (!id) {
    leads.conversas = []
    return
  }

  if (isNewLead.value) {
    const etapa = id.split(':')[1] || 'contato'
    form.value = { nome:'', negocio:'', telefone:'', categoria:'', cidade:'', instagram:'', site_atual:'', etapa, prioridade:'media', valor_estimado:'', notas:'' }
    histEtapas.value = []
    leads.conversas = []
    return
  }

  const l = leads.leads.find(x => x.id === id)
  if (!l) return
  form.value = {
    nome: l.nome || '', negocio: l.negocio || '', telefone: l.telefone || '',
    categoria: l.categoria || '', cidade: l.cidade || '', instagram: l.instagram || '',
    site_atual: l.site_atual || '', etapa: l.etapa || 'contato', prioridade: l.prioridade || 'media',
    valor_estimado: l.valor_estimado || '', notas: l.notas || ''
  }
  try { const raw = localStorage.getItem('slac_hist_' + id); histEtapas.value = raw ? JSON.parse(raw) : [] } catch { histEtapas.value = [] }
  await Promise.all([leads.loadConversas(id), wa.loadTemplates()])
})

// ── Watch: sync estado ao mudar de aba ou lead ──
watch([() => drawerTab.value, () => leads.drawerLeadId], () => {
  if (!drawerLead.value) return
  const l = drawerLead.value
  if (drawerTab.value === 'followup') {
    drawerFollowupDate.value = l.proximo_followup ? toLocalDatetimeInput(l.proximo_followup) : ''
    drawerFollowupObs.value  = l.followup_obs ?? ''
    const fuKey = wa.fuAutoKey(l)
    drawerFuAutoHorasLocal.value = (fuKey && wa.fuAutoChats[fuKey]?.horas) || 4
  }
  if (drawerTab.value === 'financeiro') {
    drawerParcelasLocal.value = JSON.parse(JSON.stringify(l.parcelas ?? []))
  }
  if (drawerTab.value === 'ia') {
    drawerErroAnalise.value = null
  }
})

// ── Computeds ──
const drawerTransacoesLead = computed(() => {
  if (!drawerLead.value) return []
  const id   = drawerLead.value.id
  const nome = (drawerLead.value.nome || '').toLowerCase()
  return fin.fin
    .filter(t => t.obs?.includes('lead:' + id) || (nome && t.cli?.toLowerCase() === nome))
    .slice(0, 20)
})

const drawerServicosLead = computed(() =>
  Array.isArray(drawerLead.value?.servicos) ? drawerLead.value.servicos : []
)

const drawerServicosDisponiveis = computed(() => {
  const set = new Set()
  for (const l of leads.leads) {
    if (Array.isArray(l.servicos)) l.servicos.forEach(s => set.add(s))
  }
  return [...set].sort()
})

const drawerServicosFiltered = computed(() => {
  const q = drawerServicosSearch.value.trim().toLowerCase()
  const jaAdicionados = new Set(drawerServicosLead.value)
  const lista = drawerServicosDisponiveis.value.filter(s => !jaAdicionados.has(s))
  if (!q) return lista
  return lista.filter(s => s.toLowerCase().includes(q))
})

const drawerTimeline = computed(() =>
  [...leads.conversas].sort((a, b) => new Date(b.data) - new Date(a.data))
)

const drawerSdrForaMotivo = computed(() => {
  const day  = new Date().getDay()
  const dias = wa.sdrConfig.diasSemana || []
  if (!dias.includes(day)) {
    const NOMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    return `Fora dos dias configurados (${dias.map(d => NOMES[d]).join(', ') || '—'}) — SDR pausado`
  }
  return `Fora do horário — SDR pausado até ${wa.sdrConfig.horaInicio}`
})

// ── Helpers ──
function close() {
  leads.drawerLeadId = null
}

function toLocalDatetimeInput(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function saveField(field, value) {
  if (!drawerLead.value) return
  leads.upsert({ id: drawerLead.value.id, [field]: value ?? null })
}

function fmtDataHora(d) {
  if (!d) return '—'
  const dt   = new Date(d)
  const date = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
  const h = dt.getHours(), m = dt.getMinutes()
  if (h === 0 && m === 0) return date
  return `${date} ${dt.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`
}

function fmtTxDate(d) {
  if (!d) return '—'
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1].slice(2)}`
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })
}

function isEntrada(t) { return t.tipo === 'entrada' || t.tipo === 'receita' }
function isPago(t)    { return t.st === 'recebido' || t.st === 'pago' }

function etapaLabel(id) {
  return ETAPAS.find(e => e.id === id)?.label || id || '—'
}

// ── Salvar / Deletar ──
async function salvar() {
  if (!form.value.nome || !form.value.telefone) { toast('Nome e telefone obrigatórios', 'err'); return }

  const id  = (!isNewLead.value && leads.drawerLeadId) ? leads.drawerLeadId : ('l' + Date.now())
  const prev = leads.leads.find(l => l.id === id)
  const eraFechado    = prev?.etapa === 'fechado'
  const vaiFicarFechado = form.value.etapa === 'fechado'

  // Salva histórico de etapas
  if (prev && prev.etapa !== form.value.etapa) {
    try {
      const key  = 'slac_hist_' + id
      const hist = JSON.parse(localStorage.getItem(key) || '[]')
      hist.unshift({ de: etapaLabel(prev.etapa), para: etapaLabel(form.value.etapa), ts: new Date().toISOString() })
      localStorage.setItem(key, JSON.stringify(hist.slice(0, 20)))
    } catch {}
  }

  const payload = {
    id, user_id: auth.user.id,
    nome: form.value.nome, telefone: form.value.telefone, negocio: form.value.negocio,
    categoria: form.value.categoria, cidade: form.value.cidade, instagram: form.value.instagram,
    site_atual: form.value.site_atual, etapa: form.value.etapa, prioridade: form.value.prioridade,
    valor_estimado: parseFloat(form.value.valor_estimado) || 0,
    notas: form.value.notas, updated_at: new Date().toISOString()
  }

  await run(() => leads.upsert(payload), 'Salvo ✓')

  if (vaiFicarFechado && !eraFechado) {
    fecharLead.value  = leads.leads.find(l => l.id === payload.id) || payload
    fecharOpen.value  = true
    close()
    return
  }
  close()
}

async function deletar() {
  if (!leads.drawerLeadId || isNewLead.value) return
  if (!confirm('Remover este lead permanentemente?')) return
  leads.remove(leads.drawerLeadId)
  close()
  toast('Lead removido ✓', 'ok')
}

// ── Follow-up ──
async function drawerSaveFollowup() {
  if (!drawerLead.value) return
  await leads.upsert({
    id: drawerLead.value.id,
    proximo_followup: drawerFollowupDate.value ? new Date(drawerFollowupDate.value).toISOString() : null,
    followup_obs:     drawerFollowupObs.value || null,
    followup_count:   (drawerLead.value.followup_count ?? 0) + 1
  })
  toast('Follow-up salvo', 'ok')
}

async function drawerToggleFuAutoChat() {
  const l = drawerLead.value
  if (!l) return
  const wasActive = wa.isFuAutoActive(l)
  await wa.toggleFuAutoChat(l, drawerFuAutoHorasLocal.value)
  if (!wasActive) {
    const fuAt = new Date(Date.now() + drawerFuAutoHorasLocal.value * 3600000).toISOString()
    await leads.upsert({ id: l.id, proximo_followup: fuAt })
  }
}

async function drawerSaveFuAutoHoras() {
  const l = drawerLead.value
  if (!l) return
  await wa.setFuAutoHoras(l, drawerFuAutoHorasLocal.value)
  if (wa.isFuAutoActive(l)) {
    const fuAt = new Date(Date.now() + drawerFuAutoHorasLocal.value * 3600000).toISOString()
    await leads.upsert({ id: l.id, proximo_followup: fuAt })
  }
  toast('Configuração salva', 'ok')
}

// ── Serviços ──
function drawerAddServico(nome) {
  const n = (nome || '').trim()
  if (!n || !drawerLead.value) return
  if (drawerServicosLead.value.includes(n)) { drawerServicosSearch.value = ''; return }
  leads.upsert({ id: drawerLead.value.id, servicos: [...drawerServicosLead.value, n] })
  drawerServicosSearch.value = ''
  drawerServicosOpen.value = false
}

function drawerRemoveServico(nome) {
  if (!drawerLead.value) return
  leads.upsert({ id: drawerLead.value.id, servicos: drawerServicosLead.value.filter(s => s !== nome) })
}

// ── Parcelas ──
function drawerAdicionarParcela() {
  drawerParcelasLocal.value.push({ numero: drawerParcelasLocal.value.length + 1, valor: null, vencimento: null, pago: false })
}

function drawerSaveParcelas() {
  if (!drawerLead.value) return
  leads.upsert({ id: drawerLead.value.id, parcelas: drawerParcelasLocal.value })
}

function drawerTogglePago(idx) {
  drawerParcelasLocal.value[idx].pago = !drawerParcelasLocal.value[idx].pago
  drawerSaveParcelas()
}

// ── Análise IA ──
async function drawerAnalisarLead() {
  if (!drawerLead.value) return
  drawerAnalisando.value  = true
  drawerErroAnalise.value = null
  try {
    const loaded = await leads.loadConversas(drawerLead.value.id, { noStore: true })
    const msgs   = (loaded || [])
      .filter(c => c.canal === 'whatsapp')
      .slice(-50)
      .map(m => ({ direcao: m.direcao, mensagem: (m.mensagem || '').slice(0, 500), data: m.data }))
    const { data, error } = await sb.functions.invoke('analyze-lead', {
      body: { leadId: drawerLead.value.id, messages: msgs }
    })
    if (error) throw error
    await leads.upsert({ id: drawerLead.value.id, analise_ia: { ...data, geradoEm: new Date().toISOString() } })
  } catch {
    drawerErroAnalise.value = 'Erro ao analisar. Tente novamente.'
  } finally {
    drawerAnalisando.value = false
  }
}

// ── Conversa ──
async function addConversa() {
  if (!leads.drawerLeadId || isNewLead.value) { toast('Salve o lead primeiro', 'err'); return }
  if (!convMsg.value.trim()) return
  await run(() => leads.addConversa(leads.drawerLeadId, convCanal.value, convDir.value, convMsg.value.trim()), 'Registrado ✓')
  convMsg.value = ''
}
</script>

<style scoped>
/* Backdrop */
.drawer-bg {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 800;
}
[data-theme="light"] .drawer-bg {
  background: rgba(200,200,210,0.3);
}

/* Drawer panel */
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 420px;
  max-width: 95vw;
  background: rgba(18,18,18,0.38);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(180%);
  border-left: 1px solid rgba(255,255,255,0.08);
  box-shadow: -8px 0 40px rgba(0,0,0,.5);
  z-index: 801;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
[data-theme="light"] .drawer {
  background: rgba(255,255,255,0.88);
  border-left: 1px solid rgba(0,0,0,0.08);
  box-shadow: -8px 0 40px rgba(0,0,0,.1);
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}
.drawer-title {
  font-size: .9375rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Tabs */
.drawer-tabs {
  display: flex;
  gap: 2px;
  background: transparent;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1rem;
  flex-shrink: 0;
}
.drawer-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: .55rem .7rem;
  font-size: .78rem;
  font-weight: 500;
  color: var(--text-tertiary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color .15s, border-color .15s;
  white-space: nowrap;
  font-family: var(--font-body);
}
.drawer-tab:hover { color: var(--text-secondary); }
.drawer-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
.drawer-tab-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-left: 2px;
}

/* Body */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: .875rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: .875rem;
}
.drawer-section {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  padding-bottom: .875rem;
  border-bottom: 1px solid var(--border-subtle);
}
.drawer-section:last-child { border-bottom: none; }
.drawer-section-title {
  font-size: .62rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin: 0;
}

/* Footer */
.drawer-footer {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .875rem 1.25rem;
  border-top: 1px solid var(--border-default);
  flex-shrink: 0;
}

/* Histórico de etapas */
.hist-row {
  display: flex;
  align-items: center;
  gap: .375rem;
  font-size: .78rem;
  color: var(--text-tertiary);
}
.hist-time { margin-left: auto; font-size: .7rem; }

/* Timeline */
.tl-event {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .25rem 0;
  position: relative;
}
.tl-event-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
  opacity: .5;
}
.tl-event-text {
  flex: 1;
  font-size: .75rem;
  color: var(--text-tertiary);
  font-style: italic;
}
.tl-event-time {
  font-size: .68rem;
  color: var(--text-tertiary);
  opacity: .7;
  white-space: nowrap;
}

/* Conv list */
.conv-list { display: flex; flex-direction: column; gap: .375rem; }
.conv-empty { font-size: .78rem; color: var(--text-tertiary); text-align: center; padding: .5rem; }
.conv-item {
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: .5rem .625rem;
}
.conv-meta { display: flex; align-items: center; gap: .375rem; margin-bottom: .2rem; }
.conv-canal { font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-tertiary); }
.dir-in  { font-size: .65rem; font-weight: 600; color: var(--accent); }
.dir-out { font-size: .65rem; font-weight: 600; color: var(--status-warning); }
.conv-time { font-size: .65rem; color: var(--text-tertiary); margin-left: auto; }
.conv-msg  { font-size: .8rem; color: var(--text-primary); }
.conv-composer { display: flex; flex-direction: column; gap: .5rem; margin-top: .5rem; }
.conv-selects  { display: flex; gap: .5rem; }
.conv-select-wrap  { display: flex; flex-direction: column; gap: .2rem; flex: 1; }
.conv-select-label { font-size: .6rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--text-tertiary); }

/* Follow-up hint */
.fu-hint {
  display: flex;
  align-items: center;
  gap: .375rem;
  font-size: .75rem;
  color: var(--status-warning);
  margin-top: .25rem;
}

/* Serviços chips */
.serv-chips { display: flex; flex-wrap: wrap; gap: .375rem; margin-bottom: .5rem; }
.serv-chip {
  display: inline-flex;
  align-items: center;
  gap: .3rem;
  background: var(--accent-subtle);
  border: 1px solid rgba(34,197,94,.25);
  color: var(--accent);
  font-size: .75rem;
  font-weight: 600;
  padding: .2rem .55rem .2rem .6rem;
  border-radius: 99px;
}
.serv-chip-rm {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent);
  opacity: .6;
  padding: 0;
  line-height: 1;
}
.serv-chip-rm:hover { opacity: 1; }
.serv-input-wrap { position: relative; }
.serv-input-row  { display: flex; gap: .375rem; }
.serv-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 50;
  max-height: 180px;
  overflow-y: auto;
}
.serv-dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: .5rem .75rem;
  font-size: .82rem;
  color: var(--text-primary);
  font-family: var(--font-body);
  cursor: pointer;
  transition: background .1s;
}
.serv-dropdown-item:hover { background: var(--bg-overlay); }

/* Transações CRM */
.crmtx-row {
  display: flex;
  flex-direction: column;
  gap: .2rem;
  padding: .5rem .625rem;
  background: var(--bg-overlay);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  margin-bottom: .375rem;
}
.crmtx-row:last-child { margin-bottom: 0; }
.crmtx-top  { display: flex; align-items: center; gap: .5rem; }
.crmtx-desc { flex: 1; font-size: .8rem; color: var(--text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.crmtx-val  { font-size: .82rem; font-weight: 700; flex-shrink: 0; }
.crmtx-val--in  { color: var(--accent); }
.crmtx-val--out { color: var(--status-danger); }
.crmtx-bottom { display: flex; align-items: center; gap: .5rem; }
.crmtx-date   { font-size: .7rem; color: var(--text-tertiary); flex: 1; }
.tx-st-badge  { font-size: .62rem; font-weight: 700; padding: .1rem .4rem; border-radius: 99px; white-space: nowrap; flex-shrink: 0; }
.tx-st--pago  { background: var(--accent-subtle); color: var(--accent); }
.tx-st--pend  { background: rgba(245,158,11,.12); color: var(--status-warning); }

/* SDR / FuAuto toggle pill */
.sz-sdr-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 0; }
.sz-sdr-toggle-title { font-size: .82rem; font-weight: 600; color: var(--text-primary); margin: 0 0 2px; }
.sz-sdr-toggle-sub   { font-size: .75rem; color: var(--text-tertiary); margin: 0; }
.sz-sdr-pill {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  cursor: pointer;
  position: relative;
  transition: background .2s, border-color .2s;
  flex-shrink: 0;
}
.sz-sdr-pill--on { background: var(--accent); border-color: var(--accent); }
.sz-sdr-pill:disabled { opacity: .4; cursor: not-allowed; }
.sz-sdr-pill-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
}
.sz-sdr-pill--on .sz-sdr-pill-thumb { transform: translateX(18px); }
.sz-sdr-active-info {
  background: var(--accent-subtle);
  border: 1px solid rgba(34,197,94,.2);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sz-sdr-active-row { display: flex; align-items: center; gap: 6px; font-size: .75rem; color: var(--accent); }
.sz-sdr-active-row--warn { color: var(--status-warning); }
.sz-sdr-section-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .8rem;
  color: var(--status-warning);
  background: rgba(232,168,56,.1);
  border: 1px solid rgba(232,168,56,.25);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin-bottom: 12px;
}
.sz-sdr-link { color: var(--accent); }

/* Parcelas */
.sz-parcela-row   { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sz-parcela-num   { font-size: 12px; color: var(--text-tertiary); min-width: 24px; }
.sz-parcela-input { flex: 1; min-width: 0; }
.sz-parcela-pago  { display: flex; align-items: center; gap: 4px; font-size: .75rem; color: var(--text-secondary); cursor: pointer; white-space: nowrap; }

/* Análise IA */
.sz-analise-item { display: flex; align-items: flex-start; gap: 8px; font-size: .82rem; color: var(--text-primary); margin-bottom: 6px; }

/* Typing indicator */
.sz-typing { display: flex; gap: 4px; align-items: center; }
.sz-typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: sz-bounce 1s infinite; }
.sz-typing span:nth-child(2) { animation-delay: .15s; }
.sz-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes sz-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* FuAuto config */
.sz-fuauto-config   { display: flex; flex-direction: column; gap: .5rem; }
.sz-fuauto-horas-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Light mode overrides */
[data-theme="light"] .drawer-bg { background: rgba(200,200,210,0.3); }
[data-theme="light"] .drawer { background: rgba(255,255,255,0.88); border-left: 1px solid rgba(0,0,0,0.08); box-shadow: -8px 0 40px rgba(0,0,0,.1); }
[data-theme="light"] .conv-item { background: #f8f8f8; border-color: #e5e5e5; }
[data-theme="light"] .crmtx-row { background: #f8f8f8; border-color: #e5e5e5; }
[data-theme="light"] .serv-dropdown { background: #fff; border-color: #e5e5e5; }
[data-theme="light"] .serv-dropdown-item:hover { background: #f5f5f5; }
[data-theme="light"] .sz-sdr-pill { background: #e5e7eb; border-color: #d1d5db; }
[data-theme="light"] .sz-sdr-active-info { background: rgba(34,197,94,.06); border-color: rgba(34,197,94,.15); }

@media (max-width: 768px) {
  .drawer { width: 100%; }
}
</style>
