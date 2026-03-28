import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { messages, leadInfo } = await req.json()
    if (!messages?.length) {
      return json({ error: 'messages obrigatório' }, 400)
    }

    const MEDIA_PREFIXES = ['[IMG]', '[AUDIO]', '[VIDEO]', '[DOC:']
    const conversa = (messages as { direcao: string; mensagem: string }[])
      .filter(m => m.mensagem && !MEDIA_PREFIXES.some(p => m.mensagem.startsWith(p)))
      .slice(-30)
      .map(m => `[${m.direcao === 'enviado' ? 'Você' : 'Lead'}] ${m.mensagem}`)
      .join('\n')

    const etapaLabel: Record<string, string> = {
      contato:    'primeiro contato',
      interesse:  'demonstrou interesse',
      demo:       'em demonstração',
      negociacao: 'em negociação',
      fechado:    'cliente fechado',
      perdido:    'negócio perdido',
    }

    const leadSection = leadInfo ? `
DADOS DO LEAD:
- Nome: ${leadInfo.nome || 'desconhecido'}
- Negócio/nicho: ${leadInfo.negocio || 'não informado'}
- Categoria: ${leadInfo.categoria || 'não informada'}
- Cidade: ${leadInfo.cidade || 'não informada'}
- Etapa no funil: ${etapaLabel[leadInfo.etapa] || leadInfo.etapa || 'não informada'}
- Valor estimado: ${leadInfo.valor_estimado ? 'R$ ' + leadInfo.valor_estimado : 'não informado'}
` : ''

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `Você é um especialista em vendas da Sano Lab, empresa que cria sites para pequenas empresas.
Pacotes: Essencial R$797 / Profissional R$1.097 / Completo R$1.397.
${leadSection}
Analise a conversa abaixo e retorne APENAS um JSON válido, sem markdown, com os campos:
- score (integer 0-100): probabilidade de fechar negócio considerando o perfil do lead e a conversa
- resumo (string, máximo 2 frases): avaliação objetiva do potencial do lead
- positivos (array de strings, máximo 4): sinais positivos detectados
- atencao (array de strings, máximo 4): objeções ou pontos de atenção
- proximoPasso (string, máximo 1 frase): ação recomendada para avançar no funil

Critérios de score:
- >75: lead quente, alta chance de fechar
- 50-75: lead morno, precisa de nutrição
- 25-50: lead frio, baixo engajamento
- <25: lead desinteressado ou perdido

CONVERSA:
${conversa}`
      }]
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    // Remove markdown code fences if present
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(clean)
    return json(result)
  } catch (e) {
    console.error('[analyze-lead] erro:', e)
    return json({ error: 'Erro ao analisar' }, 500)
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
