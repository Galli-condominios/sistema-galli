import { useMemo } from "react";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerStats } from "@/hooks/useOwnerStats";
import {
  Building2,
  Building,
  DoorClosed,
  Users,
  UserCheck,
  Bot,
  DollarSign,
  Calendar,
  Wrench,
  Crown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const ROLE_COLORS: Record<string, string> = {
  owner: "hsl(var(--chart-5))",
  administrador: "hsl(var(--chart-1))",
  sindico: "hsl(var(--chart-2))",
  porteiro: "hsl(var(--chart-3))",
  morador: "hsl(var(--chart-4))",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  administrador: "Administrador",
  sindico: "Síndico",
  porteiro: "Porteiro",
  morador: "Morador",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const OwnerDashboard = () => {
  const { data: stats, isLoading } = useOwnerStats();

  const pieData = useMemo(() => {
    if (!stats?.roleDistribution) return [];
    return stats.roleDistribution.map((item) => ({
      name: ROLE_LABELS[item.role] || item.role,
      value: item.count,
      fill: ROLE_COLORS[item.role] || "hsl(var(--muted))",
    }));
  }, [stats?.roleDistribution]);

  const barData = useMemo(() => {
    if (!stats?.topOrganizations) return [];
    return stats.topOrganizations.map((org) => ({
      name: org.name.length > 15 ? org.name.substring(0, 15) + "..." : org.name,
      condominios: org.condominiumCount,
      usuarios: org.userCount,
    }));
  }, [stats?.topOrganizations]);

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
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
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel do Owner</h1>
            <p className="text-muted-foreground">Visão global de todo o sistema Galli</p>
          </div>
          <Badge variant="outline" className="ml-auto border-yellow-500 text-yellow-600">
            Super Admin
          </Badge>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Organizações"
            value={stats?.totalOrganizations || 0}
            icon={Building2}
            variant="primary"
            trend={
              stats?.organizationsGrowth
                ? {
                    value: Math.abs(stats.organizationsGrowth),
                    isPositive: stats.organizationsGrowth > 0,
                  }
                : undefined
            }
          />
          <StatsCard
            title="Condomínios"
            value={stats?.totalCondominiums || 0}
            icon={Building}
            variant="default"
          />
          <StatsCard
            title="Unidades"
            value={stats?.totalUnits || 0}
            icon={DoorClosed}
            variant="warning"
          />
          <StatsCard
            title="Usuários"
            value={stats?.totalUsers || 0}
            icon={Users}
            variant="success"
            trend={
              stats?.usersGrowth
                ? {
                    value: Math.abs(stats.usersGrowth),
                    isPositive: stats.usersGrowth > 0,
                  }
                : undefined
            }
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Usuários Ativos (7d)"
            value={stats?.activeUsersLast7Days || 0}
            icon={UserCheck}
            description="Últimos 7 dias"
          />
          <StatsCard
            title="Conversas IA"
            value={stats?.totalAIConversations || 0}
            icon={Bot}
            description={`${stats?.totalAIMessages || 0} mensagens`}
          />
          <StatsCard
            title="Reservas"
            value={stats?.totalReservations || 0}
            icon={Calendar}
          />
          <StatsCard
            title="Ocorrências"
            value={stats?.totalMaintenanceRequests || 0}
            icon={Wrench}
          />
        </div>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Visão Financeira Global
            </CardTitle>
            <CardDescription>
              Resumo de todas as cobranças do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total de Cobranças</p>
                <p className="text-2xl font-bold">{stats?.totalFinancialCharges || 0}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <p className="text-sm text-green-600">Pagas</p>
                <p className="text-2xl font-bold text-green-600">{stats?.paidCharges || 0}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                <p className="text-sm text-yellow-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendingCharges || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(stats?.pendingRevenue || 0)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <p className="text-sm text-red-600">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{stats?.overdueCharges || 0}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(stats?.overdueRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Perfil</CardTitle>
              <CardDescription>Quantidade de usuários por tipo de perfil</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Organizations */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Organizações</CardTitle>
              <CardDescription>Por número de condomínios e usuários</CardDescription>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="condominios" name="Condomínios" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="usuarios" name="Usuários" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhuma organização cadastrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>Organizações Cadastradas</CardTitle>
            <CardDescription>Lista completa de todas as organizações do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topOrganizations && stats.topOrganizations.length > 0 ? (
              <div className="space-y-2">
                {stats.topOrganizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {org.condominiumCount} condomínios
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {org.userCount} usuários
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma organização cadastrada ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerDashboard;
