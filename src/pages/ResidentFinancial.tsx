import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useResidentCharges, FinancialCharge } from "@/hooks/useFinancialCharges";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Clock, CheckCircle2, ChevronDown, ChevronRight, Droplets, Zap, Flame, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { MobileChargeCard } from "@/components/MobileChargeCard";

interface BreakdownDetails {
  water?: {
    consumption_m3: number;
    rate_per_m3: number;
    amount: number;
    reading_month?: number;
    reading_year?: number;
  };
  electricity?: {
    consumption_kwh: number;
    rate_per_kwh: number;
    amount: number;
    garage_identifier?: string;
    reading_month?: number;
    reading_year?: number;
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

function ChargeBreakdown({ breakdown }: { breakdown: BreakdownDetails }) {
  const hasWater = breakdown.water && breakdown.water.amount > 0;
  const hasElectricity = breakdown.electricity && breakdown.electricity.amount > 0;
  const hasGas = breakdown.gas && breakdown.gas.amount > 0;
  const hasExpenses = breakdown.expenses && breakdown.expenses.length > 0;

  if (!hasWater && !hasElectricity && !hasGas && !hasExpenses) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Sem detalhamento disponível para esta cobrança
      </p>
    );
  }

  return (
    <div className="grid gap-4 py-3 md:grid-cols-2 lg:grid-cols-4">
      {hasWater && breakdown.water && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 text-blue-500">
            <Droplets className="h-4 w-4" />
            <span className="font-medium text-sm">Água</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo:</span>
              <span>{breakdown.water.consumption_m3.toFixed(2)} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tarifa:</span>
              <span>R$ {breakdown.water.rate_per_m3.toFixed(2)}/m³</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span>Total:</span>
              <span className="text-blue-500">R$ {breakdown.water.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {hasElectricity && breakdown.electricity && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 text-yellow-500">
            <Zap className="h-4 w-4" />
            <span className="font-medium text-sm">Energia</span>
            {breakdown.electricity.garage_identifier && (
              <span className="text-xs text-muted-foreground">
                ({breakdown.electricity.garage_identifier})
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo:</span>
              <span>{breakdown.electricity.consumption_kwh.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tarifa:</span>
              <span>R$ {breakdown.electricity.rate_per_kwh.toFixed(2)}/kWh</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span>Total:</span>
              <span className="text-yellow-500">R$ {breakdown.electricity.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {hasGas && breakdown.gas && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="font-medium text-sm">Gás</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consumo:</span>
              <span>{breakdown.gas.consumption.toFixed(2)} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tarifa:</span>
              <span>R$ {breakdown.gas.rate.toFixed(2)}/m³</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span>Total:</span>
              <span className="text-orange-500">R$ {breakdown.gas.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {hasExpenses && breakdown.expenses && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 text-purple-500">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-sm">Rateio de Despesas</span>
          </div>
          <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
            {breakdown.expenses.map((expense, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-muted-foreground truncate max-w-[120px]" title={expense.description}>
                  {expense.description}
                </span>
                <span>R$ {expense.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-medium border-t pt-1 mt-1">
              <span>Total:</span>
              <span className="text-purple-500">
                R$ {breakdown.expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpandableChargeRow({ charge, getStatusBadge }: { 
  charge: FinancialCharge; 
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const breakdown = charge.breakdown_details as BreakdownDetails | null;
  const hasBreakdown = breakdown && (
    breakdown.water || breakdown.electricity || breakdown.gas || 
    (breakdown.expenses && breakdown.expenses.length > 0)
  );

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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow 
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors",
          hasBreakdown && "border-b-0"
        )}
        onClick={() => hasBreakdown && setIsOpen(!isOpen)}
      >
        <TableCell className="w-8">
          {hasBreakdown && (
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-muted rounded">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
          )}
        </TableCell>
        <TableCell>{getChargeTypeLabel(charge.charge_type)}</TableCell>
        <TableCell className="max-w-xs truncate">
          {charge.description || "-"}
        </TableCell>
        <TableCell className="font-medium">R$ {charge.amount.toFixed(2)}</TableCell>
        <TableCell>
          {format(new Date(charge.due_date), "dd/MM/yyyy", { locale: ptBR })}
        </TableCell>
        <TableCell>{getStatusBadge(charge.status)}</TableCell>
      </TableRow>
      {hasBreakdown && breakdown && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={6} className="p-0">
              <div className="px-4 pb-3">
                <ChargeBreakdown breakdown={breakdown} />
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default function ResidentFinancial() {
  const { userId } = useUserRoleContext();
  const [unitId, setUnitId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    const fetchResidentUnit = async () => {
      if (!userId) return;
      
      const { data } = await supabase
        .from("residents")
        .select("unit_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (data) {
        setUnitId(data.unit_id);
      }
    };
    
    fetchResidentUnit();
  }, [userId]);
  
  const { charges, isLoading } = useResidentCharges(unitId);

  const totalPending = charges?.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalOverdue = charges?.filter(c => c.status === "atrasado").reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalPaid = charges?.filter(c => c.status === "pago").reduce((sum, c) => sum + c.amount, 0) || 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "secondary",
      pago: "default",
      atrasado: "destructive",
    };
    
    const labels: Record<string, string> = {
      pendente: "Pendente",
      pago: "Pago",
      atrasado: "Atrasado",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Meu Financeiro</h1>
          <p className="text-sm md:text-base text-muted-foreground">Acompanhe seus pagamentos e boletos</p>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">A Pagar</CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-yellow-500">
                R$ {totalPending.toFixed(2)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Em Atraso</CardTitle>
              <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-destructive">
                R$ {totalOverdue.toFixed(2)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Atenção
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Pagos</CardTitle>
              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-green-500">
                R$ {totalPaid.toFixed(2)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Confirmados
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg">Histórico de Pagamentos</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Clique em uma cobrança para ver o detalhamento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
            ) : charges && charges.length > 0 ? (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charges.map((charge) => (
                        <ExpandableChargeRow 
                          key={charge.id} 
                          charge={charge} 
                          getStatusBadge={getStatusBadge}
                        />
                      ))}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3">
                    {charges.map((charge) => (
                      <MobileChargeCard key={charge.id} charge={charge} />
                    ))}
                  </div>
                }
              />
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Nenhum lançamento encontrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}