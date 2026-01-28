import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Droplets, Zap, Flame, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MobileDataCard, MobileDataRow, MobileDataHeader } from "@/components/MobileDataCard";

interface BreakdownDetails {
  water?: {
    consumption_m3: number;
    rate_per_m3: number;
    amount: number;
  };
  electricity?: {
    consumption_kwh: number;
    rate_per_kwh: number;
    amount: number;
    garage_identifier?: string;
  };
  gas?: {
    consumption: number;
    rate: number;
    amount: number;
  };
  expenses?: Array<{
    description: string;
    category: string;
    amount: number;
  }>;
}

interface MobileChargeCardProps {
  charge: {
    id: string;
    charge_type: string;
    description: string | null;
    amount: number;
    due_date: string;
    status: string;
    breakdown_details?: any;
  };
}

const getChargeTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    taxa_condominio: "Taxa de Condomínio",
    taxa_extra: "Taxa Extra",
    multa: "Multa",
    agua: "Água",
    energia: "Energia",
    gas: "Gás",
    outros: "Outros",
  };
  return labels[type] || type;
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
    pendente: { text: "Pendente", variant: "secondary" },
    pago: { text: "Pago", variant: "default" },
    atrasado: { text: "Atrasado", variant: "destructive" },
  };
  const { text, variant } = config[status] || config.pendente;
  return <Badge variant={variant}>{text}</Badge>;
};

export function MobileChargeCard({ charge }: MobileChargeCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const breakdown = charge.breakdown_details as BreakdownDetails | null;
  const hasBreakdown = breakdown && (
    breakdown.water || breakdown.electricity || breakdown.gas || 
    (breakdown.expenses && breakdown.expenses.length > 0)
  );

  return (
    <MobileDataCard>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{getChargeTypeLabel(charge.charge_type)}</span>
              {getStatusBadge(charge.status)}
            </div>
            {charge.description && (
              <p className="text-xs text-muted-foreground truncate">{charge.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-sm">R$ {charge.amount.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">
              Venc: {format(new Date(charge.due_date), "dd/MM/yy", { locale: ptBR })}
            </div>
          </div>
        </div>

        {hasBreakdown && (
          <>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary mt-2 w-full justify-center py-1">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {isOpen ? "Ocultar detalhes" : "Ver detalhes"}
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="grid gap-2 pt-2 border-t border-border mt-2">
                {breakdown?.water && breakdown.water.amount > 0 && (
                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-2">
                    <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                      <Droplets className="h-3 w-3" />
                      <span className="font-medium text-xs">Água</span>
                    </div>
                    <div className="text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consumo:</span>
                        <span>{breakdown.water.consumption_m3.toFixed(2)} m³</span>
                      </div>
                      <div className="flex justify-between font-medium text-blue-500">
                        <span>Total:</span>
                        <span>R$ {breakdown.water.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {breakdown?.electricity && breakdown.electricity.amount > 0 && (
                  <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-2">
                    <div className="flex items-center gap-1.5 text-yellow-500 mb-1">
                      <Zap className="h-3 w-3" />
                      <span className="font-medium text-xs">Energia</span>
                    </div>
                    <div className="text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consumo:</span>
                        <span>{breakdown.electricity.consumption_kwh.toFixed(2)} kWh</span>
                      </div>
                      <div className="flex justify-between font-medium text-yellow-500">
                        <span>Total:</span>
                        <span>R$ {breakdown.electricity.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {breakdown?.gas && breakdown.gas.amount > 0 && (
                  <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-2">
                    <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                      <Flame className="h-3 w-3" />
                      <span className="font-medium text-xs">Gás</span>
                    </div>
                    <div className="text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consumo:</span>
                        <span>{breakdown.gas.consumption.toFixed(2)} m³</span>
                      </div>
                      <div className="flex justify-between font-medium text-orange-500">
                        <span>Total:</span>
                        <span>R$ {breakdown.gas.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {breakdown?.expenses && breakdown.expenses.length > 0 && (
                  <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-2">
                    <div className="flex items-center gap-1.5 text-purple-500 mb-1">
                      <Building2 className="h-3 w-3" />
                      <span className="font-medium text-xs">Rateio</span>
                    </div>
                    <div className="text-[11px] space-y-0.5">
                      {breakdown.expenses.slice(0, 3).map((exp, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-muted-foreground truncate max-w-[60%]">{exp.description}</span>
                          <span>R$ {exp.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-medium text-purple-500 pt-1 border-t border-purple-500/20">
                        <span>Total:</span>
                        <span>R$ {breakdown.expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </>
        )}
      </Collapsible>
    </MobileDataCard>
  );
}
