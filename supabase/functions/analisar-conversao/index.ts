import Anthropic from 'https://esm.sh/@anthropic-ai/sdk'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const { leads: ld, financeiro: fin, scriptBase, nichos } = await req.json()

    const total      = ld.total || 0
    const fechados   = ld.por_etapa?.fechado || 0
    const perdidos   = ld.por_etapa?.perdido || 0
    const emNeg      = (ld.por_etapa?.demo || 0) + (ld.por_etapa?.negociacao || 0)
    const taxaConv   = total > 0 ? Math.round(fechados / total * 100) : 0
    const taxaPerda  = total > 0 ? Math.round(perdidos / total * 100) : 0

    const scriptSection = scriptBase
      ? `\nSCRIPT DE VENDAS ATUAL:\n"""\n${scriptBase}\n"""\n`
      : null

    const nichoSection = nichos?.length
      ? `\nNICHOS/CATEGORIAS (mín. 2 leads cada):\n` +
        nichos.map((n: { nome: string; total: number; fechados: number; perdidos: number; negociando: number; taxa: number }) =>
          `- ${n.nome}: ${n.total} leads | ${n.fechados} fechados (${n.taxa}%) | ${n.perdidos} perdidos | ${n.negociando} negociando`
        ).join('\n') + '\n'
      : null

    const prompt = `Você é um consultor de vendas analisando métricas da Sano Lab, empresa que cria sites para pequenas empresas.
Pacotes: Essencial R$797 / Profissional R$1.097 / Completo R$1.397.

FUNIL DE VENDAS:
- Total de leads no CRM: ${total}
- Contato: ${ld.por_etapa?.contato || 0} | Interesse: ${ld.por_etapa?.interesse || 0} | Demo: ${ld.por_etapa?.demo || 0} | Negociação: ${ld.por_etapa?.negociacao || 0}
- Fechados: ${fechados} (${taxaConv}% de conversão) | Perdidos: ${perdidos} (${taxaPerda}% de perda)
- Em negociação ativa (demo+negoc): ${emNeg}
- Follow-ups vencidos/atrasados: ${ld.fu_vencidos}
- Pipeline potencial: R$${ld.pipeline}

FINANCEIRO (período selecionado):
- Receita recebida: R$${fin.receita}
- A receber (pendente): R$${fin.pendente}
- Despesas: R$${fin.despesas}
- Lucro: R$${fin.lucro}
- Clientes pagos: ${fin.clientes}
- Receita últimos 6 meses (mais antigo → mais recente): ${(fin.rec6 || []).map((v: number) => 'R$'+v).join(' → ')}
${scriptSection || ''}${nichoSection || ''}
Analise as métricas e retorne APENAS um JSON válido sem markdown:
{
  "score": <0-100, saúde geral do funil>,
  "label": <"Ótimo" | "Bom" | "Regular" | "Crítico">,
  "insights": [
    { "tipo": <"positivo" | "atencao" | "negativo">, "texto": "<insight direto, máx 12 palavras>" },
    { "tipo": "...", "texto": "..." },
    { "tipo": "...", "texto": "..." }
  ],
  "recomendacao": "<ação concreta e específica para o funil, máx 18 palavras>",
  ${scriptSection ? `"script": {
    "score": <0-100, qualidade do script>,
    "pontos_fortes": ["<ponto forte 1, máx 10 palavras>", "<ponto forte 2>"],
    "pontos_fracos": ["<ponto fraco 1, máx 10 palavras>"],
    "sugestao": "<uma melhoria concreta para o script, máx 20 palavras>"
  }` : '"script": null'},
  ${nichoSection ? `"nichos": [
    { "nome": "<nome do nicho>", "taxa": <taxa conversão 0-100>, "total": <total leads>, "status": <"otimo"|"bom"|"regular"|"fraco"> },
    ...todos os nichos ordenados do maior para o menor taxa de conversão
  ],
  "nichos_insight": "<observação principal sobre os nichos, máx 18 palavras>"` : '"nichos": [], "nichos_insight": null'}
}

CRITÉRIOS DE SCORE DO FUNIL (base 50):
+20 se taxa de conversão > 15%
+10 bônus se taxa de conversão > 25%
+15 se leads em negociação ativa ≥ 3
+15 se follow-ups em dia (0 vencidos)
+20 se lucro positivo
+10 se receita crescente nos últimos 3 meses
-20 se mais perdidos que fechados
-15 se follow-ups vencidos > 5
-10 se receita pendente > receita recebida
-10 se lucro negativo

CRITÉRIOS DE SCORE DO SCRIPT (se fornecido):
+20 se tem abertura personalizada (usa nome/nicho do lead)
+20 se tem proposta de valor clara com benefício específico
+20 se tem CTA claro (próximo passo definido)
+15 se tem tratamento de objeções
+15 se tem urgência ou diferencial competitivo
-20 se é muito longo (mais de 300 palavras) e genérico
-15 se não menciona preço ou forma de apresentá-lo
-10 se usa linguagem formal demais para WhatsApp

CRITÉRIOS DE STATUS DO NICHO:
"otimo": taxa de conversão ≥ 30%
"bom": taxa de conversão 15-29%
"regular": taxa de conversão 5-14%
"fraco": taxa de conversão < 5% ou 0 fechados`

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw   = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(clean)
    return json(result)
  } catch (e) {
    console.error('[analisar-conversao] erro:', e)
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
