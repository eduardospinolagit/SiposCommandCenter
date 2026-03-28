import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { messages, scriptBase, leadInfo, tom, tipo } = await req.json()

    if (!messages?.length) {
      return json({ error: 'messages obrigatório' }, 400)
    }

    const isFollowup = tipo === 'followup'

    const historico = (messages as { direcao: string; mensagem: string }[])
      .filter((m) => m.mensagem && !['[IMG]','[AUDIO]','[VIDEO]','[DOC:'].some(p => m.mensagem.startsWith(p)))
      .slice(-15)
      .map((m) => `[${m.direcao === 'enviado' ? 'Você' : 'Lead'}] ${m.mensagem}`)
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
      : '\n(Script de vendas não configurado — use boas práticas de vendas consultivas.)\n'

    const tomInstrucaoResposta: Record<string, string> = {
      recomendado: 'Use o tom mais eficaz para o momento da conversa — equilibre rapport, clareza e avanço no funil.',
      estrategico: 'Use um tom estratégico e consultivo. Faça perguntas que revelam objeções, crie urgência sutil e conduza o lead ao próximo passo sem pressionar diretamente.',
      direto:      'Use um tom direto e objetivo. Vá direto ao ponto, sem rodeios. Mensagens curtas e assertivas — sem enrolação.',
    }

    const tomInstrucaoFollowup: Record<string, string> = {
      recomendado: 'Use o tom mais natural possível — casual, humano, sem parecer roteiro de vendas. O objetivo é reabrir a conversa.',
      estrategico: 'Crie um senso de oportunidade ou urgência sutil. Mostre que há valor em responder agora, sem pressionar diretamente.',
      direto:      'Seja bem curto e direto. Uma linha só. Pergunte algo simples que seja fácil de responder.',
    }

    const tomLabel = isFollowup
      ? (tomInstrucaoFollowup[tom as string] ?? tomInstrucaoFollowup['recomendado'])
      : (tomInstrucaoResposta[tom as string] ?? tomInstrucaoResposta['recomendado'])

    let prompt: string

    if (isFollowup) {
      prompt = `Você é um vendedor da Sano Lab, empresa que cria sites para pequenas empresas.
Pacotes: Essencial R$797 / Profissional R$1.097 / Completo R$1.397.
${scriptSection}
INFORMAÇÕES DO LEAD:
- Nome: ${leadInfo?.nome || 'desconhecido'}
- Etapa no funil: ${etapaLabel[leadInfo?.etapa] || leadInfo?.etapa || 'não informada'}

HISTÓRICO DA CONVERSA (mais recente por último):
${historico}

O lead parou de responder. Crie uma mensagem de follow-up para reabrir o contato.

TOM: ${tomLabel}

REGRAS:
- Responda APENAS com o texto da mensagem — sem explicações, sem aspas, sem prefixo
- Linguagem natural e informal (pt-BR), como num WhatsApp real
- NÃO seja insistente nem pareça desespero — seja leve e humano
- NÃO repita a proposta de valor inteira — seja sutil
- Máximo 2 frases curtas
- Nunca prometa o que não está nos pacotes`
    } else {
      prompt = `Você é um assistente de vendas especializado. Sua tarefa é sugerir a próxima mensagem ideal para responder ao lead.

CONTEXTO DO NEGÓCIO:
- Empresa: Sano Lab — criação de sites para pequenas empresas
- Pacotes: Essencial R$797 / Profissional R$1.097 / Completo R$1.397
${scriptSection}
INFORMAÇÕES DO LEAD:
- Nome: ${leadInfo?.nome || 'desconhecido'}
- Etapa no funil: ${etapaLabel[leadInfo?.etapa] || leadInfo?.etapa || 'não informada'}

HISTÓRICO DA CONVERSA (mais recente por último):
${historico}

Analise a conversa e sugira a resposta mais eficaz para avançar no processo de vendas.

TOM DA RESPOSTA: ${tomLabel}

REGRAS:
- Responda APENAS com o texto da mensagem — sem explicações, sem aspas, sem prefixo "Sugestão:"
- Use linguagem natural e informal (pt-BR), como numa conversa de WhatsApp
- Seja direto e conciso — mensagens curtas têm mais taxa de resposta
- Se o lead fez uma pergunta, responda-a diretamente antes de prosseguir com o pitch
- Nunca prometa o que não está nos pacotes
- Se o lead parece pronto para fechar, direcione para o próximo passo concreto`
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const sugestao = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    return json({ sugestao })
  } catch (e) {
    console.error('[sugerir-resposta] erro:', e)
    return json({ error: String(e) }, 500)
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
