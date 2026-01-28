import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Crown, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWithRole {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_seen_at: string | null;
  role: string;
  organizations: string[];
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  administrador: "Administrador",
  sindico: "Síndico",
  porteiro: "Porteiro",
  morador: "Morador",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-yellow-500",
  administrador: "bg-blue-500",
  sindico: "bg-purple-500",
  porteiro: "bg-green-500",
  morador: "bg-gray-500",
};

const OwnerUsers = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["owner-users"],
    queryFn: async () => {
      const [profilesResult, rolesResult, orgMembersResult, orgsResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, created_at, last_seen_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_organization_members").select("user_id, organization_id"),
        supabase.from("organizations").select("id, name"),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const rolesByUser: Record<string, string> = {};
      rolesResult.data?.forEach((r) => {
        rolesByUser[r.user_id] = r.role;
      });

      const orgsByUser: Record<string, string[]> = {};
      const orgNamesById: Record<string, string> = {};
      
      orgsResult.data?.forEach((o) => {
        orgNamesById[o.id] = o.name;
      });

      orgMembersResult.data?.forEach((m) => {
        if (!orgsByUser[m.user_id]) {
          orgsByUser[m.user_id] = [];
        }
        const orgName = orgNamesById[m.organization_id];
        if (orgName && !orgsByUser[m.user_id].includes(orgName)) {
          orgsByUser[m.user_id].push(orgName);
        }
      });

      return profilesResult.data.map((profile) => ({
        ...profile,
        role: rolesByUser[profile.id] || "morador",
        organizations: orgsByUser[profile.id] || [],
      })) as UserWithRole[];
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.organizations.some((o) => o.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Todos os Usuários"
            description="Visualize todos os usuários do sistema"
          />
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
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
            title="Todos os Usuários"
            description={`${users?.length || 0} usuários cadastrados no sistema`}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou organização..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="sindico">Síndico</SelectItem>
                  <SelectItem value="porteiro">Porteiro</SelectItem>
                  <SelectItem value="morador">Morador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        {filteredUsers.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Organizações</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                          <AvatarFallback>
                            {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || "Sem nome"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
                        <span className={`h-2 w-2 rounded-full ${ROLE_COLORS[user.role] || "bg-gray-500"}`} />
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.organizations.length > 0 ? (
                          user.organizations.map((org, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {org}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.last_seen_at
                          ? formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true, locale: ptBR })
                          : "Nunca"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerUsers;
