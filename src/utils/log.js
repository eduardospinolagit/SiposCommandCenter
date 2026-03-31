import { sb } from '@/lib/supabase'
import { uid } from '@/utils/uid'

// ─── Dicionário de códigos de log do SLAC ───────────────────────────────────
// Formato: MODULO-NNN  →  descrição padrão
export const LOG_CODES = {
  // AUTH — autenticação
  'AUTH-001': 'Login realizado',
  'AUTH-002': 'Logout',
  'AUTH-003': 'Nome de usuário salvo',

  // CRM — leads / pipeline
  'CRM-001': 'Lead criado',
  'CRM-002': 'Lead atualizado',
  'CRM-003': 'Lead removido',
  'CRM-004': 'Etapa de lead alterada',
  'CRM-005': 'Prioridade de lead alterada',
  'CRM-006': 'Conversa adicionada ao lead',
  'CRM-007': 'Lead restaurado via undo',

  // FIN — financeiro
  'FIN-001': 'Transação criada',
  'FIN-002': 'Transação atualizada',
  'FIN-003': 'Transação removida',
  'FIN-004': 'Recebimento confirmado',
  'FIN-005': 'Meta financeira salva',
  'FIN-006': 'Pagamento de recorrência salvo',

  // WRK — tarefas / serviços em andamento
  'WRK-001': 'Serviço criado',
  'WRK-002': 'Serviço atualizado',
  'WRK-003': 'Serviço concluído',
  'WRK-004': 'Serviço removido',

  // ZAP — WhatsApp / SlacZap
  'ZAP-001': 'Mensagem enviada via WhatsApp',
  'ZAP-002': 'Arquivo enviado via WhatsApp',
  'ZAP-003': 'Script de prospecção gerado via IA',
  'ZAP-004': 'Template de WhatsApp salvo',
  'ZAP-005': 'Template de WhatsApp removido',
  'ZAP-006': 'Configuração WhatsApp salva',
  'ZAP-007': 'WhatsApp desconectado',
  'ZAP-008': 'Conversas atualizadas manualmente',

  // SDR — agente autônomo de vendas
  'SDR-001': 'SDR global ativado',
  'SDR-002': 'SDR global desativado',
  'SDR-003': 'SDR ativado/desativado em chat',
  'SDR-004': 'Configuração SDR salva',

  // PRO — prospecção CSV
  'PRO-001': 'CSV importado na prospecção',
  'PRO-002': 'Lead marcado como contatado / enviado ao CRM',

  // SYS — sistema / erros gerais
  'SYS-001': 'Erro de sistema',
  'SYS-002': 'Inicialização do app concluída',
  'SYS-003': 'Logs limpos manualmente',
}

// Mapeamento prefixo → valor da coluna source na tabela logs
const SOURCE_MAP = {
  AUTH: 'auth',
  CRM:  'crm',
  FIN:  'fin',
  WRK:  'work',
  ZAP:  'zap',
  SDR:  'sdr',
  PRO:  'pro',
  SYS:  'sys',
}

/**
 * Registra um evento no painel de Logs do SLAC (tabela `logs` no Supabase).
 * Fire-and-forget — nunca bloqueia o fluxo principal.
 *
 * @param {string} code   - Código do log, ex: 'CRM-001'
 * @param {string} message - Mensagem legível (substitui o padrão do código se fornecida)
 * @param {object|null} extra  - Dados extras opcionais (JSON)
 * @param {'info'|'warn'|'error'} level - Nível do log
 */
export function slacLog(code, message, extra = null, level = 'info') {
  try {
    const userId = uid()
    if (!userId) return
    const prefix = code?.split('-')[0] || 'SYS'
    const source = SOURCE_MAP[prefix] || 'frontend'
    const msg    = message || LOG_CODES[code] || code
    sb.from('logs').insert({
      user_id: userId,
      level,
      source,
      message: msg,
      data: { code, ...(extra && typeof extra === 'object' ? extra : {}) },
    }).then(() => {})
  } catch {}
}
