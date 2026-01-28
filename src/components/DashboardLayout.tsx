import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { prefetchMap } from "@/App";
import type { Database } from "@/integrations/supabase/types";
import {
  Home,
  Building2,
  DoorClosed,
  Users,
  Users2,
  Car,
  UserCog,
  ShieldCheck,
  Gauge,
  LogOut,
  UserPlus,
  Calendar,
  UserCheck,
  Package,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Trees,
  Receipt,
  Bot,
  FolderOpen,
  Settings,
  Menu,
  X,
  MessageSquare,
  Crown,
  BarChart3,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { CondominiumSelector } from "@/components/CondominiumSelector";
import { OrganizationSelector } from "@/components/OrganizationSelector";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import galliLogo from "@/assets/galli-logo.png";
import { useUserRole } from "@/hooks/useUserRole";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { OnboardingButton } from "@/components/onboarding/OnboardingButton";
import { useUserPresence } from "@/hooks/useUserPresence";
import { AIChatPopup } from "@/components/ai/AIChatPopup";

type AppRole = Database["public"]["Enums"]["app_role"];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  roles: AppRole[];
}

const adminMenuItems: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home, roles: ["administrador", "sindico"] },
  { title: "Moradores", url: "/dashboard/residents", icon: Users, roles: ["administrador", "sindico"] },
  { title: "Unidades", url: "/dashboard/units", icon: DoorClosed, roles: ["administrador", "sindico"] },
  { title: "Funcionários", url: "/dashboard/employees", icon: UserCog, roles: ["administrador", "sindico"] },
  { title: "Portaria", url: "/dashboard/access", icon: ShieldCheck, roles: ["administrador", "sindico", "porteiro"] },
  { title: "Encomendas", url: "/dashboard/packages", icon: Package, roles: ["administrador", "sindico"] },
  { title: "Leituras de Consumo", url: "/dashboard/utility-readings", icon: Gauge, roles: ["administrador", "sindico"] },
  { title: "Áreas Comuns", url: "/dashboard/common-areas", icon: Trees, roles: ["administrador", "sindico"] },
  { title: "Grupos", url: "/dashboard/block-groups", icon: Users2, roles: ["administrador", "sindico"] },
  { title: "Chat dos Grupos", url: "/dashboard/group-chat", icon: MessageSquare, roles: ["administrador", "sindico"] },
  { title: "Reservas", url: "/dashboard/reservations", icon: Calendar, roles: ["administrador", "sindico"] },
  { title: "Gestão Financeira", url: "/dashboard/financial", icon: Receipt, roles: ["administrador", "sindico"] },
  { title: "Ocorrências", url: "/dashboard/maintenance", icon: Wrench, roles: ["administrador", "sindico"] },
  { title: "Documentos", url: "/dashboard/documents", icon: FolderOpen, roles: ["administrador", "sindico"] },
  { title: "Usuários", url: "/dashboard/users", icon: UserPlus, roles: ["administrador", "sindico"] },
  { title: "Assistente IA", url: "/dashboard/ai-assistant", icon: Bot, roles: ["administrador", "sindico"] },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings, roles: ["administrador", "sindico"] },
];

const residentMenuItems: MenuItem[] = [
  { title: "Minha Área", url: "/dashboard/resident", icon: Home, roles: ["morador"] },
  { title: "Chat", url: "/dashboard/group-chat", icon: MessageSquare, roles: ["morador"] },
  { title: "Reservas", url: "/dashboard/reservations", icon: Calendar, roles: ["morador"] },
  { title: "Autorizar Visitantes", url: "/dashboard/visitor-auth", icon: UserCheck, roles: ["morador"] },
  { title: "Meu Financeiro", url: "/dashboard/resident-financial", icon: Receipt, roles: ["morador"] },
  { title: "Ocorrências", url: "/dashboard/maintenance", icon: Wrench, roles: ["morador"] },
  { title: "Documentos", url: "/dashboard/documents", icon: FolderOpen, roles: ["morador"] },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings, roles: ["morador"] },
];

