import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader } from "@/components/MobileDataCard";
import {
  Building2,
  Users,
  Car,
  Home,
  Calendar,
  Wrench,
  Package,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import TableSkeleton from "@/components/TableSkeleton";
import StatsCardSkeleton from "@/components/StatsCardSkeleton";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import { useOrganizationFilter } from "@/hooks/useOrganizationFilter";
import { useOverdueCharges, useFinancialCharges } from "@/hooks/useFinancialCharges";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  condominiums: number;
  units: number;
  residents: number;
  vehicles: number;
  pendingReservations: number;
  openMaintenance: number;
  pendingPackages: number;
}

interface RecentActivity {
  id: string;
  type: "reservation" | "maintenance" | "package" | "visitor";
  title: string;
  description: string;
  time: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { condominiumId, condominium, shouldFilter } = useCondominiumFilter();
  const { organizationId, shouldFilter: shouldFilterOrg } = useOrganizationFilter();
  const [stats, setStats] = useState<DashboardStats>({
    condominiums: 0,
    units: 0,
    residents: 0,
    vehicles: 0,
    pendingReservations: 0,
    openMaintenance: 0,
    pendingPackages: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Financial data
  const { overdueCharges, isLoading: isLoadingOverdue } = useOverdueCharges();
  const { charges, isLoading: isLoadingCharges } = useFinancialCharges();

  // Filter financial data by condominium
  const filteredOverdueCharges = shouldFilter 
    ? overdueCharges?.filter(c => c.condominium_id === condominiumId) 
    : overdueCharges;
  const filteredCharges = shouldFilter
    ? charges?.filter(c => c.condominium_id === condominiumId)
    : charges;

  const totalOverdue = filteredOverdueCharges?.reduce((sum, charge) => sum + charge.amount, 0) || 0;
  const totalPending = filteredCharges?.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.amount, 0) || 0;
  const totalPaid = filteredCharges?.filter(c => c.status === "pago").reduce((sum, c) => sum + c.amount, 0) || 0;
  const overdueUnits = new Set(filteredOverdueCharges?.map(c => c.unit_id)).size;

  const getDaysOverdue = (dueDate: string) => {
    return differenceInDays(new Date(), new Date(dueDate));
  };

  const getUrgencyColor = (days: number) => {
    if (days > 60) return "text-destructive";
    if (days > 30) return "text-orange-500";
    return "text-yellow-500";
  };

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Build queries with optional condominium filter
        let unitsQuery = supabase.from("units").select("*", { count: "exact", head: true });
        let residentsQuery = supabase.from("residents").select("*, units!inner(condominium_id)", { count: "exact", head: true });
        let vehiclesQuery = supabase.from("vehicles").select("*, units!inner(condominium_id)", { count: "exact", head: true });
        let reservationsQuery = supabase.from("reservations").select("*, common_areas!inner(condominium_id)", { count: "exact", head: true }).eq("status", "pendente");
        let maintenanceQuery = supabase.from("maintenance_requests").select("*", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]);
        let packagesQuery = supabase.from("packages").select("*, units!inner(condominium_id)", { count: "exact", head: true }).eq("status", "aguardando");

        if (shouldFilter && condominiumId) {
          unitsQuery = unitsQuery.eq("condominium_id", condominiumId);
          residentsQuery = residentsQuery.eq("units.condominium_id", condominiumId);
          vehiclesQuery = vehiclesQuery.eq("units.condominium_id", condominiumId);
          reservationsQuery = reservationsQuery.eq("common_areas.condominium_id", condominiumId);
          maintenanceQuery = maintenanceQuery.eq("condominium_id", condominiumId);
          packagesQuery = packagesQuery.eq("units.condominium_id", condominiumId);
        }

        const [
          condos,
          units,
          residents,
          vehicles,
          reservations,
          maintenance,
          packages,
        ] = await Promise.all([
          // Filter condominiums by organization
          shouldFilterOrg && organizationId
            ? supabase.from("condominiums").select("*", { count: "exact", head: true }).eq("organization_id", organizationId)
            : supabase.from("condominiums").select("*", { count: "exact", head: true }),
          unitsQuery,
          residentsQuery,
          vehiclesQuery,
          reservationsQuery,
          maintenanceQuery,
          packagesQuery,
        ]);

