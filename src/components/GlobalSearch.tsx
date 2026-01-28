import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Building2, Users, Car, DoorClosed, FileText, 
  Briefcase, Package, Wrench, Calendar, UserCheck, DollarSign,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "page" | "resident" | "condominium" | "unit" | "vehicle" | "employee" | "package" | "maintenance" | "reservation" | "visitor" | "document" | "charge";
  url: string;
  icon: React.ReactNode;
}

const pageItems = [
  { title: "Dashboard", url: "/dashboard", roles: ["administrador", "sindico"] },
  { title: "Minha Área", url: "/dashboard/resident", roles: ["morador"] },
  { title: "Moradores", url: "/dashboard/residents", roles: ["administrador", "sindico"] },
  { title: "Unidades", url: "/dashboard/units", roles: ["administrador", "sindico"] },
  { title: "Funcionários", url: "/dashboard/employees", roles: ["administrador", "sindico"] },
  { title: "Controle de Acesso", url: "/dashboard/access", roles: ["administrador", "sindico", "porteiro"] },
  { title: "Leitura de Consumo", url: "/dashboard/utility-readings", roles: ["administrador", "sindico"] },
  { title: "Áreas Comuns", url: "/dashboard/common-areas", roles: ["administrador", "sindico"] },
  { title: "Reservas", url: "/dashboard/reservations", roles: ["administrador", "sindico", "morador"] },
  { title: "Gestão Financeira", url: "/dashboard/financial", roles: ["administrador", "sindico"] },
  { title: "Meu Financeiro", url: "/dashboard/resident-financial", roles: ["morador"] },
  { title: "Ocorrências", url: "/dashboard/maintenance", roles: ["administrador", "sindico", "morador"] },
  { title: "Documentos", url: "/dashboard/documents", roles: ["administrador", "sindico", "morador", "porteiro"] },
  { title: "Usuários", url: "/dashboard/users", roles: ["administrador", "sindico"] },
  { title: "Encomendas", url: "/dashboard/packages", roles: ["porteiro"] },
  { title: "Assistente IA", url: "/dashboard/ai-assistant", roles: ["administrador", "sindico", "morador", "porteiro"] },
  { title: "Configurações", url: "/dashboard/settings", roles: ["administrador", "sindico", "morador", "porteiro"] },
];