const doorkeeperMenuItems: MenuItem[] = [
  { title: "Painel", url: "/dashboard/doorkeeper", icon: Home, roles: ["porteiro"] },
  { title: "Portaria", url: "/dashboard/access", icon: ShieldCheck, roles: ["porteiro"] },
  { title: "Encomendas", url: "/dashboard/packages", icon: Package, roles: ["porteiro"] },
  { title: "Documentos", url: "/dashboard/documents", icon: FolderOpen, roles: ["porteiro"] },
  { title: "Assistente IA", url: "/dashboard/ai-assistant", icon: Bot, roles: ["porteiro"] },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings, roles: ["porteiro"] },
];

// Hook para obter menu items baseado no role
const useMenuItems = () => {
  const { role, hasRole } = useUserRole();
  
  return useMemo(() => {
    if (hasRole(["owner", "administrador", "sindico"])) {
      return adminMenuItems.filter(item => hasRole(item.roles));
    }
    if (hasRole("porteiro")) {
      return doorkeeperMenuItems.filter(item => hasRole(item.roles));
    }
    if (hasRole("morador")) {
      return residentMenuItems.filter(item => hasRole(item.roles));
    }
    return [];
  }, [role, hasRole]);
};

// Sidebar para Desktop
const DashboardSidebar = () => {
  const { state, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const menuItems = useMenuItems();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handlePrefetch = useCallback((url: string) => {
    const prefetchFn = prefetchMap[url];
    if (prefetchFn) {
      prefetchFn().catch(() => {});
    }
  }, []);

  return (
    <div className="relative hidden md:block" data-tour="sidebar">
      <Sidebar collapsible="icon" className="transition-all duration-300">
        <div className={`p-4 ${isCollapsed ? "flex justify-center" : ""}`}>
          <img src={galliLogo} alt="Galli" className={isCollapsed ? "h-8" : "h-20"} />
        </div>
        
        {/* Organization Selector (for multi-org admins) */}
        <OrganizationSelector collapsed={isCollapsed} />
        
        {/* Condominium Selector */}
        <div data-tour="condominium-selector">
          <CondominiumSelector collapsed={isCollapsed} />
        </div>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  // Map menu items to tour data attributes
                  const getTourAttribute = () => {
                    switch (item.url) {
                      case "/dashboard": return "menu-dashboard";
                      case "/dashboard/resident": return "menu-resident";
                      case "/dashboard/doorkeeper": return "menu-doorkeeper";
                      case "/dashboard/residents": return "menu-residents";
                      case "/dashboard/units": return "menu-units";
                      case "/dashboard/employees": return "menu-employees";
                      case "/dashboard/access": return "menu-access";
                      case "/dashboard/packages": return "menu-packages";
                      case "/dashboard/utility-readings": return "menu-utility-readings";
                      case "/dashboard/common-areas": return "menu-common-areas";
                      case "/dashboard/block-groups": return "menu-block-groups";
                      case "/dashboard/group-chat": return "menu-group-chat";
                      
                      case "/dashboard/reservations": return "menu-reservations";
                      case "/dashboard/financial": return "menu-financial";
                      case "/dashboard/resident-financial": return "menu-financial";
                      case "/dashboard/maintenance": return "menu-maintenance";
                      case "/dashboard/documents": return "menu-documents";
                      case "/dashboard/users": return "menu-users";
                      case "/dashboard/ai-assistant": return "ai-assistant";
                      case "/dashboard/settings": return "menu-settings";
                      case "/dashboard/visitor-auth": return "menu-visitor-auth";
                      default: return undefined;
                    }
                  };
                  
                  return (
                    <SidebarMenuItem 
                      key={item.title}
                      data-tour={getTourAttribute()}
                    >
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-muted/50"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                          onMouseEnter={() => handlePrefetch(item.url)}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2 group-data-[collapsible=icon]:hidden">Sair</span>
          </Button>
        </div>
      </Sidebar>
      
      {/* Toggle button outside sidebar - Desktop only */}
      <button
        onClick={toggleSidebar}
        className={`absolute top-12 z-50 h-6 w-6 rounded-full bg-primary border-2 border-background flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-md ${isCollapsed ? "left-[40px]" : "left-[248px]"}`}
        title={isCollapsed ? "Expandir menu" : "Minimizar menu"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};

// Sidebar Mobile (Sheet)
interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MobileSidebar = ({ open, onOpenChange }: MobileSidebarProps) => {
  const navigate = useNavigate();
  const menuItems = useMenuItems();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleNavigate = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center justify-center">
            <img src={galliLogo} alt="Galli" className="h-16" />
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(100%-80px)]">
          {/* Organization Selector for Mobile */}
          <OrganizationSelector />
          
          {/* Condominium Selector for Mobile */}
          <CondominiumSelector />
          
          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    onClick={() => handleNavigate(item.url)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>
          
          <div className="p-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const roleLabels: Record<string, string> = {
  administrador: "Administrador",
  sindico: "Síndico",
  morador: "Morador",
  porteiro: "Porteiro",
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { userName, role, userId } = useUserRole();
  const { profile } = useProfile(userId);
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User presence tracking
  useUserPresence(userId);

  // Onboarding
  const {
    tourSteps,
    checklistItems,
    completedSteps,
    currentTourStep,
    isTourActive,
    isChecklistOpen,
    checklistProgress,
    setIsChecklistOpen,
    completeStep,
    startTour,
    nextTourStep,
    prevTourStep,
    skipTour,
  } = useOnboarding();

  const firstName = userName?.split(' ')[0] || 'Usuário';
  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <DashboardSidebar />
        
        {/* Mobile Sidebar */}
        <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 md:h-20 border-b border-border flex items-center px-3 md:px-6 justify-between gap-2 md:gap-4">
            {/* Mobile: Hamburger + Logo */}
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <img src={galliLogo} alt="Galli" className="h-8" />
            </div>
            
            {/* Desktop: Welcome message */}
            <h1 className="hidden md:block text-xl font-semibold whitespace-nowrap">
              Olá, <span className="text-primary">{firstName}</span>. Seja bem-vindo(a)!
            </h1>
            
            {/* Search - Hidden on mobile, shown in header on desktop */}
            <div className="hidden md:block flex-1 max-w-md" data-tour="global-search">
              <GlobalSearch />
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile: Compact search button */}
              <div className="md:hidden">
                <GlobalSearch />
              </div>
              
              <div data-tour="notifications">
                <NotificationBell />
              </div>
              <ThemeToggle />
              
              {/* Onboarding Help Button */}
              <OnboardingButton
                onOpenChecklist={() => setIsChecklistOpen(true)}
                onStartTour={startTour}
                progress={checklistProgress}
              />
              
              {/* Avatar - Simplified on mobile */}
              <div 
                className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/dashboard/settings')}
                title="Ir para configurações"
              >
                <Avatar className="h-8 w-8 md:h-10 md:w-10 bg-primary/20">
                  {profile?.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={userName || "Avatar"} />
                  )}
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs md:text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Hide name/role on mobile */}
                <div className="hidden md:flex flex-col">
                  <span className="text-sm font-medium">{userName || 'Usuário'}</span>
                  <span className="text-xs text-muted-foreground">
                    {role ? roleLabels[role] || role : 'Carregando...'}
                  </span>
                </div>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 p-3 md:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour
        steps={tourSteps}
        currentStep={currentTourStep}
        isActive={isTourActive}
        onNext={nextTourStep}
        onPrev={prevTourStep}
        onSkip={skipTour}
      />

      {/* Onboarding Checklist */}
      <OnboardingChecklist
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        items={checklistItems}
        completedSteps={completedSteps}
        onCompleteStep={completeStep}
        onStartTour={startTour}
        progress={checklistProgress}
      />

      {/* AI Chat Popup for residents */}
      {role === "morador" && <AIChatPopup />}
    </SidebarProvider>
  );
};

export default DashboardLayout;
