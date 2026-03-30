<template>
  <Transition name="sz-fade">
    <div v-if="wa.opcoesSLACOpen" class="sz-modal-overlay" @click.self="close" role="dialog" aria-label="Opções SLAC">
      <div class="sz-modal">

        <!-- Header lead -->
        <div class="sz-modal-header">
          <template v-if="lead">
            <div class="sz-modal-lead-avatar" :style="{ background: avatarColor(lead.nome) }">
              {{ initials(lead.nome) }}
            </div>
            <div class="sz-modal-lead-info">
              <p class="sz-modal-lead-name">{{ lead.nome }}</p>
              <p class="sz-modal-lead-phone">{{ lead.telefone }}</p>
            </div>
            <span class="sz-etapa-badge" :style="{ background: etapaColor(lead.etapa) + '20', color: etapaColor(lead.etapa) }">
              {{ etapaLabel(lead.etapa) }}
            </span>
          </template>
          <template v-else>
            <p class="sz-modal-lead-name">Opções</p>
          </template>
          <button class="sz-modal-close" @click="close" aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Nav -->
        <nav class="sz-modal-nav">
          <button class="sz-modal-nav-item" :class="{ 'sz-modal-nav-item--active': section === 'contato' }" @click="section = 'contato'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Contato</span>
          </button>
          <button class="sz-modal-nav-item" :class="{ 'sz-modal-nav-item--active': section === 'anotacoes' }" @click="section = 'anotacoes'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><polyline points="15 3 15 9 21 9"/></svg>
            <span>Anotações</span>
          </button>
          <button class="sz-modal-nav-item" :class="{ 'sz-modal-nav-item--active': section === 'followup', 'sz-modal-nav-item--sdr': wa.isFuAutoActive(wa.slacOptsLead) }" @click="section = 'followup'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Follow-up</span>
            <span v-if="wa.isFuAutoActive(wa.slacOptsLead)" class="sz-modal-nav-sdr-dot"></span>
          </button>
          <button class="sz-modal-nav-item" :class="{ 'sz-modal-nav-item--active': section === 'financeiro' }" @click="section = 'financeiro'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Financeiro</span>
          </button>
          <button class="sz-modal-nav-item" :class="{ 'sz-modal-nav-item--active': section === 'analise' }" @click="section = 'analise'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/></svg>
            <span>Análise IA</span>
          </button>
          <button class="sz-modal-nav-item" :class="{ 'sz-modal-nav-item--active': section === 'sdr', 'sz-modal-nav-item--sdr': wa.isSdrActive(wa.slacOptsLead) }" @click="section = 'sdr'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            <span>SDR IA</span>
            <span v-if="wa.isSdrActive(wa.slacOptsLead)" class="sz-modal-nav-sdr-dot"></span>
          </button>
        </nav>

        <div class="sz-modal-body">

          <!-- Contato -->
          <div v-if="section === 'contato'">
            <p class="sz-modal-section-title">Contato</p>
            <div v-if="lead" class="sz-modal-grid">
              <div class="form-group"><label class="form-label">Nome</label><input class="form-input" :value="lead.nome" @blur="e => saveField('nome', e.target.value)" /></div>
              <div class="form-group"><label class="form-label">Telefone</label><input class="form-input" :value="lead.telefone" @blur="e => saveField('telefone', e.target.value)" /></div>
              <div class="form-group"><label class="form-label">Email</label><input class="form-input" :value="lead.email" @blur="e => saveField('email', e.target.value)" /></div>
              <div class="form-group"><label class="form-label">Empresa</label><input class="form-input" :value="lead.empresa" @blur="e => saveField('empresa', e.target.value)" /></div>
              <div class="form-group">
                <label class="form-label">Etapa</label>
                <select class="form-select" :value="lead.etapa" @change="e => saveField('etapa', e.target.value)">
                  <option v-for="et in ETAPAS" :key="et.id" :value="et.id">{{ et.label }}</option>
                </select>
              </div>
              <div class="form-group"><label class="form-label">Valor Estimado (R$)</label><input class="form-input" type="number" :value="lead.valor_estimado" @blur="e => saveField('valor_estimado', e.target.value ? Number(e.target.value) : null)" /></div>
              <div class="form-group"><label class="form-label">Origem</label><input class="form-input" :value="lead.origem" @blur="e => saveField('origem', e.target.value)" /></div>
              <div class="form-group sz-modal-full"><label class="form-label">Observações</label><textarea class="form-textarea" rows="3" :value="lead.obs" @blur="e => saveField('obs', e.target.value)"></textarea></div>
            </div>
            <div class="sz-modal-history">
              <p class="sz-modal-section-title" style="margin-top:20px">Histórico</p>
              <div class="sz-modal-history-row"><span class="sz-modal-history-label">Adicionado em</span><span class="sz-modal-history-val">{{ lead ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '—' }}</span></div>
              <div class="sz-modal-history-row"><span class="sz-modal-history-label">Follow-ups realizados</span><span class="sz-modal-history-val">{{ lead?.followup_count ?? 0 }}</span></div>
              <div class="sz-modal-history-row"><span class="sz-modal-history-label">Releads</span><span class="sz-modal-history-val">{{ lead?.relead_data ? '1' : 'Nenhum' }}</span></div>
            </div>
          </div>

          <!-- Anotações -->
          <div v-else-if="section === 'anotacoes'">
            <p class="sz-modal-section-title">Anotações</p>
            <textarea class="form-textarea sz-anotacoes-textarea" v-model="anotacoesText"
              placeholder="Anote qualquer informação sobre este lead..."
              @input="onAnotacoesInput(anotacoesText)"></textarea>
          </div>

          <!-- Follow-up -->
          <div v-else-if="section === 'followup'">
            <p class="sz-modal-section-title">Follow-up</p>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div class="form-group"><label class="form-label">Data e hora do próximo follow-up</label><input type="datetime-local" class="form-input" v-model="followupDate" /></div>
              <div class="form-group"><label class="form-label">Contexto</label><input type="text" class="form-input" v-model="followupObs" placeholder="Ex.: ligar às 14h sobre proposta" /></div>
              <button class="btn btn-primary btn-sm" style="width:fit-content" @click="saveFollowup">Salvar follow-up</button>
            </div>
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-subtle)">
              <p class="sz-modal-section-title" style="margin-bottom:12px">Follow-up automático</p>
              <div class="sz-sdr-toggle-row">
                <div>
                  <p class="sz-sdr-toggle-title">Ativar neste chat</p>
                  <p class="sz-sdr-toggle-sub text-sm text-muted">{{ wa.isFuAutoActive(wa.slacOptsLead) ? 'Enviará follow-up se não houver resposta no prazo' : 'Manda follow-up automático se o lead não responder' }}</p>
                </div>
                <button class="sz-sdr-pill" :class="{ 'sz-sdr-pill--on': wa.isFuAutoActive(wa.slacOptsLead) }" @click="handleToggleFuAutoChat">
                  <span class="sz-sdr-pill-thumb"></span>
                </button>
              </div>
              <div class="sz-fuauto-config">
                <div class="form-group">
                  <label class="form-label">Enviar se não responder em</label>
                  <div class="sz-fuauto-horas-row">
                    <select class="form-select" v-model="fuAutoHorasLocal" style="width:auto">
                      <option :value="1">1 hora</option><option :value="2">2 horas</option><option :value="3">3 horas</option>
                      <option :value="4">4 horas</option><option :value="6">6 horas</option><option :value="8">8 horas</option>
                      <option :value="12">12 horas</option><option :value="24">24 horas</option>
                    </select>
                    <span class="text-muted text-sm">após a última mensagem enviada</span>
                  </div>
                  <button class="btn btn-primary btn-sm" style="margin-top:8px;width:fit-content" @click="saveFuAutoHoras">Salvar</button>
                </div>
                <div v-if="wa.isFuAutoActive(wa.slacOptsLead)" class="sz-sdr-active-info">
                  <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Follow-up automático habilitado</div>
                  <div v-if="wa.fuAutoChats[wa.fuAutoKey(wa.slacOptsLead)]?.lastSentAt" class="sz-sdr-active-row">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Último enviado: {{ fmtDataHora(wa.fuAutoChats[wa.fuAutoKey(wa.slacOptsLead)]?.lastSentAt) }}
                  </div>
                  <div v-if="!wa.scriptBase" class="sz-sdr-active-row sz-sdr-active-row--warn">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
                    Script não configurado — o follow-up usará boas práticas genéricas
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Financeiro -->
          <div v-else-if="section === 'financeiro'">
            <p class="sz-modal-section-title">Financeiro</p>
            <div class="sz-modal-grid" style="margin-bottom:20px">
              <div class="form-group">
                <label class="form-label">Pacote</label>
                <select class="form-select" :value="lead?.pacote ?? ''" @change="e => saveField('pacote', e.target.value || null)">
                  <option value="">Não definido</option>
                  <option value="essencial">Essencial — R$ 797</option>
                  <option value="profissional">Profissional — R$ 1.097</option>
                  <option value="completo">Completo — R$ 1.397</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              <div class="form-group"><label class="form-label">Valor do contrato (R$)</label><input type="number" class="form-input" :value="lead?.valor_contrato ?? ''" @blur="e => saveField('valor_contrato', e.target.value ? Number(e.target.value) : null)" /></div>
            </div>
            <div style="margin-bottom:20px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <p class="sz-modal-section-title" style="margin:0">Parcelas</p>
                <button class="btn btn-ghost btn-sm" @click="adicionarParcela">+ Adicionar</button>
              </div>
              <div v-if="!parcelasLocal.length" style="font-size:13px;color:var(--text-tertiary)">Nenhuma parcela cadastrada.</div>
              <div v-for="(p, idx) in parcelasLocal.slice().sort((a,b) => a.numero - b.numero)" :key="p.numero" class="sz-parcela-row">
                <span class="sz-parcela-num">#{{ p.numero }}</span>
                <input type="number" class="form-input sz-parcela-input" placeholder="Valor" :value="p.valor" @blur="e => { parcelasLocal[idx].valor = e.target.value ? Number(e.target.value) : null; saveParcelas() }" />
                <input type="date" class="form-input sz-parcela-input" :value="p.vencimento" @blur="e => { parcelasLocal[idx].vencimento = e.target.value || null; saveParcelas() }" />
                <label class="sz-parcela-pago"><input type="checkbox" :checked="p.pago" @change="togglePago(idx)" /><span>Pago</span></label>
              </div>
            </div>
            <div>
              <p class="sz-modal-section-title">Transações vinculadas</p>
              <p v-if="!transacoesLead.length" style="font-size:13px;color:var(--text-tertiary)">Nenhuma transação vinculada a este contato.</p>
              <div v-for="t in transacoesLead" :key="t.id" class="tx-row">
                <span class="tx-date">{{ new Date(t.data).toLocaleDateString('pt-BR') }}</span>
                <span style="flex:1;font-size:13px;color:var(--text-primary)">{{ t.descricao }}</span>
                <span class="tx-val" :style="{ color: t.tipo === 'receita' ? 'var(--accent)' : 'var(--status-danger)' }">{{ t.tipo === 'receita' ? '+' : '-' }} R$ {{ Number(t.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>

          <!-- Análise IA -->
          <div v-else-if="section === 'analise'">
            <p class="sz-modal-section-title">Análise IA</p>
            <div v-if="analisando" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:32px 0">
              <div class="sz-typing"><span></span><span></span><span></span></div>
              <p style="font-size:13px;color:var(--text-secondary)">Analisando conversa...</p>
            </div>
            <div v-else-if="erroAnalise" style="padding:16px 0">
              <p style="font-size:13px;color:var(--status-danger);margin-bottom:12px">{{ erroAnalise }}</p>
              <button class="btn btn-primary btn-sm" @click="analisarLead">Tentar novamente</button>
            </div>
            <div v-else-if="!lead?.analise_ia" style="padding:16px 0">
              <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">A IA analisa as últimas mensagens e avalia o potencial deste lead.</p>
              <button class="btn btn-primary" @click="analisarLead">Analisar conversa</button>
            </div>
            <div v-else>
              <div style="margin-bottom:20px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:12px;color:var(--text-secondary)">Score</span>
                  <span style="font-size:12px;font-weight:600" :style="{ color: lead.analise_ia.score > 70 ? 'var(--accent)' : lead.analise_ia.score >= 40 ? 'var(--status-warning)' : 'var(--status-danger)' }">{{ lead.analise_ia.score }}/100</span>
                </div>
                <div style="height:6px;background:var(--bg-overlay);border-radius:3px;overflow:hidden">
                  <div style="height:100%;border-radius:3px;transition:width 0.3s" :style="{ width: lead.analise_ia.score + '%', background: lead.analise_ia.score > 70 ? 'var(--accent)' : lead.analise_ia.score >= 40 ? 'var(--status-warning)' : 'var(--status-danger)' }"></div>
                </div>
              </div>
              <p style="font-size:13px;color:var(--text-primary);line-height:1.6;margin-bottom:16px">{{ lead.analise_ia.resumo }}</p>
              <div v-if="lead.analise_ia.positivos?.length" style="margin-bottom:14px">
                <p style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Pontos positivos</p>
                <div v-for="p in lead.analise_ia.positivos" :key="p" class="sz-analise-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg><span>{{ p }}</span></div>
              </div>
              <div v-if="lead.analise_ia.atencao?.length" style="margin-bottom:16px">
                <p style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Pontos de atenção</p>
                <div v-for="a in lead.analise_ia.atencao" :key="a" class="sz-analise-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--status-warning)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>{{ a }}</span></div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border-subtle)">
                <span style="font-size:11px;color:var(--text-tertiary)">Gerado em {{ new Date(lead.analise_ia.geradoEm).toLocaleString('pt-BR') }}</span>
                <button class="btn btn-ghost btn-sm" @click="analisarLead">Re-analisar</button>
              </div>
            </div>
          </div>

          <!-- SDR IA -->
          <div v-else-if="section === 'sdr'">
            <p class="sz-modal-section-title">SDR por IA</p>
            <div v-if="!wa.sdrConfig.enabled" class="sz-sdr-section-warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              SDR desativado globalmente. Ative em <router-link to="/sdr" @click="close" class="sz-sdr-link">SDR IA</router-link>.
            </div>
            <div class="sz-sdr-toggle-row">
              <div>
                <p class="sz-sdr-toggle-title">Ativar SDR neste chat</p>
                <p class="sz-sdr-toggle-sub text-sm text-muted">{{ wa.isSdrActive(wa.slacOptsLead) ? 'SDR respondendo automaticamente · ' + (wa.sdrChats[wa.sdrChatKey(wa.slacOptsLead)]?.msgCount || 0) + ' msgs enviadas' : 'O agente responderá mensagens recebidas automaticamente' }}</p>
              </div>
              <button class="sz-sdr-pill" :class="{ 'sz-sdr-pill--on': wa.isSdrActive(wa.slacOptsLead) }" @click="wa.toggleSdrChat(wa.slacOptsLead)" :disabled="!wa.sdrConfig.enabled">
                <span class="sz-sdr-pill-thumb"></span>
              </button>
            </div>
            <div v-if="wa.isSdrActive(wa.slacOptsLead)" class="sz-sdr-active-info">
              <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Respostas automáticas habilitadas</div>
              <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Horário: {{ wa.sdrConfig.horaInicio }} – {{ wa.sdrConfig.horaFim }}</div>
              <div class="sz-sdr-active-row"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>Limite: {{ wa.sdrConfig.limiteMsg }} mensagens por chat</div>
              <div v-if="!wa.sdrIsInHours()" class="sz-sdr-active-row sz-sdr-active-row--warn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ sdrForaMotivo }}
              </div>
              <div v-if="wa.slacOptsLead?.etapa && !wa.sdrConfig.etapas.includes(wa.slacOptsLead.etapa)" class="sz-sdr-active-row sz-sdr-active-row--warn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Etapa "{{ wa.slacOptsLead.etapa }}" não configurada no SDR
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useWaStore } from '@/stores/wa'
import { useLeadsStore, ETAPAS } from '@/stores/leads'
import { useFinStore } from '@/stores/fin'
import { sb } from '@/lib/supabase'

const wa    = useWaStore()
const leads = useLeadsStore()
const fin   = useFinStore()
const toast = inject('toast')

// ── Lead reativo (sempre busca do store para ter dados frescos) ──
const lead = computed(() =>
  wa.slacOptsLead?.id ? leads.leads.find(l => l.id === wa.slacOptsLead.id) ?? null : null
)

// ── Estado local do modal ──
const section        = ref('contato')
const followupDate   = ref('')
const followupObs    = ref('')
const parcelasLocal  = ref([])
const anotacoesText  = ref('')
const fuAutoHorasLocal = ref(4)
const analisando     = ref(false)
const erroAnalise    = ref(null)
let anotacoesTimer   = null

// ── Sync de estado ao mudar seção ou lead ──
watch([() => wa.opcoesSLACOpen, section, lead], () => {
  if (!wa.opcoesSLACOpen || !lead.value) return
  const l = lead.value
  if (section.value === 'followup') {
    followupDate.value = l.proximo_followup ? toLocalDatetimeInput(l.proximo_followup) : ''
    followupObs.value  = l.followup_obs ?? ''
    const fuKey = wa.slacOptsLead && wa.fuAutoKey(wa.slacOptsLead)
    fuAutoHorasLocal.value = (fuKey && wa.fuAutoChats[fuKey]?.horas) || 4
  }
  if (section.value === 'financeiro') parcelasLocal.value = JSON.parse(JSON.stringify(l.parcelas ?? []))
  if (section.value === 'anotacoes')  anotacoesText.value  = l.anotacoes ?? ''
})

// Reset ao fechar
watch(() => wa.opcoesSLACOpen, (val) => {
  if (!val) {
    wa.slacOptsLead = null
    section.value   = 'contato'
    erroAnalise.value = null
  }
})

// ESC fecha
function onEsc(e) { if (e.key === 'Escape') close() }
watch(() => wa.opcoesSLACOpen, (val) => {
  if (val) document.addEventListener('keydown', onEsc)
  else     document.removeEventListener('keydown', onEsc)
})

function close() { wa.opcoesSLACOpen = false }

// ── Utilitários ──
const AVATAR_COLORS = ['#22c55e','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899']
function avatarColor(nome) {
  if (!nome) return AVATAR_COLORS[0]
  let h = 0; for (const c of nome) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(nome) {
  if (!nome) return '?'
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
function etapaColor(etapa) { return ETAPAS.find(e => e.id === etapa)?.color || '#888' }
function etapaLabel(etapa) { return ETAPAS.find(e => e.id === etapa)?.label || etapa }
function fmtDataHora(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function toLocalDatetimeInput(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// ── Ações ──
function saveField(field, value) {
  if (!lead.value || lead.value[field] === value) return
  leads.upsert({ id: lead.value.id, [field]: value ?? null })
}

function onAnotacoesInput(val) {
  clearTimeout(anotacoesTimer)
  anotacoesTimer = setTimeout(() => {
    if (!lead.value) return
    leads.upsert({ id: lead.value.id, anotacoes: val || null })
  }, 800)
}

async function saveFollowup() {
  if (!lead.value) return
  await leads.upsert({
    id: lead.value.id,
    proximo_followup: followupDate.value ? new Date(followupDate.value).toISOString() : null,
    followup_obs: followupObs.value || null,
    followup_count: (lead.value.followup_count ?? 0) + 1
  })
  toast('Follow-up salvo', 'ok')
  close()
}

async function handleToggleFuAutoChat() {
  const l = wa.slacOptsLead
  if (!l) return
  const wasActive = wa.isFuAutoActive(l)
  await wa.toggleFuAutoChat(l, fuAutoHorasLocal.value)
  if (!wasActive && lead.value) {
    const fuAt = new Date(Date.now() + fuAutoHorasLocal.value * 3600000).toISOString()
    await leads.upsert({ id: lead.value.id, proximo_followup: fuAt })
  }
}

async function saveFuAutoHoras() {
  const l = wa.slacOptsLead
  if (!l) return
  await wa.setFuAutoHoras(l, fuAutoHorasLocal.value)
  if (wa.isFuAutoActive(l) && lead.value) {
    const fuAt = new Date(Date.now() + fuAutoHorasLocal.value * 3600000).toISOString()
    await leads.upsert({ id: lead.value.id, proximo_followup: fuAt })
  }
  toast('Configuração salva', 'ok')
}

function adicionarParcela() {
  parcelasLocal.value.push({ numero: parcelasLocal.value.length + 1, valor: null, vencimento: null, pago: false })
}
function saveParcelas() {
  if (!lead.value) return
  leads.upsert({ id: lead.value.id, parcelas: parcelasLocal.value })
}
function togglePago(idx) {
  parcelasLocal.value[idx].pago = !parcelasLocal.value[idx].pago
  saveParcelas()
}

const transacoesLead = computed(() => {
  if (!lead.value?.nome) return []
  const nome = lead.value.nome.toLowerCase()
  return fin.fin.filter(t => t.cli?.toLowerCase() === nome).slice(0, 10)
})

async function analisarLead() {
  if (!lead.value) return
  analisando.value  = true
  erroAnalise.value = null
  try {
    const loaded = await leads.loadConversas(lead.value.id, { noStore: true })
    const msgs = (loaded || [])
      .filter(c => c.canal === 'whatsapp')
      .slice(-50)
      .map(m => ({ direcao: m.direcao, mensagem: (m.mensagem || '').slice(0, 500), data: m.data }))
    const { data, error } = await sb.functions.invoke('analyze-lead', {
      body: { leadId: lead.value.id, messages: msgs }
    })
    if (error) throw error
    await leads.upsert({ id: lead.value.id, analise_ia: { ...data, geradoEm: new Date().toISOString() } })
  } catch {
    erroAnalise.value = 'Erro ao analisar. Tente novamente.'
  } finally {
    analisando.value = false
  }
}

const sdrForaMotivo = computed(() => {
  const day  = new Date().getDay()
  const dias = wa.sdrConfig.diasSemana || []
  if (!dias.includes(day)) {
    const NOMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    return `Fora dos dias configurados (${dias.map(d => NOMES[d]).join(', ') || '—'}) — SDR pausado`
  }
  return `Fora do horário — SDR pausado até ${wa.sdrConfig.horaInicio}`
})
</script>

<style scoped>
.sz-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 200;
  display: flex; align-items: stretch; justify-content: flex-end;
}
.sz-modal {
  display: flex; flex-direction: column;
  width: min(420px, 96vw); height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  border-radius: 0;
  box-shadow: -8px 0 32px rgba(0,0,0,0.4);
  overflow: hidden;
}
[data-theme="light"] .sz-modal-overlay { background: rgba(0,0,0,0.2); }
[data-theme="light"] .sz-modal { background: #fff; border-left-color: var(--border-default); box-shadow: -8px 0 32px rgba(0,0,0,0.1); }

.sz-modal-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px 14px; border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
[data-theme="light"] .sz-modal-header { border-bottom-color: var(--border-default); }
.sz-modal-lead-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: .78rem; font-weight: 700; color: #fff; }
.sz-modal-lead-info { flex: 1; min-width: 0; }
.sz-modal-lead-name { font-size: .95rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sz-modal-lead-phone { font-size: .76rem; color: var(--text-tertiary); margin: 2px 0 0; }
.sz-modal-close { margin-left: auto; flex-shrink: 0; background: none; border: none; cursor: pointer; color: var(--text-tertiary); padding: 6px; border-radius: 6px; transition: color 0.15s, background 0.15s; display: flex; }
.sz-modal-close:hover { color: var(--text-primary); background: rgba(255,255,255,.06); }
[data-theme="light"] .sz-modal-close:hover { background: rgba(0,0,0,.05); }

.sz-modal-nav { display: flex; flex-direction: row; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.06); overflow-x: auto; }
.sz-modal-nav::-webkit-scrollbar { display: none; }
[data-theme="light"] .sz-modal-nav { border-bottom-color: var(--border-default); }
.sz-modal-nav-item { display: flex; align-items: center; gap: 6px; padding: 0 16px; height: 44px; flex-shrink: 0; background: none; border: none; cursor: pointer; color: var(--text-tertiary); font-size: .8rem; font-family: inherit; border-bottom: 2px solid transparent; transition: color 0.15s, background 0.15s; white-space: nowrap; }
.sz-modal-nav-item:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
[data-theme="light"] .sz-modal-nav-item:hover { background: rgba(0,0,0,.03); }
.sz-modal-nav-item--active { color: var(--accent); border-bottom-color: var(--accent); }
.sz-modal-nav-item--sdr { color: var(--accent) !important; }
.sz-modal-nav-sdr-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }

.sz-modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
.sz-modal-body::-webkit-scrollbar { width: 4px; }
.sz-modal-body::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }
.sz-modal-section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 16px; margin-top: 0; }
.sz-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sz-modal-full { grid-column: 1 / -1; }
.sz-modal-history-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); }
.sz-modal-history-row:last-child { border-bottom: none; }
[data-theme="light"] .sz-modal-history-row { border-bottom-color: rgba(0,0,0,0.06); }
.sz-modal-history-label { font-size: 12px; color: var(--text-secondary); }
.sz-modal-history-val { font-size: 12px; color: var(--text-primary); font-weight: 500; }

.sz-etapa-badge { font-size: .68rem; font-weight: 600; padding: .2rem .55rem; border-radius: 20px; white-space: nowrap; }
.sz-anotacoes-textarea { width: 100%; min-height: 200px; resize: vertical; box-sizing: border-box; }
.sz-parcela-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sz-parcela-num { font-size: 12px; color: var(--text-tertiary); min-width: 24px; }
.sz-parcela-input { flex: 1; min-width: 0; }
.sz-parcela-pago { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-secondary); white-space: nowrap; cursor: pointer; }
.sz-analise-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; padding: 4px 0; color: var(--text-primary); }

