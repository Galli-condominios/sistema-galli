import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock, Crown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const OwnerFinancial = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["owner-financial"],
    queryFn: async () => {
      const [chargesResult, orgsResult, condosResult] = await Promise.all([
        supabase.from("financial_charges").select("id, amount, status, due_date, charge_type, condominium_id, created_at"),
        supabase.from("organizations").select("id, name"),
        supabase.from("condominiums").select("id, name, organization_id"),
      ]);

      if (chargesResult.error) throw chargesResult.error;

      // Calculate totals
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let overdueAmount = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      // By type
      const byType: Record<string, { amount: number; count: number }> = {};

      // By organization
      const condoToOrg: Record<string, string> = {};
      condosResult.data?.forEach((c) => {
        if (c.organization_id) {
          condoToOrg[c.id] = c.organization_id;
        }
      });

      const byOrganization: Record<string, { name: string; total: number; paid: number; pending: number; overdue: number }> = {};
      orgsResult.data?.forEach((org) => {
        byOrganization[org.id] = { name: org.name, total: 0, paid: 0, pending: 0, overdue: 0 };
      });

      // Monthly data for last 6 months
      const monthlyData: Record<string, { month: string; faturado: number; recebido: number; pendente: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, "yyyy-MM");
        monthlyData[monthKey] = {
          month: format(date, "MMM/yy", { locale: ptBR }),
          faturado: 0,
          recebido: 0,
          pendente: 0,
        };
      }

      chargesResult.data?.forEach((charge) => {
        const amount = Number(charge.amount) || 0;
        totalAmount += amount;

        // By status
        if (charge.status === "pago") {
          paidAmount += amount;
          paidCount++;
        } else if (charge.status === "pendente") {
          pendingAmount += amount;
          pendingCount++;
        } else if (charge.status === "atrasado") {
          overdueAmount += amount;
          overdueCount++;
        }

        // By type
        const type = charge.charge_type || "outros";
        if (!byType[type]) {
          byType[type] = { amount: 0, count: 0 };
        }
        byType[type].amount += amount;
        byType[type].count++;

        // By organization
        const orgId = condoToOrg[charge.condominium_id];
        if (orgId && byOrganization[orgId]) {
          byOrganization[orgId].total += amount;
          if (charge.status === "pago") byOrganization[orgId].paid += amount;
          else if (charge.status === "pendente") byOrganization[orgId].pending += amount;
          else if (charge.status === "atrasado") byOrganization[orgId].overdue += amount;
        }

        // Monthly
        const monthKey = format(new Date(charge.created_at), "yyyy-MM");
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].faturado += amount;
          if (charge.status === "pago") {
            monthlyData[monthKey].recebido += amount;
          } else {
            monthlyData[monthKey].pendente += amount;
          }
        }
      });

      return {
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        paidCount,
        pendingCount,
        overdueCount,
        totalCount: chargesResult.data?.length || 0,
        byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
        byOrganization: Object.values(byOrganization).filter((o) => o.total > 0),
        monthlyData: Object.values(monthlyData),
        collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      };
    },
  });

  const typeLabels: Record<string, string> = {
    condominio: "Condomínio",
    extra: "Taxa Extra",
    multa: "Multa",
    reserva: "Reserva",
    outros: "Outros",
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Financeiro Global"
            description="Visão financeira de todo o sistema"
          />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <PageHeader
            title="Financeiro Global"
            description="Visão financeira de todas as organizações"
          />
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Total Faturado"
            value={formatCurrency(stats?.totalAmount || 0)}
            icon={DollarSign}
            variant="primary"
          />
          <StatsCard
            title="Recebido"
            value={formatCurrency(stats?.paidAmount || 0)}
            icon={CheckCircle}
            variant="success"
            description={`${stats?.paidCount || 0} cobranças`}
          />
          <StatsCard
            title="Pendente"
            value={formatCurrency(stats?.pendingAmount || 0)}
            icon={Clock}
            variant="warning"
            description={`${stats?.pendingCount || 0} cobranças`}
          />
          <StatsCard
            title="Em Atraso"
            value={formatCurrency(stats?.overdueAmount || 0)}
            icon={AlertTriangle}
            variant="default"
            description={`${stats?.overdueCount || 0} cobranças`}
          />
        </div>

        {/* Collection Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Taxa de Arrecadação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${stats?.collectionRate || 0}%` }}
                />
              </div>
              <span className="text-xl font-bold">{(stats?.collectionRate || 0).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Faturamento e recebimento nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--chart-1))" />
                <Bar dataKey="recebido" name="Recebido" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Type */}
          <Card>
            <CardHeader>
              <CardTitle>Por Tipo de Cobrança</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.byType && stats.byType.length > 0 ? (
                  stats.byType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{typeLabels[item.type] || item.type}</p>
                        <p className="text-sm text-muted-foreground">{item.count} cobranças</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.amount)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhuma cobrança registrada</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Organization */}
          <Card>
            <CardHeader>
              <CardTitle>Por Organização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.byOrganization && stats.byOrganization.length > 0 ? (
                  stats.byOrganization.slice(0, 5).map((org) => (
                    <div key={org.name} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{org.name}</p>
                        <p className="font-semibold">{formatCurrency(org.total)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                          Pago: {formatCurrency(org.paid)}
                        </Badge>
                        {org.overdue > 0 && (
                          <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600">
                            Atraso: {formatCurrency(org.overdue)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">Nenhuma organização com cobranças</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerFinancial;