        setStats({
          condominiums: condos.count || 0,
          units: units.count || 0,
          residents: residents.count || 0,
          vehicles: vehicles.count || 0,
          pendingReservations: reservations.count || 0,
          openMaintenance: maintenance.count || 0,
          pendingPackages: packages.count || 0,
        });

        // Fetch recent activity - filter by condominium
        let recentReservationsQuery = supabase
          .from("reservations")
          .select("id, status, created_at, common_area_id, common_areas!inner(condominium_id)")
          .order("created_at", { ascending: false })
          .limit(3);

        let recentMaintenanceQuery = supabase
          .from("maintenance_requests")
          .select("id, title, status, created_at, condominium_id")
          .order("created_at", { ascending: false })
          .limit(2);

        // Apply condominium filter for recent activities
        if (shouldFilter && condominiumId) {
          recentReservationsQuery = recentReservationsQuery.eq("common_areas.condominium_id", condominiumId);
          recentMaintenanceQuery = recentMaintenanceQuery.eq("condominium_id", condominiumId);
        }

        const { data: recentReservations } = await recentReservationsQuery;
        const { data: recentMaintenance } = await recentMaintenanceQuery;

        const activities: RecentActivity[] = [];

        recentReservations?.forEach((r) => {
          activities.push({
            id: r.id,
            type: "reservation",
            title: "Nova Reserva",
            description: `Reserva ${r.status}`,
            time: formatTimeAgo(r.created_at),
          });
        });

        recentMaintenance?.forEach((m) => {
          activities.push({
            id: m.id,
            type: "maintenance",
            title: m.title,
            description: `Manutenção ${m.status}`,
            time: formatTimeAgo(m.created_at),
          });
        });

