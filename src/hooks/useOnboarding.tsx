import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Json } from "@/integrations/supabase/types";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for tour highlight
  action?: string; // Route or action to navigate
  roles: ("administrador" | "sindico" | "morador" | "porteiro")[];
}

export interface OnboardingConfig {
  tourSteps: OnboardingStep[];
  checklistItems: OnboardingStep[];
}

// Configuração de onboarding por perfil
export const onboardingConfig: OnboardingConfig = {
  tourSteps: [
    // ==========================================
    // Welcome step for all
    // ==========================================
    {
      id: "welcome",
      title: "Bem-vindo ao Galli!",
      description: "Este é o seu painel de gestão condominial. Vamos fazer um tour rápido pelas principais funcionalidades.",
      roles: ["administrador", "sindico", "morador", "porteiro"],
    },
    {
      id: "sidebar",
      title: "Menu de Navegação",
      description: "Use o menu lateral para acessar todas as funcionalidades do sistema. Você pode minimizá-lo clicando na seta.",
      target: "[data-tour='sidebar']",
      roles: ["administrador", "sindico", "morador", "porteiro"],
    },
    {
      id: "notifications",
      title: "Central de Notificações",
      description: "Receba alertas sobre reservas pendentes, novas ocorrências, encomendas e cobranças vencidas.",
      target: "[data-tour='notifications']",
      roles: ["administrador", "sindico", "morador", "porteiro"],
    },
    // ==========================================
    // Admin/Síndico specific steps
    // ==========================================
    {
      id: "condominium-selector",
      title: "Seletor de Condomínio",
      description: "Selecione qual condomínio você deseja gerenciar. Todos os dados serão filtrados automaticamente por esta seleção.",
      target: "[data-tour='condominium-selector']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "global-search",
      title: "Busca Global",
      description: "Use Ctrl+K para buscar rapidamente moradores, unidades, veículos, documentos e muito mais em todo o sistema.",
      target: "[data-tour='global-search']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "dashboard-admin",
      title: "Dashboard Principal",
      description: "Visão geral do condomínio com estatísticas, resumo financeiro, cobranças em atraso e atividades recentes.",
      target: "[data-tour='menu-dashboard']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "residents-management",
      title: "Gestão de Moradores",
      description: "Cadastre e gerencie moradores, visualize informações de contato e associe-os às unidades do condomínio.",
      target: "[data-tour='menu-residents']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "units-management",
      title: "Gestão de Unidades",
      description: "Cadastre apartamentos e unidades, configure limite de veículos por unidade e visualize ocupação.",
      target: "[data-tour='menu-units']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "employees-management",
      title: "Gestão de Funcionários",
      description: "Cadastre porteiros, zeladores e outros funcionários do condomínio com informações de contato.",
      target: "[data-tour='menu-employees']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "access-control-admin",
      title: "Controle de Acesso",
      description: "Visualize histórico de entrada e saída de visitantes, prestadores de serviço e entregas.",
      target: "[data-tour='menu-access']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "packages-admin",
      title: "Controle de Encomendas",
      description: "Acompanhe encomendas recebidas e entregues, com histórico completo por unidade.",
      target: "[data-tour='menu-packages']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "utility-readings",
      title: "Leituras de Consumo",
      description: "Registre leituras de água, energia elétrica e gás. Os valores são calculados automaticamente nas cobranças mensais.",
      target: "[data-tour='menu-utility-readings']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "common-areas-admin",
      title: "Gestão de Áreas Comuns",
      description: "Cadastre salão de festas, churrasqueira, piscina e outras áreas. Configure horários, capacidade e regras de uso.",
      target: "[data-tour='menu-common-areas']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "block-groups-admin",
      title: "Grupos de Blocos",
      description: "Organize moradores por blocos ou torres para facilitar a comunicação segmentada.",
      target: "[data-tour='menu-block-groups']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "group-chat-admin",
      title: "Chat dos Grupos",
      description: "Visualize e modere as conversas entre moradores dos grupos e blocos do condomínio.",
      target: "[data-tour='menu-group-chat']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "reservations-admin",
      title: "Gestão de Reservas",
      description: "Aprove ou rejeite reservas de áreas comuns, visualize calendário de ocupação e configure regras de uso.",
      target: "[data-tour='menu-reservations']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "financial-management",
      title: "Gestão Financeira",
      description: "Gerencie cobranças, registre pagamentos, acompanhe inadimplência e gere boletos automaticamente todo mês.",
      target: "[data-tour='menu-financial']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "maintenance-requests",
      title: "Ocorrências e Manutenção",
      description: "Acompanhe solicitações dos moradores, atualize status e mantenha histórico de todas as ocorrências do condomínio.",
      target: "[data-tour='menu-maintenance']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "documents-admin",
      title: "Documentos do Condomínio",
      description: "Faça upload de atas, regimentos, convenção e comunicados. O assistente IA pode consultar esses documentos.",
      target: "[data-tour='menu-documents']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "user-management",
      title: "Gestão de Usuários",
      description: "Crie contas para moradores, porteiros e outros administradores. Gerencie permissões de acesso ao sistema.",
      target: "[data-tour='menu-users']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "ai-assistant-admin",
      title: "Assistente Galli (IA)",
      description: "Nosso assistente inteligente pode responder perguntas, gerar relatórios, consultar documentos e executar ações no sistema.",
      target: "[data-tour='ai-assistant']",
      roles: ["administrador", "sindico"],
    },
    {
      id: "settings-admin",
      title: "Configurações",
      description: "Atualize seu perfil, altere sua senha, configure a IA e gerencie preferências do sistema.",
      target: "[data-tour='menu-settings']",
      roles: ["administrador", "sindico"],
    },
    // ==========================================
    // Morador specific steps
    // ==========================================
    {
      id: "resident-dashboard",
      title: "Minha Área",
      description: "Visualize informações da sua unidade, veículos cadastrados e notificações importantes do condomínio.",
      target: "[data-tour='menu-resident']",
      roles: ["morador"],
    },
    {
      id: "resident-chat",
      title: "Chat do Condomínio",
      description: "Comunique-se com vizinhos e administração através do chat em grupo do seu bloco ou condomínio.",
      target: "[data-tour='menu-group-chat']",
      roles: ["morador"],
    },
    {
      id: "resident-reservations",
      title: "Reservas de Áreas Comuns",
      description: "Reserve o salão de festas, churrasqueira ou outras áreas. Veja a disponibilidade no calendário e cadastre sua lista de convidados.",
      target: "[data-tour='menu-reservations']",
      roles: ["morador"],
    },
    {
      id: "resident-visitors",
      title: "Autorizar Visitantes",
      description: "Pré-autorize a entrada de visitantes e prestadores de serviço. A portaria será notificada automaticamente.",
      target: "[data-tour='menu-visitor-auth']",
      roles: ["morador"],
    },
    {
      id: "resident-financial",
      title: "Meu Financeiro",
      description: "Consulte suas cobranças, veja o detalhamento (água, energia, rateio) e acompanhe seu histórico de pagamentos.",
      target: "[data-tour='menu-financial']",
      roles: ["morador"],
    },
    {
      id: "resident-maintenance",
      title: "Registrar Ocorrências",
      description: "Abra solicitações de manutenção, registre reclamações ou sugestões e acompanhe o andamento de cada uma.",
      target: "[data-tour='menu-maintenance']",
      roles: ["morador"],
    },
    {
      id: "resident-documents",
      title: "Documentos do Condomínio",
      description: "Acesse atas de reunião, regimento interno, convenção e comunicados oficiais do condomínio.",
      target: "[data-tour='menu-documents']",
      roles: ["morador"],
    },
    {
      id: "ai-assistant-resident",
      title: "Assistente Galli",
      description: "Clique no botão dourado no canto inferior direito para conversar com a Galli, nossa assistente virtual que pode tirar suas dúvidas.",
      target: "[data-tour='ai-chat-popup']",
      roles: ["morador"],
    },
    {
      id: "settings-resident",
      title: "Configurações",
      description: "Atualize seu perfil, foto e altere sua senha de acesso ao sistema.",
      target: "[data-tour='menu-settings']",
      roles: ["morador"],
    },
    // ==========================================
    // Porteiro specific steps
    // ==========================================
    {
      id: "global-search-doorkeeper",
      title: "Busca Global",
      description: "Use Ctrl+K para buscar rapidamente moradores, unidades, veículos e autorizações de visitantes.",
      target: "[data-tour='global-search']",
      roles: ["porteiro"],
    },
    {
      id: "doorkeeper-dashboard",
      title: "Painel do Porteiro",
      description: "Visão geral com estatísticas do dia: entradas registradas, encomendas pendentes e visitantes autorizados.",
      target: "[data-tour='menu-doorkeeper']",
      roles: ["porteiro"],
    },
    {
      id: "access-control-doorkeeper",
      title: "Controle de Acesso",
      description: "Registre entrada e saída de visitantes, prestadores de serviço e entregas. Consulte autorizações de moradores.",
      target: "[data-tour='menu-access']",
      roles: ["porteiro"],
    },
    {
      id: "packages-doorkeeper",
      title: "Controle de Encomendas",
      description: "Registre encomendas recebidas e notifique os moradores automaticamente. Controle a retirada de cada pacote.",
      target: "[data-tour='menu-packages']",
      roles: ["porteiro"],
    },
    {
      id: "doorkeeper-documents",
      title: "Documentos",
      description: "Acesse documentos úteis como lista de moradores, regras de acesso e procedimentos de emergência.",
      target: "[data-tour='menu-documents']",
      roles: ["porteiro"],
    },
    {
      id: "ai-assistant-doorkeeper",
      title: "Assistente Galli (IA)",
      description: "Tire dúvidas rápidas com a Galli. Ela pode ajudar a localizar moradores, verificar autorizações e consultar procedimentos.",
      target: "[data-tour='ai-assistant']",
      roles: ["porteiro"],
    },
    {
      id: "settings-doorkeeper",
      title: "Configurações",
      description: "Atualize seu perfil e altere sua senha de acesso ao sistema.",
      target: "[data-tour='menu-settings']",
      roles: ["porteiro"],
    },
    // ==========================================
    // Final step for all
    // ==========================================
    {
      id: "help-button",
      title: "Precisa de Ajuda?",
      description: "Clique no botão de ajuda (?) a qualquer momento para reiniciar este tour ou ver o checklist de configuração.",
      target: "[data-tour='help-button']",
      roles: ["administrador", "sindico", "morador", "porteiro"],
    },
  ],
  checklistItems: [
    // ==========================================
    // Admin/Síndico Checklist
    // ==========================================
    {
      id: "create-condominium",
      title: "Cadastrar Condomínio",
      description: "Adicione o primeiro condomínio ao sistema",
      action: "/dashboard/condominiums",
      roles: ["administrador", "sindico"],
    },
    {
      id: "create-units",
      title: "Cadastrar Unidades",
      description: "Adicione as unidades/apartamentos do condomínio",
      action: "/dashboard/units",
      roles: ["administrador", "sindico"],
    },
    {
      id: "create-resident",
      title: "Cadastrar Moradores",
      description: "Registre os moradores de cada unidade",
      action: "/dashboard/residents",
      roles: ["administrador", "sindico"],
    },
    {
      id: "create-users",
      title: "Criar Contas de Usuário",
      description: "Crie logins para moradores e porteiros acessarem o sistema",
      action: "/dashboard/users",
      roles: ["administrador", "sindico"],
    },
    {
      id: "create-employees",
      title: "Cadastrar Funcionários",
      description: "Registre porteiros, zeladores e outros funcionários",
      action: "/dashboard/employees",
      roles: ["administrador", "sindico"],
    },
    {
      id: "setup-utility-rates",
      title: "Configurar Tarifas de Consumo",
      description: "Defina tarifas de água, energia e gás para cálculo automático",
      action: "/dashboard/utility-readings",
      roles: ["administrador", "sindico"],
    },
    {
      id: "setup-common-areas",
      title: "Configurar Áreas Comuns",
      description: "Cadastre salão de festas, churrasqueira, piscina, etc.",
      action: "/dashboard/common-areas",
      roles: ["administrador", "sindico"],
    },
    {
      id: "create-block-groups",
      title: "Criar Grupos de Blocos",
      description: "Organize moradores por blocos para comunicação segmentada",
      action: "/dashboard/block-groups",
      roles: ["administrador", "sindico"],
    },
    {
      id: "upload-documents",
      title: "Enviar Documentos",
      description: "Faça upload do regimento interno, convenção e atas",
      action: "/dashboard/documents",
      roles: ["administrador", "sindico"],
    },
    {
      id: "setup-ai-knowledge",
      title: "Configurar Base de Conhecimento IA",
      description: "Adicione FAQs para o assistente responder perguntas frequentes",
      action: "/dashboard/settings",
      roles: ["administrador", "sindico"],
    },
    {
      id: "generate-monthly-charges",
      title: "Gerar Cobranças Mensais",
      description: "Processe as cobranças automáticas do mês atual",
      action: "/dashboard/financial",
      roles: ["administrador", "sindico"],
    },
    {
      id: "explore-ai-assistant",
      title: "Explorar Assistente Galli",
      description: "Conheça as funcionalidades do assistente de IA",
      action: "/dashboard/ai-assistant",
      roles: ["administrador", "sindico"],
    },
    // ==========================================
    // Morador Checklist
    // ==========================================
    {
      id: "view-my-data",
      title: "Ver Meus Dados",
      description: "Confira as informações da sua unidade e cadastro",
      action: "/dashboard/resident",
      roles: ["morador"],
    },
    {
      id: "register-vehicle",
      title: "Cadastrar Veículos",
      description: "Registre seus veículos para controle de acesso",
      action: "/dashboard/resident",
      roles: ["morador"],
    },
    {
      id: "view-charges",
      title: "Consultar Cobranças",
      description: "Visualize suas taxas condominiais e histórico de pagamentos",
      action: "/dashboard/resident-financial",
      roles: ["morador"],
    },
    {
      id: "make-reservation",
      title: "Fazer Reserva",
      description: "Reserve áreas comuns como salão de festas",
      action: "/dashboard/reservations",
      roles: ["morador"],
    },
    {
      id: "authorize-visitor",
      title: "Autorizar Visitante",
      description: "Pré-autorize a entrada de visitantes e prestadores",
      action: "/dashboard/visitor-auth",
      roles: ["morador"],
    },
    {
      id: "access-group-chat",
      title: "Acessar Chat do Grupo",
      description: "Participe das conversas com seus vizinhos",
      action: "/dashboard/group-chat",
      roles: ["morador"],
    },
    {
      id: "register-maintenance",
      title: "Registrar Ocorrência",
      description: "Abra uma solicitação de manutenção ou reclamação",
      action: "/dashboard/maintenance",
      roles: ["morador"],
    },
    {
      id: "view-documents",
      title: "Consultar Documentos",
      description: "Acesse atas, regimento e comunicados do condomínio",
      action: "/dashboard/documents",
      roles: ["morador"],
    },
    {
      id: "update-profile-resident",
      title: "Atualizar Perfil",
      description: "Atualize sua foto e informações de contato",
      action: "/dashboard/settings",
      roles: ["morador"],
    },
    // ==========================================
    // Porteiro Checklist
    // ==========================================
    {
      id: "explore-doorkeeper-panel",
      title: "Conhecer o Painel",
      description: "Explore o painel com estatísticas do dia",
      action: "/dashboard/doorkeeper",
      roles: ["porteiro"],
    },
    {
      id: "register-entry",
      title: "Registrar Entrada",
      description: "Controle o acesso de visitantes ao condomínio",
      action: "/dashboard/access",
      roles: ["porteiro"],
    },
    {
      id: "register-exit",
      title: "Registrar Saída de Visitante",
      description: "Registre a saída de visitantes que estão no condomínio",
      action: "/dashboard/access",
      roles: ["porteiro"],
    },
    {
      id: "receive-package",
      title: "Receber Encomenda",
      description: "Registre encomendas recebidas para os moradores",
      action: "/dashboard/packages",
      roles: ["porteiro"],
    },
    {
      id: "deliver-package",
      title: "Entregar Encomenda",
      description: "Marque encomendas como entregues aos moradores",
      action: "/dashboard/packages",
      roles: ["porteiro"],
    },
    {
      id: "check-authorizations",
      title: "Consultar Autorizações",
      description: "Verifique visitantes pré-autorizados pelos moradores",
      action: "/dashboard/access",
      roles: ["porteiro"],
    },
    {
      id: "view-documents-doorkeeper",
      title: "Consultar Documentos",
      description: "Acesse listas de moradores e procedimentos",
      action: "/dashboard/documents",
      roles: ["porteiro"],
    },
    {
      id: "use-ai-assistant-doorkeeper",
      title: "Usar Assistente Galli",
      description: "Tire dúvidas rápidas com a assistente de IA",
      action: "/dashboard/ai-assistant",
      roles: ["porteiro"],
    },
    {
      id: "update-profile-doorkeeper",
      title: "Atualizar Perfil",
      description: "Atualize suas informações e senha de acesso",
      action: "/dashboard/settings",
      roles: ["porteiro"],
    },
  ],
};

