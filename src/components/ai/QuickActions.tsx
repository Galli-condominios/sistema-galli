import { 
  Receipt, 
  Calendar, 
  Wrench, 
  Package, 
  UserCheck,
  BarChart3,
  Users,
  Building2,
  AlertTriangle,
  FileText,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const residentActions: QuickAction[] = [
  { label: "Minhas cobranças", prompt: "Quais são minhas cobranças pendentes?", icon: Receipt },
  { label: "Minhas reservas", prompt: "Quais são minhas próximas reservas?", icon: Calendar },
  { label: "Minhas ocorrências", prompt: "Qual o status das minhas ocorrências?", icon: Wrench },
  { label: "Minhas encomendas", prompt: "Tenho encomendas para retirar?", icon: Package },
  { label: "Regras do condomínio", prompt: "Quais são as principais regras do regimento interno?", icon: BookOpen },
  { label: "Horário festas", prompt: "Até que horas posso fazer festa no salão de festas?", icon: FileText },
  { label: "Criar ocorrência", prompt: "Quero abrir uma nova ocorrência de manutenção", icon: Wrench },
  { label: "Autorizar visitante", prompt: "Preciso autorizar a entrada de um visitante", icon: UserCheck }
];

const adminActions: QuickAction[] = [
  { label: "Resumo financeiro", prompt: "Qual o resumo financeiro do mês?", icon: BarChart3 },
  { label: "Inadimplência", prompt: "Quais unidades estão inadimplentes?", icon: AlertTriangle },
  { label: "Reservas pendentes", prompt: "Há reservas aguardando aprovação?", icon: Calendar },
  { label: "Ocorrências abertas", prompt: "Quais ocorrências estão abertas?", icon: Wrench },
  { label: "Regimento interno", prompt: "Busque informações no regimento interno sobre uso de áreas comuns", icon: BookOpen },
  { label: "Última ata", prompt: "O que foi decidido na última assembleia?", icon: FileText },
  { label: "Resumo de unidades", prompt: "Qual o resumo de ocupação das unidades?", icon: Building2 },
  { label: "Resumo de moradores", prompt: "Quantos moradores ativos temos?", icon: Users }
];

const doorkeeperActions: QuickAction[] = [
  { label: "Autorizações de hoje", prompt: "Quais visitantes estão autorizados hoje?", icon: UserCheck },
  { label: "Encomendas pendentes", prompt: "Quais encomendas estão aguardando retirada?", icon: Package },
  { label: "Registrar encomenda", prompt: "Preciso registrar uma nova encomenda", icon: Package },
  { label: "Regras visitantes", prompt: "Quais são as regras para entrada de visitantes no condomínio?", icon: BookOpen },
  { label: "Buscar unidade", prompt: "Preciso encontrar informações de uma unidade", icon: Building2 }
];

interface QuickActionsProps {
  role: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({ role, onSelect, disabled }: QuickActionsProps) {
  const actions = role === "morador" 
    ? residentActions 
    : role === "porteiro" 
      ? doorkeeperActions 
      : adminActions;

  return (
    <div className="p-3 md:p-4 border-t border-border/50">
      <p className="text-[10px] md:text-xs text-muted-foreground mb-2 md:mb-3 font-medium uppercase tracking-wider">
        Sugestões rápidas
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => onSelect(action.prompt)}
            disabled={disabled}
            className={cn(
              "h-auto py-1.5 md:py-2 px-2.5 md:px-3 text-[11px] md:text-xs whitespace-nowrap flex-shrink-0 md:flex-shrink",
              "border-border/50 bg-background/50",
              "hover:bg-primary/10 hover:border-primary/50",
              "transition-all duration-200"
            )}
          >
            <action.icon className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