        setRecentActivity(
          activities.sort(
            (a, b) =>
              new Date(b.time).getTime() - new Date(a.time).getTime()
          ).slice(0, 5)
        );
      } catch (error) {
        console.error("[Dashboard] Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [condominiumId, shouldFilter, organizationId, shouldFilterOrg]);

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Agora";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Há ${diffMins}min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${diffDays}d`;
  };

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "reservation":
        return <Calendar className="h-4 w-4 text-info" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-warning" />;
      case "package":
        return <Package className="h-4 w-4 text-success" />;
      default:
        return <Users className="h-4 w-4 text-primary" />;
    }
  };

  const quickActions = [
    {
      label: "Nova Reserva",
      icon: Calendar,
      path: "/dashboard/reservations",
      color: "text-info",
    },
    {
      label: "Ver Manutenções",
      icon: Wrench,
      path: "/dashboard/maintenance",
      color: "text-warning",
    },
    {
      label: "Pacotes",
      icon: Package,
      path: "/dashboard/packages",
      color: "text-success",
    },
    {
      label: "Moradores",
      icon: Users,
      path: "/dashboard/residents",
      color: "text-primary",
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title={condominium ? condominium.name : "Dashboard"}
          description={condominium 
            ? `Visão geral do condomínio ${condominium.name}` 
            : "Visão geral do sistema de gestão condominial"
          }
        />

        {/* Main Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCardSkeleton count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatsCard
              title="Condomínios"
              value={stats.condominiums}
              icon={Building2}
              variant="info"
              description="Cadastrados no sistema"
            />
            <StatsCard
              title="Unidades"
              value={stats.units}
              icon={Home}
              variant="success"
              description="Total de apartamentos"
            />
            <StatsCard
              title="Moradores"
              value={stats.residents}
              icon={Users}
              variant="primary"
              description="Residentes ativos"
            />
            <StatsCard
              title="Veículos"
              value={stats.vehicles}
              icon={Car}
              variant="warning"
              description="Registrados"
            />
          </div>
        )}

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {isLoadingCharges ? (
            <StatsCardSkeleton count={4} />
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total em Atraso</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    R$ {totalOverdue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overdueUnits} unidade(s) inadimplente(s)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {totalPending.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando pagamento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    R$ {totalPaid.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pagamentos confirmados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Lançado</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {(totalOverdue + totalPending + totalPaid).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Soma de todos os lançamentos
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Secondary Stats & Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Mini Stats */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Status Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-info" />
                  <span className="text-sm">Reservas Pendentes</span>
                </div>
                <Badge variant={stats.pendingReservations > 0 ? "warning" : "secondary"}>
                  {stats.pendingReservations}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-warning" />
                  <span className="text-sm">Manutenções Abertas</span>
                </div>
                <Badge variant={stats.openMaintenance > 0 ? "destructive" : "secondary"}>
                  {stats.openMaintenance}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-success" />
                  <span className="text-sm">Pacotes Aguardando</span>
                </div>
                <Badge variant={stats.pendingPackages > 0 ? "info" : "secondary"}>
                  {stats.pendingPackages}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma atividade recente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 rounded-lg bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Overdue Charges Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unidades Inadimplentes
            </CardTitle>
            <CardDescription>
              Lista de unidades com pagamentos em atraso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOverdue ? (
              <TableSkeleton columns={6} rows={3} />
            ) : filteredOverdueCharges && filteredOverdueCharges.length > 0 ? (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Dias em Atraso</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOverdueCharges.slice(0, 5).map((charge) => {
                        const daysOverdue = getDaysOverdue(charge.due_date);
                        return (
                          <TableRow key={charge.id}>
                            <TableCell className="font-medium">
                              {charge.units?.block && `${charge.units.block} - `}
                              Unidade {charge.units?.unit_number}
                            </TableCell>
                            <TableCell>
                              {charge.charge_type === "taxa_condominio" && "Taxa de Condomínio"}
                              {charge.charge_type === "taxa_extra" && "Taxa Extra"}
                              {charge.charge_type === "multa" && "Multa"}
                              {charge.charge_type === "outros" && "Outros"}
                            </TableCell>
                            <TableCell>R$ {charge.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {format(new Date(charge.due_date), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <span className={getUrgencyColor(daysOverdue)}>
                                {daysOverdue} dias
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">Atrasado</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3">
                    {filteredOverdueCharges.slice(0, 5).map((charge) => {
                      const daysOverdue = getDaysOverdue(charge.due_date);
                      const getChargeTypeLabel = (type: string) => {
                        const labels: Record<string, string> = {
                          taxa_condominio: "Taxa de Condomínio",
                          taxa_extra: "Taxa Extra",
                          multa: "Multa",
                          outros: "Outros",
                        };
                        return labels[type] || type;
                      };
                      return (
                        <MobileDataCard key={charge.id}>
                          <MobileDataHeader
                            avatar={
                              <div className="p-2 rounded-lg bg-destructive/10">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              </div>
                            }
                            title={`${charge.units?.block ? `${charge.units.block} - ` : ""}Unidade ${charge.units?.unit_number}`}
                            subtitle={getChargeTypeLabel(charge.charge_type)}
                            badge={<Badge variant="destructive">Atrasado</Badge>}
                          />
                          <MobileDataRow label="Valor" value={`R$ ${charge.amount.toFixed(2)}`} />
                          <MobileDataRow 
                            label="Vencimento" 
                            value={format(new Date(charge.due_date), "dd/MM/yyyy", { locale: ptBR })} 
                          />
                          <MobileDataRow 
                            label="Dias em Atraso" 
                            value={<span className={getUrgencyColor(daysOverdue)}>{daysOverdue} dias</span>} 
                          />
                        </MobileDataCard>
                      );
                    })}
                  </div>
                }
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-green-500 font-medium">✓ Não há inadimplências no momento</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Todos os pagamentos estão em dia
                </p>
              </div>
            )}
            {filteredOverdueCharges && filteredOverdueCharges.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/financial")}>
                  Ver todas ({overdueCharges.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((action) => (
                <Button
                  key={action.path}
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4 hover:bg-muted/50"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