.sz-sdr-section-warn { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; font-size: .78rem; color: var(--status-warning); background: rgba(232,168,56,.08); border: 1px solid rgba(232,168,56,.2); border-radius: 8px; padding: .5rem .75rem; margin-bottom: 1rem; }
.sz-sdr-link { color: var(--accent); text-decoration: none; font-weight: 600; }
.sz-sdr-link:hover { text-decoration: underline; }
.sz-sdr-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--border-subtle); margin-bottom: .75rem; }
.sz-sdr-toggle-title { font-size: .875rem; font-weight: 600; margin: 0 0 .2rem; }
.sz-sdr-toggle-sub { margin: 0; }
.sz-sdr-pill { width: 42px; height: 24px; border-radius: 12px; flex-shrink: 0; background: var(--bg-overlay); border: 1px solid var(--border-subtle); cursor: pointer; position: relative; transition: background .2s, border-color .2s; }
.sz-sdr-pill:disabled { opacity: .45; cursor: not-allowed; }
.sz-sdr-pill--on { background: var(--accent); border-color: var(--accent); }
.sz-sdr-pill-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--text-secondary); transition: transform .2s, background .2s; }
.sz-sdr-pill--on .sz-sdr-pill-thumb { transform: translateX(18px); background: #fff; }
.sz-sdr-active-info { display: flex; flex-direction: column; gap: .5rem; padding: .625rem .75rem; border-radius: 8px; background: rgba(34,197,94,.05); border: 1px solid rgba(34,197,94,.15); }
.sz-sdr-active-row { display: flex; align-items: center; gap: .45rem; font-size: .775rem; color: var(--accent); }
.sz-sdr-active-row--warn { color: var(--status-warning); }
.sz-fuauto-config { margin-top: .75rem; }
.sz-fuauto-horas-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }

.sz-typing { display: flex; align-items: center; gap: 4px; padding: .6rem .8rem; background: var(--bg-overlay); border-radius: 18px; border-bottom-left-radius: 4px; width: fit-content; }
.sz-typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-tertiary); animation: sz-bounce .9s ease-in-out infinite; }
.sz-typing span:nth-child(2) { animation-delay: .15s; }
.sz-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes sz-bounce { 0%, 80%, 100% { transform: scale(.8); opacity: .5; } 40% { transform: scale(1.1); opacity: 1; } }

.sz-fade-enter-active { transition: opacity 0.18s ease; }
.sz-fade-leave-active { transition: opacity 0.15s ease; }
.sz-fade-enter-from, .sz-fade-leave-to { opacity: 0; }
.sz-fade-enter-active .sz-modal { transition: transform 0.22s cubic-bezier(.4,0,.2,1); }
.sz-fade-leave-active .sz-modal { transition: transform 0.18s cubic-bezier(.4,0,.2,1); }
.sz-fade-enter-from .sz-modal, .sz-fade-leave-to .sz-modal { transform: translateX(100%); }
</style>
