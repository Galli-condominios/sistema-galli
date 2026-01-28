import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Crown,
  LayoutDashboard,
  Building2,
  Users,
  DollarSign,
  Bot,
  Activity,
  Settings,
  LogOut,
  Menu,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import galliLogo from "@/assets/galli-logo.png";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { title: "Dashboard", url: "/superadmin/dashboard", icon: LayoutDashboard },
  { title: "Organizações", url: "/superadmin/organizations", icon: Building2 },
  { title: "Usuários", url: "/superadmin/users", icon: Users },
  { title: "Financeiro", url: "/superadmin/financial", icon: DollarSign },
  { title: "Uso de IA", url: "/superadmin/ai-usage", icon: Bot },
  { title: "Monitoramento", url: "/superadmin/monitoring", icon: Activity },
  { title: "Configurações", url: "/superadmin/settings", icon: Settings },
  { title: "Minha Conta", url: "/superadmin/account", icon: User },
];

const NavLink = ({
  item,
  isCollapsed,
  onClick,
}: {
  item: (typeof menuItems)[0];
  isCollapsed?: boolean;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const isActive = location.pathname === item.url;

  return (
    <Link
      to={item.url}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-amber-500/10",
        isActive
          ? "bg-amber-500/20 text-amber-500 font-medium"
          : "text-muted-foreground hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
      title={isCollapsed ? item.title : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && <span>{item.title}</span>}
    </Link>
  );
};

const Sidebar = ({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) => {
  const { logout, email } = useSuperAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/superadmin");
  };

  return (
    <div
      className={cn(
        "hidden lg:flex flex-col border-r bg-gradient-to-b from-background to-muted/20 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={`p-4 ${isCollapsed ? "flex justify-center" : ""}`}>
          <Link to="/superadmin/dashboard">
            <img src={galliLogo} alt="Galli" className={isCollapsed ? "h-8" : "h-20"} />
          </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <NavLink key={item.url} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {!isCollapsed && email && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {email}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("w-full", isCollapsed ? "justify-center" : "justify-end")}
          onClick={onToggle}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

const MobileSidebar = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { logout, email } = useSuperAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/superadmin");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b px-4 justify-center">
            <Link to="/superadmin/dashboard" onClick={() => onOpenChange(false)}>
              <img src={galliLogo} alt="Galli" className="h-16" />
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.url}
                  item={item}
                  onClick={() => onOpenChange(false)}
                />
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-3 space-y-2">
            {email && (
              <div className="px-3 py-2 text-xs text-muted-foreground truncate">
                {email}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <Crown className="h-3 w-3" />
              Super Admin
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};