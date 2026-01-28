import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, MessageSquare, CheckCircle, HelpCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UsageStats {
  totalQuestions: number;
  resolvedCount: number;
  unresolvedCount: number;
  pendingCount: number;
  resolutionRate: number;
  topCategories: { category: string; count: number }[];
  recentQuestions: { question: string; category: string | null; was_resolved: boolean | null; created_at: string }[];
  dailyStats: { date: string; count: number }[];
}

export function AIUsageStats() {
  const { data: stats, isLoading } = useQuery<UsageStats>({
    queryKey: ["ai-usage-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get all stats from last 30 days
      const { data: usageData, error } = await supabase
        .from("ai_usage_stats")
        .select("question, question_category, was_resolved, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const data = usageData || [];
      const totalQuestions = data.length;
      const resolvedCount = data.filter(d => d.was_resolved === true).length;
      const unresolvedCount = data.filter(d => d.was_resolved === false).length;
      const pendingCount = data.filter(d => d.was_resolved === null).length;
      const resolutionRate = totalQuestions > 0 
        ? Math.round((resolvedCount / (resolvedCount + unresolvedCount || 1)) * 100) 
        : 0;

      // Group by category
      const categoryMap = new Map<string, number>();
      data.forEach(d => {
        const cat = d.question_category || "Outros";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily stats for last 7 days
      const dailyMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        dailyMap.set(date, 0);
      }
      data.forEach(d => {
        const date = format(new Date(d.created_at), "yyyy-MM-dd");
        if (dailyMap.has(date)) {
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        }
      });
      const dailyStats = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }));

      // Recent questions (last 10)
      const recentQuestions = data.slice(0, 10).map(d => ({
        question: d.question,
        category: d.question_category,
        was_resolved: d.was_resolved,
        created_at: d.created_at
      }));

      return {
        totalQuestions,
        resolvedCount,
        unresolvedCount,
        pendingCount,
        resolutionRate,
        topCategories,
        recentQuestions,
        dailyStats
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const maxDaily = Math.max(...(stats?.dailyStats.map(d => d.count) || [1]));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalQuestions || 0}</p>
                <p className="text-xs text-muted-foreground">Perguntas (30 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.resolvedCount || 0}</p>
                <p className="text-xs text-muted-foreground">Resolvidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <HelpCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.unresolvedCount || 0}</p>
                <p className="text-xs text-muted-foreground">Não resolvidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.resolutionRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Taxa de resolução</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Perguntas por Dia
            </CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {stats?.dailyStats.map((day, i) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <span className="text-xs font-medium mb-1">{day.count}</span>
                    <div 
                      className="w-full bg-primary/80 rounded-t transition-all"
                      style={{ 
                        height: `${maxDaily > 0 ? (day.count / maxDaily) * 80 : 0}px`,
                        minHeight: day.count > 0 ? '4px' : '0px'
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(day.date), "EEE", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Categorias Mais Frequentes
            </CardTitle>
            <CardDescription>Top 5 categorias de perguntas</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma estatística ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.topCategories.map((cat, i) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{cat.category}</span>
                      <span className="font-medium">{cat.count}</span>
                    </div>
                    <Progress 
                      value={(cat.count / (stats.totalQuestions || 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Questions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Perguntas Recentes
          </CardTitle>
          <CardDescription>Últimas perguntas feitas pelos moradores</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma pergunta registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.recentQuestions.map((q, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {q.category && (
                        <Badge variant="outline" className="text-xs">
                          {q.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(q.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {q.was_resolved === true && (
                      <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                        Resolvida
                      </Badge>
                    )}
                    {q.was_resolved === false && (
                      <Badge variant="default" className="bg-red-500/20 text-red-600 border-red-500/30">
                        Não resolvida
                      </Badge>
                    )}
                    {q.was_resolved === null && (
                      <Badge variant="secondary">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
