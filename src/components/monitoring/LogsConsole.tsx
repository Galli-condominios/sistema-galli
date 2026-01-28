import { useState } from "react";
import { Search, Trash2, RefreshCw, CheckCircle, Filter, X, Terminal, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemLog, LogLevel, TimePeriod } from "@/hooks/useSystemLogs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatTime = (timestamp: string) => {
  return format(new Date(timestamp), "HH:mm", { locale: ptBR });
};

interface LogsConsoleProps {
  logs: SystemLog[];
  isLoading: boolean;
  selectedLog: SystemLog | null;
  onSelectLog: (log: SystemLog) => void;
  onRefresh: () => void;
  onClearResolved: () => void;
  onResolveLog: (logId: string) => void;
  onFilterChange: (filters: { level?: LogLevel; service?: string; search?: string; period?: TimePeriod }) => void;
  filters: { level?: LogLevel; service?: string; search?: string; period?: TimePeriod };
}

const levelConfig: Record<LogLevel, { badge: string; dot: string; row: string; label: string }> = {
  DEBUG: {
    badge: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    dot: "bg-slate-400",
    row: "",
    label: "DEBUG",
  },
  INFO: {
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    dot: "bg-blue-400",
    row: "",
    label: "INFO",
  },
  WARN: {
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    dot: "bg-amber-400",
    row: "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]",
    label: "WARN",
  },
  ERROR: {
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
    dot: "bg-red-400",
    row: "bg-red-500/[0.03] hover:bg-red-500/[0.06]",
    label: "ERROR",
  },
  CRITICAL: {
    badge: "bg-red-600/20 text-red-600 border-red-600/30 font-semibold",
    dot: "bg-red-500 animate-pulse",
    row: "bg-red-500/[0.05] hover:bg-red-500/[0.08]",
    label: "CRITICAL",
  },
};

const services = ["all", "auth", "api", "edge-function", "database", "frontend"];

export function LogsConsole({
  logs,
  isLoading,
  selectedLog,
  onSelectLog,
  onRefresh,
  onClearResolved,
  onResolveLog,
  onFilterChange,
  filters,
}: LogsConsoleProps) {
  const [searchInput, setSearchInput] = useState(filters.search || "");

  const handleSearch = () => {
    onFilterChange({ ...filters, search: searchInput || undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearFilters = () => {
    setSearchInput("");
    onFilterChange({ period: "24h" });
  };

  const hasActiveFilters = filters.level || filters.service || filters.search;

  return (
    <Card className="border-border/50 flex flex-col h-[calc(100vh-380px)] sm:h-[calc(100vh-340px)] min-h-[350px] sm:min-h-[450px] overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3 flex-shrink-0 px-3 sm:px-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/10">
              <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base">Console de Eventos</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {logs.length} eventos • Atualização em tempo real
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={onClearResolved} className="h-7 sm:h-8 px-2 sm:px-3 text-xs">
              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
          </div>
        </div>

        {/* Filters - incident.io compact style */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[180px] sm:max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-8 h-7 sm:h-8 text-xs bg-background/50"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Select
              value={filters.level || "all"}
              onValueChange={(v) => onFilterChange({ ...filters, level: v === "all" ? undefined : v as LogLevel })}
            >
              <SelectTrigger className="w-[85px] sm:w-[100px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warn</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.service || "all"}
              onValueChange={(v) => onFilterChange({ ...filters, service: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[95px] sm:w-[120px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="Serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "Todos" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.period || "24h"}
              onValueChange={(v) => onFilterChange({ ...filters, period: v as TimePeriod })}
            >
              <SelectTrigger className="w-[80px] sm:w-[95px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 sm:h-8 px-2">
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="bg-slate-950 dark:bg-slate-950/80 min-h-full">
            {isLoading ? (
              <div className="p-3 space-y-1.5">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-slate-800/50" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-slate-400 px-4">
                <Filter className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhum evento encontrado</p>
                <p className="text-xs text-slate-500 text-center mt-1">
                  Ajuste os filtros ou aguarde novos eventos
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: Timeline Card View */}
                <div className="sm:hidden divide-y divide-slate-800/50">
                  {logs.map((log) => {
                    const config = levelConfig[log.level];
                    const isSelected = selectedLog?.id === log.id;

                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "p-3 cursor-pointer transition-all",
                          config.row || "hover:bg-slate-800/30",
                          isSelected && "ring-1 ring-primary ring-inset bg-primary/5",
                          log.resolved && "opacity-40"
                        )}
                        onClick={() => onSelectLog(log)}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center pt-1">
                            <Circle className={cn("h-2 w-2 fill-current", config.dot.replace("bg-", "text-"))} />
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <Badge className={cn("font-mono text-[9px] py-0 h-4", config.badge)}>
                                {config.label}
                              </Badge>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {formatTime(log.timestamp)}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {log.function_name || log.service}
                            </p>
                            <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                              {log.message}
                            </p>
                            
                            <div className="flex items-center justify-between pt-1">
                              {log.resolved ? (
                                <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[9px] py-0 h-4">
                                  Resolvido
                                </Badge>
                              ) : (log.level === "ERROR" || log.level === "CRITICAL") ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-slate-400 hover:text-emerald-400 text-[10px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onResolveLog(log.id);
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolver
                                </Button>
                              ) : <span />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Table View */}
                <Table className="hidden sm:table">
                  <TableHeader className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <TableRow className="border-slate-800 hover:bg-slate-900">
                      <TableHead className="text-slate-400 w-[140px] text-xs">Tempo</TableHead>
                      <TableHead className="text-slate-400 w-[80px] text-xs">Nível</TableHead>
                      <TableHead className="text-slate-400 w-[120px] text-xs">Serviço</TableHead>
                      <TableHead className="text-slate-400 text-xs">Mensagem</TableHead>
                      <TableHead className="text-slate-400 w-[70px] text-xs">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const config = levelConfig[log.level];
                      const isSelected = selectedLog?.id === log.id;

                      return (
                        <TableRow
                          key={log.id}
                          className={cn(
                            "border-slate-800/50 cursor-pointer transition-all",
                            config.row || "hover:bg-slate-800/30",
                            isSelected && "ring-1 ring-primary ring-inset bg-primary/5",
                            log.resolved && "opacity-40"
                          )}
                          onClick={() => onSelectLog(log)}
                        >
                          <TableCell className="font-mono text-[11px] text-slate-400">
                            {formatTime(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Circle className={cn("h-1.5 w-1.5 fill-current shrink-0", config.dot.replace("bg-", "text-"))} />
                              <Badge className={cn("font-mono text-[10px] py-0 h-5", config.badge)}>
                                {config.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-300">
                            {log.function_name || log.service}
                          </TableCell>
                          <TableCell className="max-w-[350px] truncate text-slate-200 text-xs">
                            {log.message}
                          </TableCell>
                          <TableCell>
                            {!log.resolved && (log.level === "ERROR" || log.level === "CRITICAL") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResolveLog(log.id);
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {log.resolved && (
                              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-[10px] py-0">
                                ✓
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
