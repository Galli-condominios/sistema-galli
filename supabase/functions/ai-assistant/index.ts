import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  checkRateLimit, 
  rateLimitResponse, 
  RATE_LIMITS, 
  getClientIdentifier 
} from "../_shared/rate-limiter.ts";
import { createLogger, generateRequestId, getClientIP } from "../_shared/system-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger('edge-function', 'ai-assistant');

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserContext {
  userId: string;
  role: string;
  userName: string;
  unitId?: string;
  unitNumber?: string;
  condominiumId?: string;
  condominiumName?: string;
  organizationId?: string;
}

interface UsageStatsParams {
  userId: string;
  conversationId?: string;
  condominiumId?: string;
  question: string;
  toolsUsed?: string[];
  responseTimeMs?: number;
}

// Track AI usage for statistics
async function trackUsageStats(supabase: any, params: UsageStatsParams) {
  try {
    // Detect question category from common keywords
    const categoryKeywords: Record<string, string[]> = {
      areas_comuns: ["piscina", "churrasqueira", "salão", "academia", "quadra", "reserva"],
      financeiro: ["taxa", "boleto", "pagamento", "cobrança", "condomínio", "valor"],
      regras: ["regimento", "regra", "permitido", "proibido", "pode", "horário"],
      visitantes: ["visitante", "visita", "autorização", "portaria"],
      encomendas: ["encomenda", "pacote", "entrega", "correio"],
      manutencao: ["manutenção", "ocorrência", "reparo", "problema", "vazamento"],
    };

    let category = null;
    const lowerQuestion = params.question.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => lowerQuestion.includes(kw))) {
        category = cat;
        break;
      }
    }

    await supabase.from("ai_usage_stats").insert({
      user_id: params.userId,
      conversation_id: params.conversationId || null,
      condominium_id: params.condominiumId || null,
      question: params.question,
      question_category: category,
      tools_used: params.toolsUsed || [],
      response_time_ms: params.responseTimeMs || null,
      was_resolved: null // Will be updated later if feedback is implemented
    });

    console.log("Usage stats tracked for question category:", category);
  } catch (error) {
    console.error("Failed to track usage stats:", error);
    // Don't throw - this is non-critical
  }
}