const typeLabels: Record<string, string> = {
  page: "Páginas",
  resident: "Moradores",
  condominium: "Condomínios",
  unit: "Unidades",
  vehicle: "Veículos",
  employee: "Funcionários",
  package: "Encomendas",
  maintenance: "Ocorrências",
  reservation: "Reservas",
  visitor: "Visitantes",
  document: "Documentos",
  charge: "Cobranças",
};

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { role, hasRole } = useUserRole();
  const isMobile = useIsMobile();

  // Keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchResults: SearchResult[] = [];
    const searchLower = searchQuery.toLowerCase();

    try {
      // Search pages (filtered by role)
      const filteredPages = pageItems
        .filter(page => hasRole(page.roles as any))
        .filter(page => page.title.toLowerCase().includes(searchLower))
        .map(page => ({
          id: `page-${page.url}`,
          title: page.title,
          type: "page" as const,
          url: page.url,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        }));
      
      searchResults.push(...filteredPages);

      // Admin/Síndico searches
      if (hasRole(["administrador", "sindico"])) {
        // Search residents
        const { data: residents } = await supabase
          .from("residents")
          .select(`id, profiles:user_id (full_name), units:unit_id (unit_number, block)`)
          .limit(5);

        if (residents) {
          const filteredResidents = residents
            .filter(r => ((r.profiles as any)?.full_name || "").toLowerCase().includes(searchLower))
            .map(r => ({
              id: `resident-${r.id}`,
              title: (r.profiles as any)?.full_name || "Morador",
              subtitle: `Unidade ${(r.units as any)?.unit_number}${(r.units as any)?.block ? ` - ${(r.units as any)?.block}` : ""}`,
              type: "resident" as const,
              url: `/dashboard/residents/${r.id}/vehicles`,
              icon: <Users className="h-4 w-4 text-blue-500" />,
            }));
          searchResults.push(...filteredResidents);
        }

        // Search condominiums
        const { data: condominiums } = await supabase
          .from("condominiums")
          .select("id, name, address")
          .ilike("name", `%${searchQuery}%`)
          .limit(5);

        if (condominiums) {
          searchResults.push(...condominiums.map(c => ({
            id: `condo-${c.id}`,
            title: c.name,
            subtitle: c.address || undefined,
            type: "condominium" as const,
            url: `/dashboard/condominiums/${c.id}/units`,
            icon: <Building2 className="h-4 w-4 text-green-500" />,
          })));
        }

        // Search units
        const { data: units } = await supabase
          .from("units")
          .select(`id, unit_number, block, floor, condominiums:condominium_id (name)`)
          .or(`unit_number.ilike.%${searchQuery}%,block.ilike.%${searchQuery}%`)
          .limit(5);

        if (units) {
          searchResults.push(...units.map(u => ({
            id: `unit-${u.id}`,
            title: `Unidade ${u.unit_number}${u.block ? ` - ${u.block}` : ""}`,
            subtitle: (u.condominiums as any)?.name || undefined,
            type: "unit" as const,
            url: `/dashboard/units`,
            icon: <DoorClosed className="h-4 w-4 text-purple-500" />,
          })));
        }

        // Search vehicles (by plate or model)
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select(`id, plate, model, color, residents:resident_id (id, profiles:user_id (full_name))`)
          .or(`plate.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`)
          .limit(5);

        if (vehicles) {
          searchResults.push(...vehicles.map(v => ({
            id: `vehicle-${v.id}`,
            title: v.plate,
            subtitle: `${v.model}${v.color ? ` - ${v.color}` : ""}`,
            type: "vehicle" as const,
            url: (v.residents as any)?.id ? `/dashboard/residents/${(v.residents as any).id}/vehicles` : `/dashboard/vehicles`,
            icon: <Car className="h-4 w-4 text-orange-500" />,
          })));
        }

        // Search employees
        const { data: employees } = await supabase
          .from("employees")
          .select(`id, name, position, condominiums:condominium_id (name)`)
          .or(`name.ilike.%${searchQuery}%,position.ilike.%${searchQuery}%`)
          .limit(5);

        if (employees) {
          searchResults.push(...employees.map(e => ({
            id: `employee-${e.id}`,
            title: e.name,
            subtitle: `${e.position} - ${(e.condominiums as any)?.name || ""}`,
            type: "employee" as const,
            url: `/dashboard/employees`,
            icon: <Briefcase className="h-4 w-4 text-indigo-500" />,
          })));
        }

        // Search maintenance requests
        const { data: maintenance } = await supabase
          .from("maintenance_requests")
          .select(`id, title, status, category`)
          .ilike("title", `%${searchQuery}%`)
          .limit(5);

        if (maintenance) {
          searchResults.push(...maintenance.map(m => ({
            id: `maintenance-${m.id}`,
            title: m.title,
            subtitle: `${m.category} - ${m.status}`,
            type: "maintenance" as const,
            url: `/dashboard/maintenance`,
            icon: <Wrench className="h-4 w-4 text-yellow-500" />,
          })));
        }

        // Search reservations (by common area name)
        const { data: reservations } = await supabase
          .from("reservations")
          .select(`id, reservation_date, status, common_areas:common_area_id (name), units:unit_id (unit_number)`)
          .limit(10);

        if (reservations) {
          const filteredReservations = reservations
            .filter(r => ((r.common_areas as any)?.name || "").toLowerCase().includes(searchLower))
            .slice(0, 5)
            .map(r => ({
              id: `reservation-${r.id}`,
              title: (r.common_areas as any)?.name || "Reserva",
              subtitle: `${new Date(r.reservation_date).toLocaleDateString("pt-BR")} - Unidade ${(r.units as any)?.unit_number}`,
              type: "reservation" as const,
              url: `/dashboard/reservations`,
              icon: <Calendar className="h-4 w-4 text-cyan-500" />,
            }));
          searchResults.push(...filteredReservations);
        }

        // Search visitor authorizations
        const { data: visitors } = await supabase
          .from("visitor_authorizations")
          .select(`id, visitor_name, visitor_document, status, units:unit_id (unit_number)`)
          .or(`visitor_name.ilike.%${searchQuery}%,visitor_document.ilike.%${searchQuery}%`)
          .limit(5);

        if (visitors) {
          searchResults.push(...visitors.map(v => ({
            id: `visitor-${v.id}`,
            title: v.visitor_name,
            subtitle: `Unidade ${(v.units as any)?.unit_number} - ${v.status}`,
            type: "visitor" as const,
            url: `/dashboard/access`,
            icon: <UserCheck className="h-4 w-4 text-teal-500" />,
          })));
        }

        // Search documents
        const { data: documents } = await supabase
          .from("documents")
          .select(`id, title, category, condominiums:condominium_id (name)`)
          .ilike("title", `%${searchQuery}%`)
          .limit(5);

        if (documents) {
          searchResults.push(...documents.map(d => ({
            id: `document-${d.id}`,
            title: d.title,
            subtitle: `${d.category} - ${(d.condominiums as any)?.name || ""}`,
            type: "document" as const,
            url: `/dashboard/documents`,
            icon: <FileText className="h-4 w-4 text-rose-500" />,
          })));
        }

        // Search financial charges
        const { data: charges } = await supabase
          .from("financial_charges")
          .select(`id, charge_type, amount, status, units:unit_id (unit_number)`)
          .or(`charge_type.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(5);

        if (charges) {
          searchResults.push(...charges.map(c => ({
            id: `charge-${c.id}`,
            title: `${c.charge_type} - R$ ${Number(c.amount).toFixed(2)}`,
            subtitle: `Unidade ${(c.units as any)?.unit_number} - ${c.status}`,
            type: "charge" as const,
            url: `/dashboard/financial`,
            icon: <DollarSign className="h-4 w-4 text-emerald-500" />,
          })));
        }
      }

      // Porteiro searches
      if (hasRole(["porteiro"])) {
        // Search packages
        const { data: packages } = await supabase
          .from("packages")
          .select(`id, sender, tracking_code, status, units:unit_id (unit_number)`)
          .or(`sender.ilike.%${searchQuery}%,tracking_code.ilike.%${searchQuery}%`)
          .limit(5);

        if (packages) {
          searchResults.push(...packages.map(p => ({
            id: `package-${p.id}`,
            title: p.tracking_code || p.sender || "Encomenda",
            subtitle: `Unidade ${(p.units as any)?.unit_number} - ${p.status}`,
            type: "package" as const,
            url: `/dashboard/packages`,
            icon: <Package className="h-4 w-4 text-amber-500" />,
          })));
        }

        // Search visitor authorizations
        const { data: visitors } = await supabase
          .from("visitor_authorizations")
          .select(`id, visitor_name, visitor_document, status, units:unit_id (unit_number)`)
          .or(`visitor_name.ilike.%${searchQuery}%,visitor_document.ilike.%${searchQuery}%`)
          .limit(5);

        if (visitors) {
          searchResults.push(...visitors.map(v => ({
            id: `visitor-${v.id}`,
            title: v.visitor_name,
            subtitle: `Unidade ${(v.units as any)?.unit_number} - ${v.status}`,
            type: "visitor" as const,
            url: `/dashboard/access`,
            icon: <UserCheck className="h-4 w-4 text-teal-500" />,
          })));
        }
      }

      // Morador searches (only their own data - filtered by RLS)
      if (hasRole(["morador"])) {
        // Search own maintenance requests
        const { data: maintenance } = await supabase
          .from("maintenance_requests")
          .select(`id, title, status, category`)
          .ilike("title", `%${searchQuery}%`)
          .limit(5);

        if (maintenance) {
          searchResults.push(...maintenance.map(m => ({
            id: `maintenance-${m.id}`,
            title: m.title,
            subtitle: `${m.category} - ${m.status}`,
            type: "maintenance" as const,
            url: `/dashboard/maintenance`,
            icon: <Wrench className="h-4 w-4 text-yellow-500" />,
          })));
        }

        // Search own reservations
        const { data: reservations } = await supabase
          .from("reservations")
          .select(`id, reservation_date, status, common_areas:common_area_id (name)`)
          .limit(10);

        if (reservations) {
          const filteredReservations = reservations
            .filter(r => ((r.common_areas as any)?.name || "").toLowerCase().includes(searchLower))
            .slice(0, 5)
            .map(r => ({
              id: `reservation-${r.id}`,
              title: (r.common_areas as any)?.name || "Reserva",
              subtitle: `${new Date(r.reservation_date).toLocaleDateString("pt-BR")} - ${r.status}`,
              type: "reservation" as const,
              url: `/dashboard/reservations`,
              icon: <Calendar className="h-4 w-4 text-cyan-500" />,
            }));
          searchResults.push(...filteredReservations);
        }

        // Search documents (public ones)
        const { data: documents } = await supabase
          .from("documents")
          .select(`id, title, category`)
          .ilike("title", `%${searchQuery}%`)
          .limit(5);

        if (documents) {
          searchResults.push(...documents.map(d => ({
            id: `document-${d.id}`,
            title: d.title,
            subtitle: d.category,
            type: "document" as const,
            url: `/dashboard/documents`,
            icon: <FileText className="h-4 w-4 text-rose-500" />,
          })));
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hasRole]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.url);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    const label = typeLabels[result.type];
    if (!acc[label]) {
      acc[label] = [];
    }
    acc[label].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Desktop: Full button with text */}
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-lg bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80 hidden md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Pesquisar...</span>
        <span className="inline-flex lg:hidden">Pesquisar...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Mobile: Icon only button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Search Content - Different containers for mobile/desktop */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="top" className="h-[85vh] p-0 pt-0">
            <Command className="h-full flex flex-col">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Pesquisar..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CommandList className="flex-1 overflow-auto max-h-none">
                <CommandEmpty>
                  {isLoading ? "Buscando..." : "Nenhum resultado encontrado."}
                </CommandEmpty>
                
                {Object.entries(groupedResults).map(([group, items]) => (
                  <CommandGroup key={group} heading={group}>
                    {items.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={result.title}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer py-3"
                      >
                        {result.icon}
                        <div className="ml-2 flex flex-col">
                          <span className="text-sm">{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
            <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
              <CommandInput 
                placeholder="Pesquisar páginas, moradores, encomendas, ocorrências..." 
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Buscando..." : "Nenhum resultado encontrado."}
                </CommandEmpty>
                
                {Object.entries(groupedResults).map(([group, items]) => (
                  <CommandGroup key={group} heading={group}>
                    {items.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={result.title}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer"
                      >
                        {result.icon}
                        <div className="ml-2 flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
