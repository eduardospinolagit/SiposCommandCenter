import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { messages, leadInfo, scriptBase } = await req.json()

    if (!messages?.length) {
      return json({ error: 'messages obrigatório' }, 400)
    }

    const MEDIA_PREFIXES = ['[IMG]', '[AUDIO]', '[VIDEO]', '[DOC:']
    const historico = (messages as { direcao: string; mensagem: string }[])
      .filter(m => m.mensagem && !MEDIA_PREFIXES.some(p => m.mensagem.startsWith(p)))
      .slice(-20)
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

    const scriptSection = scriptBase
      ? `\nSCRIPT DE VENDAS:\n${scriptBase}\n`
      : '\n(Script não configurado — use boas práticas de vendas consultivas.)\n'

    const prompt = `Você é um SDR (Sales Development Representative) da Sano Lab, empresa que cria sites para pequenas empresas.
Pacotes: Essencial R$797 / Profissional R$1.097 / Completo R$1.397.
${scriptSection}
LEAD:
- Nome: ${leadInfo?.nome || 'desconhecido'}
- Negócio/nicho: ${leadInfo?.negocio || 'não informado'}
- Etapa: ${etapaLabel[leadInfo?.etapa] || leadInfo?.etapa || 'não informada'}

HISTÓRICO DA CONVERSA (mais recente por último):
${historico}

Analise a última mensagem do lead e decida se você pode responder ou se deve escalar para atendimento humano.

Retorne APENAS um JSON válido sem markdown:
{
  "acao": "responder" | "escalar",
  "mensagem": "texto da resposta (apenas se acao=responder, máx 2 frases curtas, tom casual pt-BR)",
  "motivo": "breve motivo da escalada (apenas se acao=escalar)"
}

CRITÉRIOS PARA ESCALAR (ação humana necessária):
- Lead pediu desconto ou negociação de preço
- Lead está irritado, frustrado ou fez reclamação
- Lead fez pergunta técnica específica que você não sabe responder
- Lead parece pronto para fechar — deixe o humano fazer o fechamento
- Conversa está complexa demais para automação

CRITÉRIOS PARA RESPONDER (SDR pode lidar):
- Curiosidade inicial sobre o serviço
- Dúvidas simples sobre os pacotes (prazo, o que inclui, etc.)
- Lead pedindo mais informações básicas
- Qualificação de perfil (que tipo de negócio tem, etc.)

REGRAS DE RESPOSTA:
- Mensagens curtas (1-2 frases) têm muito mais resposta no WhatsApp
- Use linguagem natural e informal, como numa conversa real
- Nunca prometa o que não está nos pacotes
- Não use emojis em excesso`

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(clean)
    return json(result)
  } catch (e) {
    console.error('[sdr-responder] erro:', e)
    return json({ error: 'Erro interno' }, 500)
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