// Tool definitions based on user role
const getToolsForRole = (role: string) => {
  const baseTools = [
    {
      type: "function",
      function: {
        name: "search_documents",
        description: "Busca informações em documentos do condomínio (atas de reunião, regimento interno, convenção, comunicados, manuais). Use esta ferramenta para responder perguntas sobre regras, regulamentos, decisões de assembleias e políticas do condomínio.",
        parameters: {
          type: "object",
          properties: {
            search_term: { type: "string", description: "Termo de busca para encontrar no conteúdo dos documentos" },
            category: { type: "string", enum: ["ata", "regimento", "convencao", "comunicado", "manual", "contrato", "outro", "all"], description: "Categoria do documento" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_user_charges",
        description: "Busca cobranças financeiras do usuário ou unidade específica. Retorna informações sobre taxa de condomínio, multas, taxas extras.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pendente", "pago", "atrasado", "all"], description: "Filtrar por status" },
            limit: { type: "number", description: "Número máximo de resultados" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_reservations",
        description: "Busca reservas de áreas comuns do usuário ou do condomínio.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pendente", "aprovada", "rejeitada", "cancelada", "all"], description: "Filtrar por status" },
            upcoming: { type: "boolean", description: "Apenas reservas futuras" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_maintenance_requests",
        description: "Busca ocorrências e solicitações de manutenção.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["aberto", "em_andamento", "concluido", "cancelado", "all"], description: "Filtrar por status" },
            limit: { type: "number", description: "Número máximo de resultados" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_packages",
        description: "Busca encomendas pendentes ou coletadas.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["aguardando", "coletado", "all"], description: "Filtrar por status" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_visitor_authorizations",
        description: "Busca autorizações de visitantes ativas ou históricas.",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ativa", "utilizada", "expirada", "cancelada", "all"], description: "Filtrar por status" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_common_areas",
        description: "Lista todas as áreas comuns disponíveis no condomínio com informações de capacidade, regras e política de cancelamento.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_area_availability",
        description: "Verifica a disponibilidade de uma área comum em uma data específica, mostrando horários ocupados e livres.",
        parameters: {
          type: "object",
          properties: {
            area_name: { type: "string", description: "Nome da área comum (ex: Churrasqueira, Salão de Festas)" },
            date: { type: "string", description: "Data para verificar (YYYY-MM-DD)" }
          },
          required: ["area_name", "date"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "universal_search",
        description: "Busca inteligente em todo o sistema - moradores, unidades, documentos, ocorrências e visitantes. Use quando o usuário fizer uma pergunta geral ou buscar por nome/número.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Termo de busca (nome, número de unidade, etc)" }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_faq",
        description: "Busca respostas na base de conhecimento e FAQ do condomínio. Use para responder dúvidas comuns sobre regras, horários, procedimentos e informações gerais.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Pergunta ou termo de busca" },
            category: { type: "string", description: "Categoria opcional para filtrar" }
          },
          required: ["query"]
        }
      }
    }
  ];

  const residentTools = [
    {
      type: "function",
      function: {
        name: "create_maintenance_request",
        description: "Cria uma nova ocorrência ou solicitação de manutenção.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título da ocorrência" },
            description: { type: "string", description: "Descrição detalhada" },
            category: { type: "string", enum: ["reclamacao", "sugestao", "manutencao", "limpeza", "seguranca", "outro"], description: "Categoria" },
            priority: { type: "string", enum: ["baixa", "media", "alta", "urgente"], description: "Prioridade" },
            location: { type: "string", description: "Local do problema" }
          },
          required: ["title", "description", "category"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_visitor_authorization",
        description: "Cria uma autorização de entrada para visitante ou prestador de serviço.",
        parameters: {
          type: "object",
          properties: {
            visitor_name: { type: "string", description: "Nome do visitante" },
            visitor_document: { type: "string", description: "CPF ou RG do visitante" },
            visitor_phone: { type: "string", description: "Telefone do visitante" },
            valid_from: { type: "string", description: "Data/hora início da autorização (ISO 8601)" },
            valid_until: { type: "string", description: "Data/hora fim da autorização (ISO 8601)" },
            service_type: { type: "string", description: "Tipo de serviço (se for prestador)" },
            notes: { type: "string", description: "Observações adicionais" }
          },
          required: ["visitor_name", "visitor_document", "valid_from", "valid_until"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_reservation",
        description: "Cria uma nova reserva de área comum.",
        parameters: {
          type: "object",
          properties: {
            area_name: { type: "string", description: "Nome da área comum a reservar" },
            date: { type: "string", description: "Data da reserva (YYYY-MM-DD)" },
            start_time: { type: "string", description: "Horário de início (HH:MM)" },
            end_time: { type: "string", description: "Horário de término (HH:MM)" },
            guests_count: { type: "number", description: "Número de convidados" },
            notes: { type: "string", description: "Observações adicionais" }
          },
          required: ["area_name", "date", "start_time", "end_time"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "cancel_reservation",
        description: "Cancela uma reserva existente do morador.",
        parameters: {
          type: "object",
          properties: {
            reservation_id: { type: "string", description: "ID da reserva a cancelar" }
          },
          required: ["reservation_id"]
        }
      }
    }
  ];

  const adminTools = [
    {
      type: "function",
      function: {
        name: "get_financial_summary",
        description: "Retorna resumo financeiro do condomínio: total a receber, total recebido, inadimplência.",
        parameters: {
          type: "object",
          properties: {
            month: { type: "number", description: "Mês (1-12)" },
            year: { type: "number", description: "Ano" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_delinquent_units",
        description: "Lista unidades inadimplentes com valores e tempo de atraso.",
        parameters: {
          type: "object",
          properties: {
            min_days_overdue: { type: "number", description: "Mínimo de dias em atraso" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_financial_charge",
        description: "Cria uma nova cobrança para uma unidade específica.",
        parameters: {
          type: "object",
          properties: {
            unit_id: { type: "string", description: "ID da unidade" },
            charge_type: { type: "string", enum: ["condominio", "extra", "multa", "outros"], description: "Tipo da cobrança" },
            amount: { type: "number", description: "Valor em reais" },
            due_date: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
            description: { type: "string", description: "Descrição da cobrança" }
          },
          required: ["unit_id", "charge_type", "amount", "due_date"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_reservation_status",
        description: "Atualiza o status de uma reserva (aprovar/rejeitar).",
        parameters: {
          type: "object",
          properties: {
            reservation_id: { type: "string", description: "ID da reserva" },
            status: { type: "string", enum: ["aprovada", "rejeitada", "cancelada"], description: "Novo status" }
          },
          required: ["reservation_id", "status"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_units_summary",
        description: "Retorna resumo das unidades: total, ocupadas, vagas.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "get_residents_summary",
        description: "Retorna resumo dos moradores: total, ativos, por tipo.",
        parameters: { type: "object", properties: {} }
      }
    },
    // ========== NEW ASSOCIATIVE TOOLS FOR ADMIN ==========
    {
      type: "function",
      function: {
        name: "get_unit_full_profile",
        description: "Retorna perfil COMPLETO de uma unidade com TODOS os dados associados: moradores, veículos, cobranças pendentes, reservas, encomendas, autorizações de visitantes e ocorrências. Use para ter visão 360° de uma unidade.",
        parameters: {
          type: "object",
          properties: {
            unit_number: { type: "string", description: "Número do apartamento" }
          },
          required: ["unit_number"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_resident_full_profile",
        description: "Retorna perfil COMPLETO de um morador com dados da unidade, histórico financeiro, reservas, ocorrências e visitantes autorizados.",
        parameters: {
          type: "object",
          properties: {
            name_search: { type: "string", description: "Nome do morador para buscar" }
          },
          required: ["name_search"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_daily_summary",
        description: "Retorna resumo associativo do dia: reservas agendadas, visitantes autorizados, encomendas aguardando, cobranças vencendo e ocorrências prioritárias.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data para o resumo (YYYY-MM-DD). Se não informada, usa hoje." }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "compare_units",
        description: "Compara unidades por métricas: inadimplência, reservas ou ocorrências. Retorna ranking das unidades.",
        parameters: {
          type: "object",
          properties: {
            metric: { type: "string", enum: ["inadimplencia", "reservas", "ocorrencias"], description: "Métrica para comparar" },
            top_n: { type: "number", description: "Número de unidades a mostrar (padrão: 5)" }
          },
          required: ["metric"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_delinquency_trends",
        description: "Analisa tendências de inadimplência ao longo dos meses, identificando padrões e unidades recorrentes.",
        parameters: {
          type: "object",
          properties: {
            months: { type: "number", description: "Número de meses para análise (padrão: 6)" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_area_usage_stats",
        description: "Retorna estatísticas de uso de áreas comuns: área mais reservada, ocupação média, horários de pico.",
        parameters: {
          type: "object",
          properties: {
            period: { type: "string", enum: ["month", "quarter", "year"], description: "Período de análise" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "send_notification",
        description: "Envia notificação para um ou mais usuários do sistema.",
        parameters: {
          type: "object",
          properties: {
            target: { type: "string", enum: ["unit", "all", "admins"], description: "Alvo da notificação" },
            unit_number: { type: "string", description: "Número da unidade (se target=unit)" },
            title: { type: "string", description: "Título da notificação" },
            message: { type: "string", description: "Mensagem da notificação" },
            priority: { type: "string", enum: ["normal", "high", "urgent"], description: "Prioridade" }
          },
          required: ["target", "title", "message"]
        }
      }
    }
  ];

  const doorkeeperTools = [
    {
      type: "function",
      function: {
        name: "register_package",
        description: "Registra uma nova encomenda para uma unidade.",
        parameters: {
          type: "object",
          properties: {
            unit_id: { type: "string", description: "ID da unidade destinatária" },
            sender: { type: "string", description: "Remetente" },
            tracking_code: { type: "string", description: "Código de rastreio" },
            description: { type: "string", description: "Descrição do pacote" }
          },
          required: ["unit_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "mark_package_collected",
        description: "Marca uma encomenda como coletada.",
        parameters: {
          type: "object",
          properties: {
            package_id: { type: "string", description: "ID da encomenda" }
          },
          required: ["package_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_active_authorizations",
        description: "Lista todas as autorizações de visitantes ativas para hoje.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "search_unit_by_number",
        description: "Busca uma unidade pelo número do apartamento.",
        parameters: {
          type: "object",
          properties: {
            unit_number: { type: "string", description: "Número do apartamento" }
          },
          required: ["unit_number"]
        }
      }
    },
    // Doorkeeper also gets unit full profile for verification
    {
      type: "function",
      function: {
        name: "get_unit_full_profile",
        description: "Retorna perfil completo de uma unidade com moradores, veículos, encomendas e visitantes autorizados. Útil para verificação na portaria.",
        parameters: {
          type: "object",
          properties: {
            unit_number: { type: "string", description: "Número do apartamento" }
          },
          required: ["unit_number"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_daily_summary",
        description: "Retorna resumo do dia para a portaria: reservas agendadas, visitantes autorizados, encomendas aguardando.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data para o resumo (YYYY-MM-DD). Se não informada, usa hoje." }
          }
        }
      }
    }
  ];

  if (role === "morador") {
    return [...baseTools, ...residentTools];
  } else if (role === "administrador" || role === "sindico") {
    return [...baseTools, ...residentTools, ...adminTools];
  } else if (role === "porteiro") {
    return [...baseTools, ...doorkeeperTools];
  }
  return baseTools;
};

// Execute tool functions
async function executeTool(
  supabase: any,
  toolName: string,
  args: any,
  context: UserContext
): Promise<string> {
  console.log(`Executing tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "search_documents": {
        let query = supabase.from("documents").select(`
          id, title, category, description, content_text, created_at,
          condominiums!inner(name)
        `).eq("is_public", true).eq("extraction_status", "completed");
        
        if (context.condominiumId && !["administrador", "sindico"].includes(context.role)) {
          query = query.eq("condominium_id", context.condominiumId);
        }
        if (args.category && args.category !== "all") {
          query = query.eq("category", args.category);
        }
        
        const { data: documents, error } = await query.order("created_at", { ascending: false }).limit(10);
        if (error) throw error;
        
        let results = documents || [];
        if (args.search_term && results.length > 0) {
          const searchLower = args.search_term.toLowerCase();
          results = results.filter((doc: any) => 
            doc.title?.toLowerCase().includes(searchLower) ||
            doc.content_text?.toLowerCase().includes(searchLower) ||
            doc.description?.toLowerCase().includes(searchLower)
          );
        }
        
        const formattedDocs = results.map((doc: any) => {
          let excerpt = doc.content_text || "";
          if (args.search_term && excerpt) {
            const searchLower = args.search_term.toLowerCase();
            const idx = excerpt.toLowerCase().indexOf(searchLower);
            if (idx !== -1) {
              const start = Math.max(0, idx - 200);
              const end = Math.min(excerpt.length, idx + 500);
              excerpt = (start > 0 ? "..." : "") + excerpt.substring(start, end) + (end < excerpt.length ? "..." : "");
            } else {
              excerpt = excerpt.substring(0, 700) + (excerpt.length > 700 ? "..." : "");
            }
          } else {
            excerpt = excerpt.substring(0, 700) + (excerpt.length > 700 ? "..." : "");
          }
          
          return {
            title: doc.title,
            category: doc.category,
            condominium: doc.condominiums?.name,
            content_excerpt: excerpt,
            created_at: doc.created_at
          };
        });
        
        return JSON.stringify({ 
          documents: formattedDocs, 
          count: formattedDocs.length,
          message: formattedDocs.length === 0 ? "Nenhum documento encontrado com os critérios especificados." : null
        });
      }

      case "search_faq": {
        let query = supabase.from("ai_knowledge_base").select("*").eq("is_active", true);
        
        if (args.category) {
          query = query.eq("category", args.category);
        }
        
        const { data: entries, error } = await query.order("priority", { ascending: false }).limit(10);
        if (error) throw error;
        
        let results = entries || [];
        if (args.query && results.length > 0) {
          const searchLower = args.query.toLowerCase();
          results = results.filter((entry: any) => 
            entry.question?.toLowerCase().includes(searchLower) ||
            entry.answer?.toLowerCase().includes(searchLower)
          );
        }
        
        // Also search AI-enabled documents
        const { data: aiDocs } = await supabase
          .from("documents")
          .select("id, title, content_text, category")
          .eq("ai_enabled", true)
          .eq("extraction_status", "completed");
        
        let docResults: any[] = [];
        if (aiDocs && args.query) {
          const searchLower = args.query.toLowerCase();
          docResults = aiDocs.filter((doc: any) => 
            doc.title?.toLowerCase().includes(searchLower) ||
            doc.content_text?.toLowerCase().includes(searchLower)
          ).slice(0, 3).map((doc: any) => ({
            type: "document",
            title: doc.title,
            excerpt: doc.content_text?.substring(0, 500) || ""
          }));
        }
        
        return JSON.stringify({ 
          knowledge: results.map((e: any) => ({
            type: e.type,
            question: e.question,
            answer: e.answer,
            category: e.category
          })),
          documents: docResults,
          count: results.length + docResults.length
        });
      }

      case "get_user_charges": {
        let query = supabase.from("financial_charges").select(`
          id, charge_type, amount, due_date, status, description, payment_date,
          units!inner(unit_number, block)
        `);
        
        if (context.role === "morador" && context.unitId) {
          query = query.eq("unit_id", context.unitId);
        }
        if (args.status && args.status !== "all") {
          query = query.eq("status", args.status);
        }
        query = query.order("due_date", { ascending: false }).limit(args.limit || 10);
        
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify({ charges: data, count: data?.length || 0 });
      }

      case "get_reservations": {
        let query = supabase.from("reservations").select(`
          id, reservation_date, start_time, end_time, status, notes, guests_count,
          common_areas!inner(name),
          units!inner(unit_number),
          residents!inner(id, user_id)
        `);
        
        if (context.role === "morador") {
          query = query.eq("residents.user_id", context.userId);
        }
        if (args.status && args.status !== "all") {
          query = query.eq("status", args.status);
        }
        if (args.upcoming) {
          query = query.gte("reservation_date", new Date().toISOString().split("T")[0]);
        }
        query = query.order("reservation_date", { ascending: true }).limit(10);
        
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify({ reservations: data, count: data?.length || 0 });
      }

      case "get_maintenance_requests": {
        let residentId = null;
        if (context.role === "morador") {
          const { data: resident } = await supabase
            .from("residents")
            .select("id")
            .eq("user_id", context.userId)
            .single();
          residentId = resident?.id;
        }
        
        let query = supabase.from("maintenance_requests").select(`
          id, title, description, category, priority, status, location, created_at,
          units(unit_number)
        `);
        
        if (context.role === "morador" && residentId) {
          query = query.or(`is_public.eq.true,resident_id.eq.${residentId}`);
        }
        if (args.status && args.status !== "all") {
          query = query.eq("status", args.status);
        }
        query = query.order("created_at", { ascending: false }).limit(args.limit || 10);
        
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify({ requests: data, count: data?.length || 0 });
      }

      case "get_packages": {
        let query = supabase.from("packages").select(`
          id, sender, tracking_code, description, status, received_at, collected_at,
          units!inner(unit_number)
        `);
        
        if (context.role === "morador" && context.unitId) {
          query = query.eq("unit_id", context.unitId);
        }
        if (args.status && args.status !== "all") {
          query = query.eq("status", args.status);
        }
        query = query.order("received_at", { ascending: false }).limit(10);
        
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify({ packages: data, count: data?.length || 0 });
      }

      case "get_visitor_authorizations": {
        let residentId = null;
        if (context.role === "morador") {
          const { data: resident } = await supabase
            .from("residents")
            .select("id")
            .eq("user_id", context.userId)
            .single();
          residentId = resident?.id;
        }
        
        let query = supabase.from("visitor_authorizations").select(`
          id, visitor_name, visitor_document, visitor_phone, valid_from, valid_until, status, service_type,
          units!inner(unit_number)
        `);
        
        if (context.role === "morador" && residentId) {
          query = query.eq("resident_id", residentId);
        }
        if (args.status && args.status !== "all") {
          query = query.eq("status", args.status);
        }
        query = query.order("valid_from", { ascending: false }).limit(10);
        
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify({ authorizations: data, count: data?.length || 0 });
      }

      case "get_common_areas": {
        let query = supabase.from("common_areas").select(`
          id, name, description, capacity, rules, cancellation_policy, requires_approval,
          condominiums!inner(name)
        `);
        
        if (context.condominiumId && context.role === "morador") {
          query = query.eq("condominium_id", context.condominiumId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return JSON.stringify({ common_areas: data, count: data?.length || 0 });
      }

      case "get_area_availability": {
        // Find area by name
        const { data: areas } = await supabase
          .from("common_areas")
          .select("id, name, capacity")
          .ilike("name", `%${args.area_name}%`)
          .limit(1);
        
        if (!areas || areas.length === 0) {
          return JSON.stringify({ error: `Área comum "${args.area_name}" não encontrada` });
        }
        
        const area = areas[0];
        const date = args.date;
        
        // Get reservations for that date
        const { data: reservations } = await supabase
          .from("reservations")
          .select(`
            id, start_time, end_time, status, guests_count,
            units!inner(unit_number),
            residents!inner(profiles!inner(full_name))
          `)
          .eq("common_area_id", area.id)
          .eq("reservation_date", date)
          .in("status", ["pendente", "aprovada"]);
        
        return JSON.stringify({
          area: area.name,
          date,
          capacity: area.capacity,
          reservations: reservations?.map((r: any) => ({
            time: `${r.start_time} - ${r.end_time}`,
            status: r.status,
            resident: r.residents?.profiles?.full_name,
            unit: r.units?.unit_number,
            guests: r.guests_count
          })) || [],
          total_reservations: reservations?.length || 0
        });
      }

      case "universal_search": {
        const query = args.query?.toLowerCase() || "";
        const results: any = { residents: [], units: [], documents: [], maintenance: [], visitors: [] };
        
        // Search residents by name
        const { data: residents } = await supabase
          .from("residents")
          .select(`
            id, resident_type, is_active,
            profiles!inner(full_name),
            units!inner(unit_number, block)
          `)
          .eq("is_active", true);
        
        results.residents = residents?.filter((r: any) => 
          r.profiles?.full_name?.toLowerCase().includes(query)
        ).slice(0, 5).map((r: any) => ({
          name: r.profiles?.full_name,
          type: r.resident_type,
          unit: r.units?.unit_number,
          block: r.units?.block
        })) || [];
        
        // Search units by number
        const { data: units } = await supabase
          .from("units")
          .select("id, unit_number, block, floor")
          .ilike("unit_number", `%${query}%`)
          .limit(5);
        
        results.units = units || [];
        
        // Search documents
        const { data: docs } = await supabase
          .from("documents")
          .select("id, title, category")
          .or(`title.ilike.%${query}%,content_text.ilike.%${query}%`)
          .eq("is_public", true)
          .limit(5);
        
        results.documents = docs || [];
        
        // Search maintenance requests
        const { data: maintenance } = await supabase
          .from("maintenance_requests")
          .select("id, title, status, category")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(5);
        
        results.maintenance = maintenance || [];
        
        // Search visitors
        const { data: visitors } = await supabase
          .from("visitor_authorizations")
          .select(`
            id, visitor_name, status,
            units!inner(unit_number)
          `)
          .ilike("visitor_name", `%${query}%`)
          .limit(5);
        
        results.visitors = visitors?.map((v: any) => ({
          name: v.visitor_name,
          status: v.status,
          unit: v.units?.unit_number
        })) || [];
        
        const totalResults = results.residents.length + results.units.length + 
          results.documents.length + results.maintenance.length + results.visitors.length;
        
        return JSON.stringify({
          query,
          total_results: totalResults,
          ...results
        });
      }

      case "create_maintenance_request": {
        if (!context.condominiumId) {
          return JSON.stringify({ error: "Condomínio não encontrado" });
        }
        
        let residentId = null;
        if (context.role === "morador") {
          const { data: resident } = await supabase
            .from("residents")
            .select("id")
            .eq("user_id", context.userId)
            .single();
          residentId = resident?.id;
        }
        
        const { data, error } = await supabase.from("maintenance_requests").insert({
          title: args.title,
          description: args.description,
          category: args.category,
          priority: args.priority || "media",
          location: args.location,
          condominium_id: context.condominiumId,
          unit_id: context.unitId,
          resident_id: residentId,
          is_public: true
        }).select().single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Ocorrência criada com sucesso!", request: data });
      }

      case "create_visitor_authorization": {
        if (!context.unitId) {
          return JSON.stringify({ error: "Unidade não encontrada" });
        }
        
        const { data: resident } = await supabase
          .from("residents")
          .select("id")
          .eq("user_id", context.userId)
          .single();
        
        if (!resident) {
          return JSON.stringify({ error: "Morador não encontrado" });
        }
        
        const { data, error } = await supabase.from("visitor_authorizations").insert({
          unit_id: context.unitId,
          resident_id: resident.id,
          visitor_name: args.visitor_name,
          visitor_document: args.visitor_document,
          visitor_phone: args.visitor_phone,
          valid_from: args.valid_from,
          valid_until: args.valid_until,
          service_type: args.service_type,
          notes: args.notes,
          authorization_date: new Date().toISOString().split("T")[0],
          status: "ativa"
        }).select().single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Autorização criada com sucesso!", authorization: data });
      }

      case "create_reservation": {
        if (!context.unitId) {
          return JSON.stringify({ error: "Unidade não encontrada" });
        }
        
        // Get resident_id
        const { data: resident } = await supabase
          .from("residents")
          .select("id")
          .eq("user_id", context.userId)
          .single();
        
        if (!resident) {
          return JSON.stringify({ error: "Morador não encontrado" });
        }
        
        // Find area by name
        const { data: areas } = await supabase
          .from("common_areas")
          .select("id, name, requires_approval")
          .ilike("name", `%${args.area_name}%`)
          .limit(1);
        
        if (!areas || areas.length === 0) {
          return JSON.stringify({ error: `Área comum "${args.area_name}" não encontrada` });
        }
        
        const area = areas[0];
        
        // Check for conflicts
        const { data: conflicts } = await supabase
          .from("reservations")
          .select("id")
          .eq("common_area_id", area.id)
          .eq("reservation_date", args.date)
          .in("status", ["pendente", "aprovada"])
          .or(`and(start_time.lt.${args.end_time},end_time.gt.${args.start_time})`);
        
        if (conflicts && conflicts.length > 0) {
          return JSON.stringify({ error: "Já existe uma reserva neste horário. Por favor, escolha outro horário." });
        }
        
        const { data, error } = await supabase.from("reservations").insert({
          common_area_id: area.id,
          unit_id: context.unitId,
          resident_id: resident.id,
          reservation_date: args.date,
          start_time: args.start_time,
          end_time: args.end_time,
          guests_count: args.guests_count || 0,
          notes: args.notes,
          status: area.requires_approval ? "pendente" : "aprovada"
        }).select().single();
        
        if (error) throw error;
        
        const statusMsg = area.requires_approval 
          ? "Reserva solicitada! Aguardando aprovação do administrador."
          : "Reserva confirmada com sucesso!";
        
        return JSON.stringify({ success: true, message: statusMsg, reservation: data });
      }

      case "cancel_reservation": {
        // Verify ownership
        const { data: reservation } = await supabase
          .from("reservations")
          .select("id, resident_id, residents!inner(user_id)")
          .eq("id", args.reservation_id)
          .single();
        
        if (!reservation) {
          return JSON.stringify({ error: "Reserva não encontrada" });
        }
        
        if (context.role === "morador" && reservation.residents?.user_id !== context.userId) {
          return JSON.stringify({ error: "Você só pode cancelar suas próprias reservas" });
        }
        
        const { error } = await supabase
          .from("reservations")
          .update({ status: "cancelada" })
          .eq("id", args.reservation_id);
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Reserva cancelada com sucesso!" });
      }

      case "get_financial_summary": {
        const year = args.year || new Date().getFullYear();
        const month = args.month || new Date().getMonth() + 1;
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
        
        const { data: charges, error } = await supabase
          .from("financial_charges")
          .select("amount, status")
          .gte("due_date", startDate)
          .lte("due_date", endDate);
        
        if (error) throw error;
        
        const total = charges?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        const paid = charges?.filter((c: any) => c.status === "pago").reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        const pending = charges?.filter((c: any) => c.status === "pendente").reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        const overdue = charges?.filter((c: any) => c.status === "atrasado").reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        
        return JSON.stringify({
          period: `${month}/${year}`,
          total_expected: total,
          total_paid: paid,
          total_pending: pending,
          total_overdue: overdue,
          payment_rate: total > 0 ? Math.round((paid / total) * 100) : 0
        });
      }

      case "get_delinquent_units": {
        const { data, error } = await supabase
          .from("financial_charges")
          .select(`
            amount, due_date,
            units!inner(id, unit_number, block)
          `)
          .eq("status", "atrasado")
          .order("due_date", { ascending: true });
        
        if (error) throw error;
        
        const unitMap = new Map();
        data?.forEach((charge: any) => {
          const unitKey = charge.units.id;
          if (!unitMap.has(unitKey)) {
            unitMap.set(unitKey, {
              unit_number: charge.units.unit_number,
              block: charge.units.block,
              total_overdue: 0,
              charges_count: 0,
              oldest_due_date: charge.due_date
            });
          }
          const unit = unitMap.get(unitKey);
          unit.total_overdue += Number(charge.amount);
          unit.charges_count++;
        });
        
        const delinquent = Array.from(unitMap.values())
          .filter((u: any) => !args.min_days_overdue || 
            Math.floor((Date.now() - new Date(u.oldest_due_date).getTime()) / 86400000) >= args.min_days_overdue
          )
          .sort((a: any, b: any) => b.total_overdue - a.total_overdue);
        
        return JSON.stringify({ delinquent_units: delinquent, count: delinquent.length });
      }

      case "create_financial_charge": {
        if (context.role !== "administrador" && context.role !== "sindico") {
          return JSON.stringify({ error: "Sem permissão para criar cobranças" });
        }
        
        const { data: unit } = await supabase
          .from("units")
          .select("condominium_id")
          .eq("id", args.unit_id)
          .single();
        
        if (!unit) {
          return JSON.stringify({ error: "Unidade não encontrada" });
        }
        
        const { data, error } = await supabase.from("financial_charges").insert({
          unit_id: args.unit_id,
          condominium_id: unit.condominium_id,
          charge_type: args.charge_type,
          amount: args.amount,
          due_date: args.due_date,
          description: args.description,
          created_by: context.userId,
          status: "pendente"
        }).select().single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Cobrança criada com sucesso!", charge: data });
      }

      case "update_reservation_status": {
        if (context.role !== "administrador" && context.role !== "sindico") {
          return JSON.stringify({ error: "Sem permissão para atualizar reservas" });
        }
        
        const { data, error } = await supabase
          .from("reservations")
          .update({ status: args.status })
          .eq("id", args.reservation_id)
          .select()
          .single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: `Reserva ${args.status} com sucesso!`, reservation: data });
      }

      case "get_units_summary": {
        const { data: units, error } = await supabase
          .from("units")
          .select("id");
        
        if (error) throw error;
        
        const { data: residents } = await supabase
          .from("residents")
          .select("unit_id")
          .eq("is_active", true);
        
        const occupiedUnitIds = new Set(residents?.map((r: any) => r.unit_id));
        const total = units?.length || 0;
        const occupied = occupiedUnitIds.size;
        
        return JSON.stringify({
          total_units: total,
          occupied: occupied,
          vacant: total - occupied,
          occupancy_rate: total > 0 ? Math.round((occupied / total) * 100) : 0
        });
      }

      case "get_residents_summary": {
        const { data, error } = await supabase
          .from("residents")
          .select("id, resident_type, is_active");
        
        if (error) throw error;
        
        const total = data?.length || 0;
        const active = data?.filter((r: any) => r.is_active).length || 0;
        const owners = data?.filter((r: any) => r.resident_type === "proprietario").length || 0;
        const tenants = data?.filter((r: any) => r.resident_type === "inquilino").length || 0;
        
        return JSON.stringify({
          total_residents: total,
          active: active,
          owners: owners,
          tenants: tenants
        });
      }

      // ========== NEW ASSOCIATIVE TOOLS ==========

      case "get_unit_full_profile": {
        // Find unit by number
        const { data: units } = await supabase
          .from("units")
          .select(`
            id, unit_number, block, floor, max_vehicles,
            condominiums!inner(name)
          `)
          .ilike("unit_number", args.unit_number)
          .limit(1);
        
        if (!units || units.length === 0) {
          return JSON.stringify({ error: `Unidade "${args.unit_number}" não encontrada` });
        }
        
        const unit = units[0];
        
        // Get all associated data in parallel
        const [
          residentsRes,
          vehiclesRes,
          chargesRes,
          reservationsRes,
          packagesRes,
          visitorsRes,
          maintenanceRes
        ] = await Promise.all([
          // Residents
          supabase.from("residents")
            .select("id, resident_type, is_active, profiles!inner(full_name)")
            .eq("unit_id", unit.id),
          // Vehicles
          supabase.from("vehicles")
            .select("id, model, plate, color")
            .eq("unit_id", unit.id),
          // Pending/overdue charges
          supabase.from("financial_charges")
            .select("id, charge_type, amount, due_date, status")
            .eq("unit_id", unit.id)
            .in("status", ["pendente", "atrasado"])
            .order("due_date", { ascending: true }),
          // Recent reservations
          supabase.from("reservations")
            .select("id, reservation_date, status, common_areas!inner(name)")
            .eq("unit_id", unit.id)
            .gte("reservation_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
            .order("reservation_date", { ascending: false })
            .limit(5),
          // Pending packages
          supabase.from("packages")
            .select("id, sender, received_at, status")
            .eq("unit_id", unit.id)
            .eq("status", "aguardando"),
          // Active visitor authorizations
          supabase.from("visitor_authorizations")
            .select("id, visitor_name, valid_from, valid_until, status")
            .eq("unit_id", unit.id)
            .eq("status", "ativa"),
          // Open maintenance requests
          supabase.from("maintenance_requests")
            .select("id, title, status, priority")
            .eq("unit_id", unit.id)
            .in("status", ["aberto", "em_andamento"])
        ]);
        
        // Calculate financial summary
        const totalOverdue = chargesRes.data?.filter((c: any) => c.status === "atrasado")
          .reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        const totalPending = chargesRes.data?.filter((c: any) => c.status === "pendente")
          .reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        
        return JSON.stringify({
          unit: {
            number: unit.unit_number,
            block: unit.block,
            floor: unit.floor,
            condominium: unit.condominiums?.name,
            max_vehicles: unit.max_vehicles
          },
          residents: residentsRes.data?.map((r: any) => ({
            name: r.profiles?.full_name,
            type: r.resident_type,
            active: r.is_active
          })) || [],
          vehicles: vehiclesRes.data || [],
          financial: {
            total_overdue: totalOverdue,
            total_pending: totalPending,
            charges: chargesRes.data?.map((c: any) => ({
              type: c.charge_type,
              amount: c.amount,
              due_date: c.due_date,
              status: c.status
            })) || []
          },
          reservations: reservationsRes.data?.map((r: any) => ({
            date: r.reservation_date,
            area: r.common_areas?.name,
            status: r.status
          })) || [],
          packages_waiting: packagesRes.data?.length || 0,
          packages: packagesRes.data?.map((p: any) => ({
            sender: p.sender,
            received_at: p.received_at
          })) || [],
          active_visitors: visitorsRes.data?.map((v: any) => ({
            name: v.visitor_name,
            valid_until: v.valid_until
          })) || [],
          open_maintenance: maintenanceRes.data || []
        });
      }

      case "get_resident_full_profile": {
        // Search resident by name
        const { data: residents } = await supabase
          .from("residents")
          .select(`
            id, resident_type, is_active, contract_start_date, contract_end_date,
            profiles!inner(full_name, avatar_url),
            units!inner(id, unit_number, block, floor)
          `)
          .ilike("profiles.full_name", `%${args.name_search}%`)
          .limit(1);
        
        if (!residents || residents.length === 0) {
          return JSON.stringify({ error: `Morador "${args.name_search}" não encontrado` });
        }
        
        const resident = residents[0];
        
        // Get associated data
        const [chargesRes, reservationsRes, maintenanceRes, visitorsRes] = await Promise.all([
          // Last 6 months charges
          supabase.from("financial_charges")
            .select("id, charge_type, amount, due_date, status, payment_date")
            .eq("unit_id", resident.units.id)
            .gte("due_date", new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0])
            .order("due_date", { ascending: false }),
          // Recent reservations
          supabase.from("reservations")
            .select("id, reservation_date, status, common_areas!inner(name)")
            .eq("resident_id", resident.id)
            .order("reservation_date", { ascending: false })
            .limit(5),
          // Open maintenance
          supabase.from("maintenance_requests")
            .select("id, title, status, created_at")
            .eq("resident_id", resident.id)
            .in("status", ["aberto", "em_andamento"]),
          // Active visitors
          supabase.from("visitor_authorizations")
            .select("id, visitor_name, valid_until")
            .eq("resident_id", resident.id)
            .eq("status", "ativa")
        ]);
        
        // Calculate payment behavior
        const charges = chargesRes.data || [];
        const paidOnTime = charges.filter((c: any) => 
          c.status === "pago" && c.payment_date && new Date(c.payment_date) <= new Date(c.due_date)
        ).length;
        const totalCharged = charges.length;
        
        return JSON.stringify({
          resident: {
            name: resident.profiles?.full_name,
            type: resident.resident_type,
            active: resident.is_active,
            contract_start: resident.contract_start_date,
            contract_end: resident.contract_end_date
          },
          unit: {
            number: resident.units?.unit_number,
            block: resident.units?.block,
            floor: resident.units?.floor
          },
          financial: {
            charges_last_6_months: charges.length,
            paid_on_time: paidOnTime,
            payment_rate: totalCharged > 0 ? Math.round((paidOnTime / totalCharged) * 100) : 100,
            pending: charges.filter((c: any) => c.status === "pendente").length,
            overdue: charges.filter((c: any) => c.status === "atrasado").length
          },
          reservations: reservationsRes.data?.map((r: any) => ({
            date: r.reservation_date,
            area: r.common_areas?.name,
            status: r.status
          })) || [],
          open_maintenance: maintenanceRes.data?.length || 0,
          active_visitors: visitorsRes.data?.length || 0
        });
      }

      case "get_daily_summary": {
        const date = args.date || new Date().toISOString().split("T")[0];
        const today = new Date(date);
        const todayISO = today.toISOString();
        
        // Get all daily data in parallel
        const [reservationsRes, visitorsRes, packagesRes, chargesRes, maintenanceRes] = await Promise.all([
          // Today's reservations
          supabase.from("reservations")
            .select(`
              id, start_time, end_time, status, guests_count,
              common_areas!inner(name),
              units!inner(unit_number),
              residents!inner(profiles!inner(full_name))
            `)
            .eq("reservation_date", date)
            .in("status", ["pendente", "aprovada"]),
          // Active visitor authorizations for today
          supabase.from("visitor_authorizations")
            .select(`
              id, visitor_name, valid_from, valid_until, service_type,
              units!inner(unit_number),
              residents!inner(profiles!inner(full_name))
            `)
            .eq("status", "ativa")
            .lte("valid_from", todayISO)
            .gte("valid_until", todayISO),
          // Packages waiting
          supabase.from("packages")
            .select(`
              id, sender, received_at,
              units!inner(unit_number)
            `)
            .eq("status", "aguardando"),
          // Charges due today or overdue
          supabase.from("financial_charges")
            .select(`
              id, charge_type, amount, due_date, status,
              units!inner(unit_number)
            `)
            .or(`due_date.eq.${date},status.eq.atrasado`)
            .in("status", ["pendente", "atrasado"]),
          // Priority maintenance
          supabase.from("maintenance_requests")
            .select("id, title, priority, status, units(unit_number)")
            .in("status", ["aberto", "em_andamento"])
            .in("priority", ["alta", "urgente"])
        ]);
        
        return JSON.stringify({
          date,
          reservations: {
            count: reservationsRes.data?.length || 0,
            items: reservationsRes.data?.map((r: any) => ({
              area: r.common_areas?.name,
              time: `${r.start_time} - ${r.end_time}`,
              resident: r.residents?.profiles?.full_name,
              unit: r.units?.unit_number,
              guests: r.guests_count,
              status: r.status
            })) || []
          },
          visitors: {
            count: visitorsRes.data?.length || 0,
            items: visitorsRes.data?.map((v: any) => ({
              name: v.visitor_name,
              unit: v.units?.unit_number,
              resident: v.residents?.profiles?.full_name,
              service: v.service_type,
              until: v.valid_until
            })) || []
          },
          packages: {
            waiting: packagesRes.data?.length || 0,
            items: packagesRes.data?.map((p: any) => ({
              unit: p.units?.unit_number,
              sender: p.sender,
              since: p.received_at
            })) || []
          },
          financial: {
            due_today: chargesRes.data?.filter((c: any) => c.due_date === date).length || 0,
            overdue: chargesRes.data?.filter((c: any) => c.status === "atrasado").length || 0,
            total_overdue_amount: chargesRes.data?.filter((c: any) => c.status === "atrasado")
              .reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0
          },
          priority_maintenance: {
            count: maintenanceRes.data?.length || 0,
            items: maintenanceRes.data?.map((m: any) => ({
              title: m.title,
              priority: m.priority,
              unit: m.units?.unit_number
            })) || []
          }
        });
      }

      case "compare_units": {
        const metric = args.metric;
        const topN = args.top_n || 5;
        
        if (metric === "inadimplencia") {
          const { data } = await supabase
            .from("financial_charges")
            .select(`amount, units!inner(id, unit_number, block)`)
            .eq("status", "atrasado");
          
          const unitMap = new Map();
          data?.forEach((c: any) => {
            const key = c.units.id;
            if (!unitMap.has(key)) {
              unitMap.set(key, { unit_number: c.units.unit_number, block: c.units.block, total: 0, count: 0 });
            }
            unitMap.get(key).total += Number(c.amount);
            unitMap.get(key).count++;
          });
          
          const ranking = Array.from(unitMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, topN);
          
          return JSON.stringify({ metric: "inadimplencia", ranking, description: "Unidades com maior valor em atraso" });
        }
        
        if (metric === "reservas") {
          const { data } = await supabase
            .from("reservations")
            .select(`units!inner(id, unit_number, block)`)
            .gte("reservation_date", new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0]);
          
          const unitMap = new Map();
          data?.forEach((r: any) => {
            const key = r.units.id;
            if (!unitMap.has(key)) {
              unitMap.set(key, { unit_number: r.units.unit_number, block: r.units.block, count: 0 });
            }
            unitMap.get(key).count++;
          });
          
          const ranking = Array.from(unitMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, topN);
          
          return JSON.stringify({ metric: "reservas", ranking, description: "Unidades que mais reservaram áreas comuns (últimos 90 dias)" });
        }
        
        if (metric === "ocorrencias") {
          const { data } = await supabase
            .from("maintenance_requests")
            .select(`units!inner(id, unit_number, block)`)
            .not("unit_id", "is", null);
          
          const unitMap = new Map();
          data?.forEach((m: any) => {
            const key = m.units.id;
            if (!unitMap.has(key)) {
              unitMap.set(key, { unit_number: m.units.unit_number, block: m.units.block, count: 0 });
            }
            unitMap.get(key).count++;
          });
          
          const ranking = Array.from(unitMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, topN);
          
          return JSON.stringify({ metric: "ocorrencias", ranking, description: "Unidades com mais ocorrências abertas" });
        }
        
        return JSON.stringify({ error: "Métrica não reconhecida" });
      }

      case "get_delinquency_trends": {
        const months = args.months || 6;
        const trends = [];
        
        for (let i = 0; i < months; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
          const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
          
          const { data } = await supabase
            .from("financial_charges")
            .select("amount, status")
            .gte("due_date", startDate)
            .lte("due_date", endDate);
          
          const total = data?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
          const overdue = data?.filter((c: any) => c.status === "atrasado")
            .reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
          
          trends.push({
            period: `${month}/${year}`,
            total_charged: total,
            total_overdue: overdue,
            delinquency_rate: total > 0 ? Math.round((overdue / total) * 100) : 0
          });
        }
        
        // Find recurrent delinquent units
        const { data: recurrent } = await supabase
          .from("financial_charges")
          .select(`units!inner(unit_number, block)`)
          .eq("status", "atrasado");
        
        const unitCounts = new Map();
        recurrent?.forEach((c: any) => {
          const key = c.units.unit_number;
          unitCounts.set(key, (unitCounts.get(key) || 0) + 1);
        });
        
        const recurrentUnits = Array.from(unitCounts.entries())
          .filter(([_, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([unit, count]) => ({ unit, overdue_count: count }));
        
        return JSON.stringify({
          trends: trends.reverse(),
          recurrent_delinquents: recurrentUnits,
          analysis: recurrentUnits.length > 0 
            ? `${recurrentUnits.length} unidade(s) com inadimplência recorrente`
            : "Sem padrão de inadimplência recorrente identificado"
        });
      }

      case "get_area_usage_stats": {
        const period = args.period || "month";
        let daysBack = 30;
        if (period === "quarter") daysBack = 90;
        if (period === "year") daysBack = 365;
        
        const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
        
        const { data } = await supabase
          .from("reservations")
          .select(`
            id, reservation_date, start_time, guests_count,
            common_areas!inner(id, name)
          `)
          .gte("reservation_date", startDate)
          .in("status", ["aprovada", "pendente"]);
        
        // Stats by area
        const areaStats = new Map();
        const hourCounts = new Map();
        
        data?.forEach((r: any) => {
          const areaName = r.common_areas?.name;
          if (!areaStats.has(areaName)) {
            areaStats.set(areaName, { reservations: 0, total_guests: 0 });
          }
          areaStats.get(areaName).reservations++;
          areaStats.get(areaName).total_guests += r.guests_count || 0;
          
          const hour = parseInt(r.start_time?.split(":")[0] || "0");
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        });
        
        const mostUsed = Array.from(areaStats.entries())
          .sort((a, b) => b[1].reservations - a[1].reservations)
          .slice(0, 3)
          .map(([name, stats]) => ({ name, ...stats }));
        
        const peakHour = Array.from(hourCounts.entries())
          .sort((a, b) => b[1] - a[1])[0];
        
        return JSON.stringify({
          period,
          total_reservations: data?.length || 0,
          most_used_areas: mostUsed,
          peak_hour: peakHour ? `${peakHour[0]}:00 - ${peakHour[0] + 1}:00` : "N/A",
          average_guests: data?.length 
            ? Math.round(data.reduce((sum: number, r: any) => sum + (r.guests_count || 0), 0) / data.length)
            : 0
        });
      }

      case "send_notification": {
        if (context.role !== "administrador" && context.role !== "sindico") {
          return JSON.stringify({ error: "Sem permissão para enviar notificações" });
        }
        
        let userIds: string[] = [];
        
        if (args.target === "unit" && args.unit_number) {
          // Get residents of the unit
          const { data: residents } = await supabase
            .from("residents")
            .select("user_id, units!inner(unit_number)")
            .ilike("units.unit_number", args.unit_number)
            .eq("is_active", true);
          
          userIds = residents?.map((r: any) => r.user_id) || [];
        } else if (args.target === "admins") {
          const { data: admins } = await supabase
            .from("user_roles")
            .select("user_id")
            .in("role", ["administrador", "sindico"]);
          
          userIds = admins?.map((a: any) => a.user_id) || [];
        } else if (args.target === "all") {
          const { data: allUsers } = await supabase
            .from("profiles")
            .select("id");
          
          userIds = allUsers?.map((u: any) => u.id) || [];
        }
        
        if (userIds.length === 0) {
          return JSON.stringify({ error: "Nenhum destinatário encontrado" });
        }
        
        const notifications = userIds.map(userId => ({
          user_id: userId,
          title: args.title,
          message: args.message,
          type: "general",
          priority: args.priority || "normal",
          link: null
        }));
        
        const { error } = await supabase.from("notifications").insert(notifications);
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: `Notificação enviada para ${userIds.length} usuário(s)!` });
      }

      case "register_package": {
        const { data, error } = await supabase.from("packages").insert({
          unit_id: args.unit_id,
          sender: args.sender,
          tracking_code: args.tracking_code,
          description: args.description,
          logged_by: context.userId,
          status: "aguardando"
        }).select().single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Encomenda registrada com sucesso!", package: data });
      }

      case "mark_package_collected": {
        const { data, error } = await supabase
          .from("packages")
          .update({ status: "coletado", collected_at: new Date().toISOString() })
          .eq("id", args.package_id)
          .select()
          .single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Encomenda marcada como coletada!", package: data });
      }

      case "get_active_authorizations": {
        const today = new Date().toISOString();
        const { data, error } = await supabase
          .from("visitor_authorizations")
          .select(`
            id, visitor_name, visitor_document, visitor_phone, valid_from, valid_until, service_type,
            units!inner(unit_number, block),
            residents!inner(profiles!inner(full_name))
          `)
          .eq("status", "ativa")
          .lte("valid_from", today)
          .gte("valid_until", today);
        
        if (error) throw error;
        return JSON.stringify({ authorizations: data, count: data?.length || 0 });
      }

      case "search_unit_by_number": {
        const { data, error } = await supabase
          .from("units")
          .select(`
            id, unit_number, block, floor,
            residents!inner(
              id, is_active,
              profiles!inner(full_name)
            )
          `)
          .ilike("unit_number", `%${args.unit_number}%`)
          .limit(5);
        
        if (error) throw error;
        return JSON.stringify({ units: data, count: data?.length || 0 });
      }

      default:
        return JSON.stringify({ error: `Tool ${toolName} not found` });
    }
  } catch (error: unknown) {
    console.error(`Error executing tool ${toolName}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao executar ação";
    return JSON.stringify({ error: errorMessage });
  }
}

// Get user context from database
async function getUserContext(supabase: any, userId: string): Promise<UserContext> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  // Get organization for the user
  const { data: orgMember } = await supabase
    .from("user_organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  let unitId, unitNumber, condominiumId, condominiumName;
  
  if (profile?.role === "morador") {
    const { data: resident } = await supabase
      .from("residents")
      .select(`
        unit_id,
        units!inner(
          id, unit_number,
          condominiums!inner(id, name)
        )
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (resident) {
      unitId = resident.unit_id;
      unitNumber = resident.units?.unit_number;
      condominiumId = resident.units?.condominiums?.id;
      condominiumName = resident.units?.condominiums?.name;
    }
  } else {
    const { data: condo } = await supabase
      .from("condominiums")
      .select("id, name")
      .limit(1)
      .single();
    
    condominiumId = condo?.id;
    condominiumName = condo?.name;
  }

  return {
    userId,
    role: profile?.role || "morador",
    userName: profile?.full_name?.split(" ")[0] || "Usuário",
    unitId,
    unitNumber,
    condominiumId,
    condominiumName,
    organizationId: orgMember?.organization_id
  };
}

// Build system prompt based on context
function buildSystemPrompt(context: UserContext): string {
  const roleDescriptions: Record<string, string> = {
    morador: "morador do condomínio",
    administrador: "administrador do condomínio",
    sindico: "síndico do condomínio",
    porteiro: "porteiro do condomínio"
  };

  // Explicit capability lists per role
  const adminSindicoCapabilities = `
✅ O QUE VOCÊ PODE FAZER (CONSULTAS):
- get_unit_full_profile: Ver perfil completo de uma unidade (moradores, veículos, finanças, ocorrências, reservas, encomendas)
- get_resident_full_profile: Ver perfil completo de um morador (dados, unidade, finanças, ocorrências)
- get_daily_summary: Resumo diário do condomínio (encomendas, reservas, ocorrências, inadimplência)
- get_financial_summary: Resumo financeiro mensal (totais recebidos, pendentes, atrasados)
- get_delinquent_units: Lista de unidades inadimplentes com valores
- get_delinquency_trends: Tendências de inadimplência dos últimos meses
- compare_units: Ranking de unidades por métrica (inadimplência, ocorrências, reservas)
- get_user_charges: Listar cobranças de uma unidade específica
- get_reservations: Listar reservas (todas ou filtradas)
- get_area_usage_stats: Estatísticas de uso de áreas comuns
- get_common_areas: Listar áreas comuns disponíveis
- get_area_availability: Verificar disponibilidade de área em data específica
- get_maintenance_requests: Listar ocorrências de manutenção
- get_packages: Listar encomendas (aguardando ou coletadas)
- get_visitor_authorizations: Listar autorizações de visitantes
- get_residents_summary: Resumo de moradores (total, ativos, por tipo)
- search_documents: Buscar informações em documentos do condomínio
- universal_search: Busca geral por nome/número em moradores, unidades, documentos

✅ O QUE VOCÊ PODE FAZER (AÇÕES):
- create_financial_charge: Criar nova cobrança para uma unidade
- update_reservation_status: Aprovar ou rejeitar reservas de moradores
- send_notification: Enviar notificação para um morador específico
- create_maintenance_request: Criar nova ocorrência de manutenção
- create_visitor_authorization: Criar autorização de visitante

❌ O QUE VOCÊ NÃO PODE FAZER:
- Atualizar ou editar dados cadastrais de moradores (nome, contato, etc.)
- Atualizar ou editar dados de unidades (bloco, andar, etc.)
- Aprovar ou rejeitar cadastros de novos moradores no sistema
- Editar ou excluir cobranças já criadas
- Atualizar status de ocorrências de manutenção (aberta → em andamento → concluída)
- Criar ou gerenciar contas de usuários do sistema
- Acessar fluxo de caixa detalhado por período (apenas resumo mensal disponível)
- Publicar comunicados gerais para o condomínio (apenas notificações individuais)
- Excluir registros do sistema (reservas, ocorrências, autorizações)`;

  const moradorCapabilities = `
✅ O QUE VOCÊ PODE FAZER (CONSULTAS):
- get_user_charges: Ver suas cobranças (pendentes, pagas, atrasadas)
- get_reservations: Ver suas reservas de áreas comuns
- get_maintenance_requests: Ver suas ocorrências registradas
- get_packages: Ver suas encomendas aguardando retirada
- get_visitor_authorizations: Ver suas autorizações de visitantes
- get_common_areas: Ver áreas comuns disponíveis para reserva
- get_area_availability: Verificar disponibilidade de área em data específica
- search_documents: Buscar regras e informações nos documentos do condomínio

✅ O QUE VOCÊ PODE FAZER (AÇÕES):
- create_maintenance_request: Abrir nova ocorrência de manutenção
- create_visitor_authorization: Autorizar entrada de visitante
- create_reservation: Solicitar reserva de área comum
- cancel_reservation: Cancelar suas próprias reservas pendentes

❌ O QUE VOCÊ NÃO PODE FAZER:
- Ver cobranças ou dados financeiros de outras unidades
- Ver ou gerenciar reservas de outros moradores
- Aprovar ou rejeitar reservas (apenas administração pode)
- Criar cobranças ou multas
- Atualizar status de ocorrências (apenas administração pode)
- Ver informações de outros moradores ou unidades
- Registrar ou gerenciar encomendas (apenas portaria pode)
- Enviar notificações para outros moradores`;

  const porteiroCapabilities = `
✅ O QUE VOCÊ PODE FAZER (CONSULTAS):
- get_unit_full_profile: Ver dados de uma unidade para verificação
- get_daily_summary: Ver resumo do dia (encomendas, visitantes esperados, reservas)
- get_packages: Ver encomendas aguardando retirada
- get_visitor_authorizations: Ver autorizações de visitantes ativas
- get_reservations: Ver reservas do dia para áreas comuns
- get_common_areas: Ver lista de áreas comuns
- universal_search: Buscar morador ou unidade por nome/número

✅ O QUE VOCÊ PODE FAZER (AÇÕES):
- create_package: Registrar nova encomenda recebida
- update_package_status: Marcar encomenda como coletada
- create_visitor_authorization: Registrar autorização de visitante

❌ O QUE VOCÊ NÃO PODE FAZER:
- Ver ou gerenciar dados financeiros (cobranças, inadimplência)
- Aprovar ou rejeitar reservas
- Criar ocorrências de manutenção
- Enviar notificações para moradores
- Atualizar dados cadastrais de moradores ou unidades
- Acessar documentos internos do condomínio (atas, convenções)
- Ver histórico completo de moradores`;

  const getCapabilitiesForRole = (role: string): string => {
    switch (role) {
      case 'administrador':
      case 'sindico':
        return adminSindicoCapabilities;
      case 'morador':
        return moradorCapabilities;
      case 'porteiro':
        return porteiroCapabilities;
      default:
        return moradorCapabilities;
    }
  };

  return `Você é Galli, o assistente virtual do sistema de gestão de condomínios.

CONTEXTO DO USUÁRIO:
- Nome: ${context.userName}
- Função: ${roleDescriptions[context.role] || "usuário"}
${context.unitNumber ? `- Unidade: ${context.unitNumber}` : ""}
${context.condominiumName ? `- Condomínio: ${context.condominiumName}` : ""}

═══════════════════════════════════════════════════════════════
SUAS CAPACIDADES COMO ${context.role.toUpperCase()}:
${getCapabilitiesForRole(context.role)}
═══════════════════════════════════════════════════════════════

REGRA CRÍTICA DE TRANSPARÊNCIA:
Quando o usuário perguntar "o que você pode fazer", "quais suas funções", "me ajuda com o quê" ou perguntas similares:
1. Responda APENAS com base nas listas ✅ acima
2. NUNCA invente ou prometa funcionalidades que não estão listadas
3. Seja específico sobre o que pode consultar vs o que pode executar como ação
4. Se perguntarem algo que está na lista ❌, responda:
   "Essa funcionalidade não está disponível para mim no momento. Para [ação], você pode acessar [local no sistema] diretamente."

INSTRUÇÕES GERAIS:
- Seja cordial, profissional e objetivo
- Use português brasileiro
- Formate respostas com markdown (listas, negrito, tabelas)
- Use emojis moderadamente (📍 unidades, 👥 moradores, 💰 finanças, 📦 encomendas, 🔧 manutenção)
- Valores monetários: formato brasileiro (R$ 1.234,56)
- Datas: formato brasileiro (DD/MM/AAAA)
- NUNCA invente dados - sempre use as tools para buscar informações reais

═══════════════════════════════════════════════════════════════
COMPORTAMENTO PROATIVO E AUTÔNOMO (REGRA CRÍTICA):
═══════════════════════════════════════════════════════════════

Quando o usuário mencionar um nome, unidade ou termo genérico:

1. **SEMPRE busque primeiro** usando universal_search ou a tool apropriada
2. Se encontrar **MÚLTIPLOS resultados**, apresente TODOS ao usuário de forma organizada:
   "Encontrei X pessoas/unidades com esse termo:
    1. Nome Completo - Apto XXX, Bloco Y
    2. Nome Completo - Apto XXX, Bloco Y
    
    Para qual deles você se refere?"

3. Se encontrar **APENAS UM resultado**, prossiga com a ação automaticamente
4. Se **NÃO encontrar nenhum** resultado, informe e peça mais detalhes
5. **NUNCA peça mais informações SEM antes buscar no sistema!**

EXEMPLOS DE COMPORTAMENTO AUTÔNOMO:

❌ ERRADO (passivo - NÃO faça isso):
Usuário: "Manda notificação pro Lucas"
IA: "Qual Lucas? Me informe o sobrenome ou unidade."

✅ CORRETO (proativo - faça isso):
Usuário: "Manda notificação pro Lucas"
IA: [Usa universal_search com query="Lucas"]
    "Encontrei 2 moradores com nome Lucas:
     1. **Lucas Silva** - Apto 101, Bloco A
     2. **Lucas Santos** - Apto 205, Bloco B
     
     Para qual deles devo enviar a notificação?"

❌ ERRADO:
Usuário: "Qual o saldo do apartamento 101?"
IA: "Para ver o saldo, preciso confirmar de qual bloco..."

✅ CORRETO:
Usuário: "Qual o saldo do apartamento 101?"
IA: [Usa get_unit_full_profile com unit_number="101"]
    Se só existe um 101: mostra os dados
    Se existem vários (101 Bloco A, 101 Bloco B): lista as opções

❌ ERRADO:
Usuário: "Tem encomenda pra Maria?"
IA: "Qual é o sobrenome da Maria?"

✅ CORRETO:
Usuário: "Tem encomenda pra Maria?"
IA: [Usa universal_search com query="Maria"]
    "Encontrei 3 moradoras com nome Maria:
     - Maria Santos (Apto 101) - 📦 1 encomenda aguardando
     - Maria Oliveira (Apto 203) - Sem encomendas
     - Maria Costa (Apto 305) - 📦 2 encomendas aguardando
     
     Deseja mais detalhes de alguma delas?"

REGRA DE OURO DA AUTONOMIA:
Sempre execute uma busca ANTES de pedir mais informações ao usuário.
Seu papel é SIMPLIFICAR a vida do usuário, não fazer mais perguntas.
Se houver ambiguidade, busque TODAS as opções e apresente de forma organizada.
O usuário deve ter o mínimo de trabalho possível.
═══════════════════════════════════════════════════════════════

USO DE FERRAMENTAS ASSOCIATIVAS:
- "Me conta tudo sobre a unidade X" → use get_unit_full_profile
- "Quem é o morador X?" → use universal_search primeiro, depois get_resident_full_profile
- "O que tem pra hoje?" → use get_daily_summary
- "Quais unidades mais devem?" → use compare_units com metric="inadimplencia"
- "Como está a inadimplência?" → use get_delinquency_trends
- "Qual área mais usada?" → use get_area_usage_stats
- "Buscar [nome/termo]" → use universal_search SEMPRE primeiro

BIBLIOTECA DE DOCUMENTOS:
- Use search_documents para perguntas sobre regras, regulamentos, convenção, atas, horários
- Cite a fonte (nome do documento) quando responder com base em documentos

FORMATAÇÃO DE RESPOSTAS:
Organize respostas de forma clara:

📍 **Unidade 101** - Bloco A
👥 **Moradores:** João Silva (Proprietário)
💰 **Finanças:** 2 pendentes (R$ 1.200,00)
📦 **Encomendas:** 1 aguardando

IMPORTANTE:
- Use as tools para buscar dados ANTES de responder
- Confirme sucesso/erro ao executar ações
- Se não puder fazer algo, indique onde o usuário pode fazer manualmente no sistema`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const clientIP = getClientIP(req);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const defaultApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!defaultApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Apply rate limiting based on user ID
    const clientId = getClientIdentifier(req, user.id);
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.AI_ASSISTANT);
    
    if (!rateLimitResult.allowed) {
      await logger.warn('Rate limit exceeded for AI assistant', { userId: user.id, clientId }, user.id, requestId);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { messages, conversationId } = await req.json();
    
    const context = await getUserContext(supabase, user.id);
    console.log("User context:", context);

    // Get organization AI config if available
    let apiKey = defaultApiKey;
    let apiModel = "google/gemini-3-flash-preview";
    
    if (context.organizationId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("ai_provider, ai_model, ai_api_key_encrypted")
        .eq("id", context.organizationId)
        .single();
      
      // Use org model if configured
      if (org?.ai_model) {
        apiModel = org.ai_model;
      }
      
      // Use org API key if available (regardless of provider)
      if (org?.ai_api_key_encrypted) {
        try {
          const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || supabaseKey;
          const encoder = new TextEncoder();
          const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, "0"));
          
          const cryptoKey = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
          );
          
          const combined = Uint8Array.from(atob(org.ai_api_key_encrypted), c => c.charCodeAt(0));
          const iv = combined.slice(0, 12);
          const encrypted = combined.slice(12);
          
          const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            cryptoKey,
            encrypted
          );
          
          apiKey = new TextDecoder().decode(decrypted);
          console.log("Using organization-specific API key for model:", apiModel);
        } catch (decryptError) {
          console.error("Failed to decrypt org API key, using default:", decryptError);
        }
      }
    }

    // Track the user's question for stats
    const lastUserMessage = [...messages].reverse().find((m: Message) => m.role === "user");
    const trackStartTime = Date.now();

    const tools = getToolsForRole(context.role);

    const aiMessages = [
      { role: "system", content: buildSystemPrompt(context) },
      ...messages
    ];

    // Always use Lovable AI Gateway (supports external API keys with model prefixes)
    const apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    let response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: apiModel,
        messages: aiMessages,
        tools,
        tool_choice: "auto",
        stream: true
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Erro ao comunicar com IA");
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let toolCalls: any[] = [];
    let accumulatedContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        
        try {
          const data = JSON.parse(line.slice(6));
          const delta = data.choices?.[0]?.delta;
          
          if (delta?.content) {
            accumulatedContent += delta.content;
          }
          
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { id: tc.id, function: { name: "", arguments: "" } };
                }
                if (tc.function?.name) {
                  toolCalls[tc.index].function.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (toolCalls.length > 0) {
      console.log("Tool calls detected:", toolCalls);
      
      const toolResults = [];
      const toolsUsed: string[] = [];
      for (const tc of toolCalls) {
        if (tc?.function?.name) {
          toolsUsed.push(tc.function.name);
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch (e) {
            console.error("Failed to parse tool arguments:", tc.function.arguments);
          }
          
          const result = await executeTool(supabase, tc.function.name, args, context);
          toolResults.push({
            tool_call_id: tc.id,
            role: "tool",
            content: result
          });
        }
      }

      // Track stats with tools used
      if (lastUserMessage?.content) {
        const responseTime = Date.now() - trackStartTime;
        trackUsageStats(supabase, {
          userId: user.id,
          conversationId,
          condominiumId: context.condominiumId,
          question: lastUserMessage.content.substring(0, 500),
          toolsUsed,
          responseTimeMs: responseTime
        });
      }

      const followUpMessages = [
        ...aiMessages,
        { role: "assistant", content: accumulatedContent || null, tool_calls: toolCalls.filter(tc => tc?.function?.name) },
        ...toolResults
      ];

      const followUpResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: apiModel,
          messages: followUpMessages,
          stream: true
        })
      });

      if (!followUpResponse.ok) {
        throw new Error("Erro na resposta da IA");
      }

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
      });
    }

    // Track stats for non-tool responses
    if (lastUserMessage?.content && toolCalls.length === 0) {
      const responseTime = Date.now() - trackStartTime;
      trackUsageStats(supabase, {
        userId: user.id,
        conversationId,
        condominiumId: context.condominiumId,
        question: lastUserMessage.content.substring(0, 500),
        toolsUsed: [],
        responseTimeMs: responseTime
      });
    }

    const finalResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: apiModel,
        messages: aiMessages,
        stream: true
      })
    });

    return new Response(finalResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    await logger.error(`AI Assistant error: ${errorMessage}`, { 
      error: error instanceof Error ? error.stack : String(error),
      ip: clientIP 
    }, undefined, requestId);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
