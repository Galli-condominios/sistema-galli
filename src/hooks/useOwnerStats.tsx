import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys, cacheConfig } from "@/lib/queryKeys";

export interface OwnerStats {
  totalOrganizations: number;
  totalCondominiums: number;
  totalUnits: number;
  totalUsers: number;
  totalResidents: number;
  activeUsersLast7Days: number;
  totalAIConversations: number;
  totalAIMessages: number;
  totalReservations: number;
  totalMaintenanceRequests: number;
  totalFinancialCharges: number;
  pendingCharges: number;
  overdueCharges: number;
  paidCharges: number;
  totalRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  organizationsGrowth: number;
  usersGrowth: number;
  roleDistribution: { role: string; count: number }[];
  topOrganizations: { id: string; name: string; condominiumCount: number; userCount: number }[];
  recentActivity: { type: string; count: number; date: string }[];
}

export function useOwnerStats() {
  return useQuery({
    queryKey: ["owner-stats"],
    queryFn: async (): Promise<OwnerStats> => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all counts in parallel
      const [
        orgsResult,
        condosResult,
        unitsResult,
        profilesResult,
        residentsResult,
        rolesResult,
        aiConversationsResult,
        aiMessagesResult,
        reservationsResult,
        maintenanceResult,
        chargesResult,
        activeUsersResult,
        orgMembersResult,
      ] = await Promise.all([
        supabase.from("organizations").select("id, name, created_at", { count: "exact" }),
        supabase.from("condominiums").select("id, organization_id, created_at", { count: "exact" }),
        supabase.from("units").select("id", { count: "exact" }),
        supabase.from("profiles").select("id, created_at", { count: "exact" }),
        supabase.from("residents").select("id", { count: "exact" }),
        supabase.from("user_roles").select("role"),
        supabase.from("ai_conversations").select("id", { count: "exact" }),
        supabase.from("ai_messages").select("id", { count: "exact" }),
        supabase.from("reservations").select("id", { count: "exact" }),
        supabase.from("maintenance_requests").select("id", { count: "exact" }),
        supabase.from("financial_charges").select("id, amount, status"),
        supabase.from("profiles").select("id").gte("last_seen_at", sevenDaysAgo.toISOString()),
        supabase.from("user_organization_members").select("organization_id, user_id"),
      ]);

      // Calculate role distribution
      const roleDistribution: { role: string; count: number }[] = [];
      if (rolesResult.data) {
        const roleCounts: Record<string, number> = {};
        rolesResult.data.forEach((r) => {
          roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
        });
        Object.entries(roleCounts).forEach(([role, count]) => {
          roleDistribution.push({ role, count });
        });
      }

      // Calculate financial metrics
      let totalRevenue = 0;
      let pendingRevenue = 0;
      let overdueRevenue = 0;
      let pendingCharges = 0;
      let overdueCharges = 0;
      let paidCharges = 0;

      if (chargesResult.data) {
        chargesResult.data.forEach((charge) => {
          const amount = Number(charge.amount) || 0;
          totalRevenue += amount;
          if (charge.status === "pendente") {
            pendingCharges++;
            pendingRevenue += amount;
          } else if (charge.status === "atrasado") {
            overdueCharges++;
            overdueRevenue += amount;
          } else if (charge.status === "pago") {
            paidCharges++;
          }
        });
      }

      // Calculate top organizations
      const topOrganizations: { id: string; name: string; condominiumCount: number; userCount: number }[] = [];
      if (orgsResult.data && condosResult.data && orgMembersResult.data) {
        const condoCountByOrg: Record<string, number> = {};
        const userCountByOrg: Record<string, number> = {};

        condosResult.data.forEach((c) => {
          if (c.organization_id) {
            condoCountByOrg[c.organization_id] = (condoCountByOrg[c.organization_id] || 0) + 1;
          }
        });

        orgMembersResult.data.forEach((m) => {
          userCountByOrg[m.organization_id] = (userCountByOrg[m.organization_id] || 0) + 1;
        });

        orgsResult.data.forEach((org) => {
          topOrganizations.push({
            id: org.id,
            name: org.name,
            condominiumCount: condoCountByOrg[org.id] || 0,
            userCount: userCountByOrg[org.id] || 0,
          });
        });

        topOrganizations.sort((a, b) => b.condominiumCount - a.condominiumCount);
        topOrganizations.splice(5); // Keep only top 5
      }

      // Calculate growth (compare last 30 days with previous 30 days)
      let organizationsGrowth = 0;
      let usersGrowth = 0;

      if (orgsResult.data) {
        const recentOrgs = orgsResult.data.filter(
          (o) => new Date(o.created_at) >= thirtyDaysAgo
        ).length;
        const previousOrgs = orgsResult.data.filter(
          (o) => {
            const created = new Date(o.created_at);
            return created < thirtyDaysAgo && created >= new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
          }
        ).length;
        if (previousOrgs > 0) {
          organizationsGrowth = ((recentOrgs - previousOrgs) / previousOrgs) * 100;
        } else if (recentOrgs > 0) {
          organizationsGrowth = 100;
        }
      }

      if (profilesResult.data) {
        const recentUsers = profilesResult.data.filter(
          (p) => new Date(p.created_at) >= thirtyDaysAgo
        ).length;
        const previousUsers = profilesResult.data.filter(
          (p) => {
            const created = new Date(p.created_at);
            return created < thirtyDaysAgo && created >= new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
          }
        ).length;
        if (previousUsers > 0) {
          usersGrowth = ((recentUsers - previousUsers) / previousUsers) * 100;
        } else if (recentUsers > 0) {
          usersGrowth = 100;
        }
      }

      return {
        totalOrganizations: orgsResult.count || 0,
        totalCondominiums: condosResult.count || 0,
        totalUnits: unitsResult.count || 0,
        totalUsers: profilesResult.count || 0,
        totalResidents: residentsResult.count || 0,
        activeUsersLast7Days: activeUsersResult.data?.length || 0,
        totalAIConversations: aiConversationsResult.count || 0,
        totalAIMessages: aiMessagesResult.count || 0,
        totalReservations: reservationsResult.count || 0,
        totalMaintenanceRequests: maintenanceResult.count || 0,
        totalFinancialCharges: chargesResult.data?.length || 0,
        pendingCharges,
        overdueCharges,
        paidCharges,
        totalRevenue,
        pendingRevenue,
        overdueRevenue,
        organizationsGrowth,
        usersGrowth,
        roleDistribution,
        topOrganizations,
        recentActivity: [],
      };
    },
    ...cacheConfig.dynamic,
  });
}
