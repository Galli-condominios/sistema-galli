import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, LogIn, LogOut, UserCheck, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface AccessLog {
  id: string;
  visitor_name: string;
  visitor_type: string;
  entry_time: string;
  exit_time: string | null;
  unit_id: string | null;
  units?: {
    unit_number: string;
  };
}

const DoorkeeperDashboard = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeVisitors: 0,
    todayEntries: 0,
    todayExits: 0,
  });
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's access logs
      const { data: logs, error: logsError } = await supabase
        .from("access_logs")
        .select(`
          id,
          visitor_name,
          visitor_type,
          entry_time,
          exit_time,
          unit_id,
          units (
            unit_number
          )
        `)
        .gte("entry_time", today.toISOString())
        .order("entry_time", { ascending: false });

      if (logsError) throw logsError;

      if (logs) {
        setAccessLogs(logs);

        // Calculate stats
        const activeVisitors = logs.filter(log => !log.exit_time).length;
        const todayEntries = logs.length;
        const todayExits = logs.filter(log => log.exit_time).length;

        setStats({
          activeVisitors,
          todayEntries,
          todayExits,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExit = async (logId: string) => {
    try {
      const { error } = await supabase
        .from("access_logs")
        .update({ exit_time: new Date().toISOString() })
        .eq("id", logId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Saída registrada com sucesso",
      });

      fetchData();
    } catch (error) {
      console.error("Error registering exit:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a saída",
        variant: "destructive",
      });
    }
  };

  const getVisitorTypeBadge = (type: string) => {
    return type === "visitante" ? "default" : "secondary";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando painel do porteiro..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Painel do Porteiro</h2>
          <p className="text-muted-foreground">Controle de acesso e visitantes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visitantes Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeVisitors}</div>
              <p className="text-xs text-muted-foreground">no condomínio agora</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas Hoje</CardTitle>
              <LogIn className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayEntries}</div>
              <p className="text-xs text-muted-foreground">registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas Hoje</CardTitle>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayExits}</div>
              <p className="text-xs text-muted-foreground">registradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Access Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Acessos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accessLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum acesso registrado hoje.</p>
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitante</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => {
                        const unit = log.units as any;
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.visitor_name}</TableCell>
                            <TableCell>
                              <Badge variant={getVisitorTypeBadge(log.visitor_type)}>
                                {log.visitor_type === "visitante" ? "Visitante" : "Prestador"}
                              </Badge>
                            </TableCell>
                            <TableCell>{unit?.unit_number || "-"}</TableCell>
                            <TableCell>{format(new Date(log.entry_time), "HH:mm")}</TableCell>
                            <TableCell>
                              {log.exit_time ? (
                                format(new Date(log.exit_time), "HH:mm")
                              ) : (
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  No local
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!log.exit_time && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExit(log.id)}
                                >
                                  Registrar Saída
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3">
                    {accessLogs.map((log) => {
                      const unit = log.units as any;
                      return (
                        <MobileDataCard key={log.id}>
                          <MobileDataHeader
                            avatar={
                              <div className="p-2 rounded-lg bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            }
                            title={log.visitor_name}
                            subtitle={unit?.unit_number ? `Unidade ${unit.unit_number}` : "Sem unidade"}
                            badge={
                              <Badge variant={getVisitorTypeBadge(log.visitor_type)}>
                                {log.visitor_type === "visitante" ? "Visitante" : "Prestador"}
                              </Badge>
                            }
                          />
                          <MobileDataRow 
                            label="Entrada" 
                            value={format(new Date(log.entry_time), "HH:mm", { locale: ptBR })} 
                          />
                          <MobileDataRow 
                            label="Saída" 
                            value={log.exit_time 
                              ? format(new Date(log.exit_time), "HH:mm", { locale: ptBR })
                              : <Badge variant="outline" className="bg-primary/10 text-primary">No local</Badge>
                            } 
                          />
                          {!log.exit_time && (
                            <MobileDataActions>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExit(log.id)}
                                className="flex-1"
                              >
                                <LogOut className="h-4 w-4 mr-1" />
                                Registrar Saída
                              </Button>
                            </MobileDataActions>
                          )}
                        </MobileDataCard>
                      );
                    })}
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DoorkeeperDashboard;
