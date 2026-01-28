import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger('edge-function', 'parse-faqs');

const CATEGORY_MAP: Record<string, string[]> = {
  areas_comuns: ["piscina", "churrasqueira", "salão", "academia", "quadra", "playground", "sauna", "spa"],
  financeiro: ["taxa", "condomínio", "boleto", "pagamento", "multa", "cobrança", "débito"],
  regras: ["regimento", "regulamento", "proibido", "permitido", "horário", "silêncio", "barulho"],
  mudancas: ["mudança", "mudanças", "móveis", "caminhão", "frete"],
  visitantes: ["visitante", "visita", "convidado", "portaria", "acesso", "entrada"],
  encomendas: ["encomenda", "pacote", "entrega", "correio", "transportadora"],
  manutencao: ["manutenção", "reparo", "conserto", "vazamento", "elétrica", "hidráulica"],
  animais: ["animal", "pet", "cachorro", "gato", "animais"],
  veiculos: ["veículo", "carro", "moto", "garagem", "estacionamento", "vaga"]
};

function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return category;
    }
  }
  return "geral";
}

serve(async (req) => {
  const requestId = generateRequestId();
  const clientIP = getClientIP(req);
  const startTime = performance.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      await logger.error('LOVABLE_API_KEY não configurada', { clientIP }, undefined, requestId);
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      await logger.warn('Texto não fornecido ou inválido', { clientIP }, undefined, requestId);
      return new Response(
        JSON.stringify({ error: "Texto não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await logger.info('Processando texto para extração de FAQs', { 
      textLength: text.length,
      clientIP,
    }, undefined, requestId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair FAQs de textos.

Dado um texto, identifique pares de pergunta e resposta e organize-os.

REGRAS:
1. Extraia TODAS as perguntas e respostas identificáveis no texto
2. Se o texto não tiver formato claro de P&R, infira perguntas a partir das informações
3. Mantenha as respostas completas e informativas
4. Categorize cada FAQ em uma destas categorias: geral, areas_comuns, financeiro, regras, mudancas, visitantes, encomendas, manutencao, animais, veiculos

RESPONDA APENAS com um JSON válido no formato:
{
  "faqs": [
    {
      "question": "Pergunta clara e objetiva?",
      "answer": "Resposta completa e informativa.",
      "category": "categoria"
    }
  ]
}

Se não conseguir identificar FAQs, retorne: {"faqs": []}`
          },
          {
            role: "user",
            content: `Extraia as FAQs do seguinte texto:\n\n${text}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      await logger.error('Erro no AI Gateway', { 
        status: response.status,
        errorText,
      }, undefined, requestId);
      throw new Error("Erro ao processar com IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let faqs: { question: string; answer: string; category: string }[] = [];
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.faqs)) {
          faqs = parsed.faqs.map((faq: any) => ({
            question: String(faq.question || "").trim(),
            answer: String(faq.answer || "").trim(),
            category: faq.category || detectCategory(faq.question + " " + faq.answer)
          })).filter((faq: any) => faq.question && faq.answer);
        }
      }
    } catch (parseError) {
      await logger.warn('Erro ao parsear JSON da resposta de IA', { 
        error: parseError instanceof Error ? parseError.message : String(parseError),
      }, undefined, requestId);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    await logger.info('FAQs extraídas com sucesso', {
      faqsCount: faqs.length,
      latency_ms: latencyMs,
    }, undefined, requestId);

    return new Response(
      JSON.stringify({ faqs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    
    await logger.error('Erro ao processar FAQs', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latency_ms: latencyMs,
      clientIP,
    }, undefined, requestId);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
