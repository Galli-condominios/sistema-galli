import { Building, ChevronDown, Check } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OrganizationSelectorProps {
  collapsed?: boolean;
}

export function OrganizationSelector({ collapsed = false }: OrganizationSelectorProps) {
  const { hasRole } = useUserRole();
  const { 
    organizations, 
    selectedOrganization, 
    selectedOrganizationId, 
    setSelectedOrganizationId, 
    loading,
  } = useOrganization();

  // Only show for admin roles
  const isAdmin = hasRole(["administrador", "sindico"]);
  if (!isAdmin) return null;

  // Only show if user has more than one organization
  if (!loading && organizations.length <= 1) return null;

  if (loading) {
    return (
      <div className={cn("px-2 py-2", collapsed && "px-1")}>
        <Skeleton className={cn("h-10 w-full", collapsed && "h-10 w-10")} />
      </div>
    );
  }

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 mx-auto"
            title={selectedOrganization?.name || "Selecionar organização"}
          >
            <Building className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-64">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setSelectedOrganizationId(org.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="truncate">{org.name}</span>
              {org.id === selectedOrganizationId && (
                <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="px-2 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-2 px-3 bg-primary/10 border-primary/20 hover:bg-primary/20"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building className="h-4 w-4 flex-shrink-0 text-primary" />
              <div className="text-left min-w-0">
                <p className="text-xs text-muted-foreground">Organização</p>
                <p className="font-medium text-sm truncate">
                  {selectedOrganization?.name || "Selecionar..."}
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setSelectedOrganizationId(org.id)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{org.name}</p>
                <p className="text-xs text-muted-foreground">
                  Plano: {org.plan === 'free' ? 'Gratuito' : org.plan}
                </p>
              </div>
              {org.id === selectedOrganizationId && (
                <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
