import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, MessageSquare, Users, CheckCircle2, Crown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const OwnerAIUsage = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["owner-ai-usage"],
    queryFn: async () => {
      const [conversationsResult, messagesResult] = await Promise.all([
        supabase.from("ai_conversations").select("id, user_id, created_at"),
        supabase.from("ai_messages").select("id, role, created_at"),
      ]);

      // Calculate daily stats for last 30 days
      const dailyStats: Record<string, { date: string; conversations: number; messages: number }> = {};
      
      for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, "yyyy-MM-dd");
        dailyStats[dateKey] = {
          date: format(date, "dd/MM", { locale: ptBR }),
          conversations: 0,
          messages: 0,
        };
      }

      conversationsResult.data?.forEach((conv) => {
        const dateKey = format(new Date(conv.created_at), "yyyy-MM-dd");
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].conversations++;
        }
      });

      messagesResult.data?.forEach((msg) => {
        const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].messages++;
        }
      });

      // Get unique users who used AI
      const uniqueUsers = new Set(conversationsResult.data?.map((c) => c.user_id) || []);

      return {
        totalConversations: conversationsResult.data?.length || 0,
        totalMessages: messagesResult.data?.length || 0,
        uniqueUsers: uniqueUsers.size,
        dailyStats: Object.values(dailyStats).reverse(),
        avgMessagesPerConversation: conversationsResult.data?.length 
          ? Math.round((messagesResult.data?.length || 0) / conversationsResult.data.length)
          : 0,
      };
    },
  });

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <PageHeader
            title="Uso de IA"
            description="Estatísticas de uso do assistente de IA"
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
            title="Uso de IA Global"
            description="Estatísticas de uso do assistente de IA em todo o sistema"
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Conversas"
            value={stats?.totalConversations || 0}
            icon={Bot}
            variant="primary"
          />
          <StatsCard
            title="Mensagens"
            value={stats?.totalMessages || 0}
            icon={MessageSquare}
            variant="default"
          />
          <StatsCard
            title="Usuários Únicos"
            value={stats?.uniqueUsers || 0}
            icon={Users}
            variant="success"
          />
          <StatsCard
            title="Média msg/conversa"
            value={stats?.avgMessagesPerConversation || 0}
            icon={CheckCircle2}
            variant="warning"
          />
        </div>

        {/* Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Uso nos Últimos 30 Dias</CardTitle>
            <CardDescription>Conversas e mensagens por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.dailyStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="conversations"
                  name="Conversas"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Mensagens"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerAIUsage;
