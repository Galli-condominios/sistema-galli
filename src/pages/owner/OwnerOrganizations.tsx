import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Building, Calendar, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  max_condominiums: number;
  created_at: string;
  owner_id: string;
  condominiumCount?: number;
  memberCount?: number;
}

const OwnerOrganizations = () => {
  const { data: organizations, isLoading } = useQuery({
    queryKey: ["owner-organizations"],
    queryFn: async () => {
      const [orgsResult, condosResult, membersResult] = await Promise.all([
        supabase.from("organizations").select("*"),
        supabase.from("condominiums").select("id, organization_id"),
        supabase.from("user_organization_members").select("organization_id, user_id"),
      ]);

      if (orgsResult.error) throw orgsResult.error;

      const condoCountByOrg: Record<string, number> = {};
      const memberCountByOrg: Record<string, number> = {};

      condosResult.data?.forEach((c) => {
        if (c.organization_id) {
          condoCountByOrg[c.organization_id] = (condoCountByOrg[c.organization_id] || 0) + 1;
        }
      });

      membersResult.data?.forEach((m) => {
        memberCountByOrg[m.organization_id] = (memberCountByOrg[m.organization_id] || 0) + 1;
      });

      return orgsResult.data.map((org) => ({
        ...org,
        condominiumCount: condoCountByOrg[org.id] || 0,
        memberCount: memberCountByOrg[org.id] || 0,
      })) as Organization[];
    },
  });

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      free: "outline",
      basic: "secondary",
      premium: "default",
    };
    const labels: Record<string, string> = {
      free: "Gratuito",
      basic: "Básico",
      premium: "Premium",
    };
    return (
      <Badge variant={variants[plan] || "outline"}>
        {labels[plan] || plan}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Todas as Organizações"
            description="Gerencie todas as organizações do sistema"
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
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
            title="Todas as Organizações"
            description={`${organizations?.length || 0} organizações cadastradas no sistema`}
          />
        </div>

        {organizations && organizations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <CardDescription>@{org.slug}</CardDescription>
                      </div>
                    </div>
                    {getPlanBadge(org.plan)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span>{org.condominiumCount} / {org.max_condominiums} condomínios</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{org.memberCount} membros</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Criada em {format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma organização cadastrada</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerOrganizations;
