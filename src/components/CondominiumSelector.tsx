import { useState } from "react";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { useCondominium } from "@/contexts/CondominiumContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CondominiumSelectorProps {
  collapsed?: boolean;
}

interface FormData {
  name: string;
  address: string;
  total_units: string;
}

export function CondominiumSelector({ collapsed = false }: CondominiumSelectorProps) {
  const { 
    condominiums, 
    selectedCondominium, 
    selectedCondominiumId, 
    setSelectedCondominiumId, 
    loading, 
    isAdmin,
    refreshCondominiums,
  } = useCondominium();
  const { selectedOrganizationId } = useOrganization();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    total_units: "",
  });

  // Only show for admin roles
  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className={cn("px-2 py-2", collapsed && "px-1")}>
        <Skeleton className={cn("h-10 w-full", collapsed && "h-10 w-10")} />
      </div>
    );
  }

  const handleOpenCreate = () => {
    setFormData({ name: "", address: "", total_units: "" });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do condomínio é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create condominium with organization_id
      const { data: newCondo, error } = await supabase
        .from("condominiums")
        .insert({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          total_units: formData.total_units ? parseInt(formData.total_units) : null,
          organization_id: selectedOrganizationId, // Link to organization
        })
        .select()
        .single();

      if (error) throw error;

      // Create units automatically if total_units was provided
      if (formData.total_units && parseInt(formData.total_units) > 0) {
        const totalUnits = parseInt(formData.total_units);
        const unitsToCreate = Array.from({ length: totalUnits }, (_, i) => ({
          condominium_id: newCondo.id,
          unit_number: String(i + 1).padStart(3, "0"),
        }));

        const { error: unitsError } = await supabase
          .from("units")
          .insert(unitsToCreate);

        if (unitsError) {
          console.error("Error creating units:", unitsError);
        }
      }

      // Refresh list and select the new condominium
      await refreshCondominiums();
      setSelectedCondominiumId(newCondo.id);
      
      toast({
        title: "Sucesso",
        description: `Condomínio "${newCondo.name}" criado com sucesso!`,
      });

      setIsCreateOpen(false);
    } catch (error: any) {
      console.error("Error creating condominium:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar condomínio.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (collapsed) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 mx-auto"
              title={selectedCondominium?.name || "Selecionar condomínio"}
            >
              <Building2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-64">
            {condominiums.map((condo) => (
              <DropdownMenuItem
                key={condo.id}
                onClick={() => setSelectedCondominiumId(condo.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">{condo.name}</span>
                {condo.id === selectedCondominiumId && (
                  <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleOpenCreate}
              className="flex items-center gap-2 cursor-pointer text-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Condomínio</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ResponsiveDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Novo Condomínio</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Residencial Aurora"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Rua das Flores, 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_units">Número de Unidades</Label>
                <Input
                  id="total_units"
                  type="number"
                  min="0"
                  value={formData.total_units}
                  onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                  placeholder="Ex: 50"
                />
                <p className="text-xs text-muted-foreground">
                  Se informado, as unidades serão criadas automaticamente.
                </p>
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Condomínio"}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </>
    );
  }

  return (
    <>
      <div className="px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-2 px-3 bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 flex-shrink-0 text-primary" />
                <div className="text-left min-w-0">
                  <p className="text-xs text-muted-foreground">Condomínio</p>
                  <p className="font-medium text-sm truncate">
                    {selectedCondominium?.name || "Selecionar..."}
                  </p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {condominiums.map((condo) => (
              <DropdownMenuItem
                key={condo.id}
                onClick={() => setSelectedCondominiumId(condo.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{condo.name}</p>
                  {condo.address && (
                    <p className="text-xs text-muted-foreground truncate">{condo.address}</p>
                  )}
                </div>
                {condo.id === selectedCondominiumId && (
                  <Check className="h-4 w-4 text-primary ml-2 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleOpenCreate}
              className="flex items-center gap-2 cursor-pointer text-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Condomínio</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ResponsiveDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Novo Condomínio</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name-expanded">Nome *</Label>
              <Input
                id="name-expanded"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Residencial Aurora"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-expanded">Endereço</Label>
              <Input
                id="address-expanded"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Rua das Flores, 123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_units-expanded">Número de Unidades</Label>
              <Input
                id="total_units-expanded"
                type="number"
                min="0"
                value={formData.total_units}
                onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                placeholder="Ex: 50"
              />
              <p className="text-xs text-muted-foreground">
                Se informado, as unidades serão criadas automaticamente.
              </p>
            </div>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Condomínio"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