interface OnboardingProgress {
  id: string;
  user_id: string;
  completed_steps: string[];
  tour_completed: boolean;
  dismissed_at: string | null;
}

export const useOnboarding = () => {
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Fetch progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (!data) {
        // Create initial progress record
        const { data: newData, error: insertError } = await supabase
          .from("onboarding_progress")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return {
          ...newData,
          completed_steps: [] as string[],
        } as OnboardingProgress;
      }

      return {
        ...data,
        completed_steps: Array.isArray(data.completed_steps) 
          ? data.completed_steps as string[]
          : [],
      } as OnboardingProgress;
    },
  });

  // Update progress mutation
  const updateProgress = useMutation({
    mutationFn: async (updates: Partial<Pick<OnboardingProgress, "completed_steps" | "tour_completed" | "dismissed_at">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("onboarding_progress")
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString(),
          completed_steps: updates.completed_steps as unknown as Json,
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
    },
  });

  // Filter steps by role
  const tourSteps = onboardingConfig.tourSteps.filter(
    (step) => role && step.roles.includes(role as any)
  );

  const checklistItems = onboardingConfig.checklistItems.filter(
    (step) => role && step.roles.includes(role as any)
  );

  const completedSteps = progress?.completed_steps || [];

  const completeStep = useCallback((stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      updateProgress.mutate({
        completed_steps: [...completedSteps, stepId],
      });
    }
  }, [completedSteps, updateProgress]);

  const completeTour = useCallback(() => {
    updateProgress.mutate({ tour_completed: true });
    setIsTourActive(false);
    setCurrentTourStep(0);
  }, [updateProgress]);

  const startTour = useCallback(() => {
    setCurrentTourStep(0);
    setIsTourActive(true);
    setHasAutoStarted(true);
  }, []);

  // Auto-start tour when coming from first condominium setup
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shouldStart = searchParams.get('onboarding') === 'start';
    
    if (shouldStart && !hasAutoStarted && !isLoading && progress && !progress.tour_completed) {
      // Clear query param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('onboarding');
      window.history.replaceState({}, '', url.pathname);
      
      // Small delay to ensure layout is rendered
      setTimeout(() => {
        startTour();
      }, 800);
    }
  }, [isLoading, progress, hasAutoStarted, startTour]);

  const nextTourStep = useCallback(() => {
    if (currentTourStep < tourSteps.length - 1) {
      setCurrentTourStep((prev) => prev + 1);
    } else {
      completeTour();
    }
  }, [currentTourStep, tourSteps.length, completeTour]);

  const prevTourStep = useCallback(() => {
    if (currentTourStep > 0) {
      setCurrentTourStep((prev) => prev - 1);
    }
  }, [currentTourStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const checklistProgress = {
    total: checklistItems.length,
    completed: checklistItems.filter((item) => completedSteps.includes(item.id)).length,
  };

  return {
    // State
    isLoading,
    progress,
    tourSteps,
    checklistItems,
    completedSteps,
    currentTourStep,
    isTourActive,
    isChecklistOpen,
    checklistProgress,
    
    // Actions
    setIsChecklistOpen,
    completeStep,
    completeTour,
    startTour,
    nextTourStep,
    prevTourStep,
    skipTour,
  };
};
