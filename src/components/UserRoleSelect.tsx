import type { Database } from "@/integrations/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleSelectProps {
  currentUserRole: AppRole | null;
  value: AppRole;
  onValueChange: (value: AppRole) => void;
  disabled?: boolean;
}

const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  administrador: "Administrador",
  sindico: "Síndico",
  porteiro: "Porteiro",
  morador: "Morador",
};

const getRoleOptions = (currentUserRole: AppRole | null): AppRole[] => {
  if (!currentUserRole) return [];
  
  if (currentUserRole === "owner") {
    return ["owner", "administrador", "sindico", "porteiro", "morador"];
  }
  
  if (currentUserRole === "administrador") {
    return ["administrador", "sindico", "porteiro", "morador"];
  }
  
  if (currentUserRole === "sindico") {
    return ["porteiro", "morador"];
  }
  
  if (currentUserRole === "porteiro") {
    return ["morador"];
  }
  
  return [];
};

export const UserRoleSelect = ({ 
  currentUserRole, 
  value, 
  onValueChange,
  disabled 
}: UserRoleSelectProps) => {
  const roleOptions = getRoleOptions(currentUserRole);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="bg-input border-border">
        <SelectValue placeholder="Selecione o perfil" />
      </SelectTrigger>
      <SelectContent>
        {roleOptions.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
