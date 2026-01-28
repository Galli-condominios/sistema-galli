import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import TableSkeleton from "@/components/TableSkeleton";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFinancialCharges } from "@/hooks/useFinancialCharges";
import { useCondominiumExpenses, type ExpenseApportionment } from "@/hooks/useCondominiumExpenses";
import { useUnits } from "@/hooks/useUnits";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataHeader, MobileDataRow, MobileDataActions } from "@/components/MobileDataCard";
import { Plus, CalendarIcon, Pencil, Trash2, DollarSign, Clock, CheckCircle, AlertTriangle, Receipt, Home, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Calculator, MapPin, Zap, Loader2, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const EXPENSE_CATEGORIES = [
  { value: "obras", label: "Obras" },
  { value: "manutencao", label: "Manutenção" },
  { value: "limpeza", label: "Limpeza" },
  { value: "seguranca", label: "Segurança" },
  { value: "higiene", label: "Higiene" },
  { value: "conservacao", label: "Conservação" },
  { value: "administrativo", label: "Administrativo" },
  { value: "outros", label: "Outros" },
];

export default function FinancialManagement() {
  const [activeTab, setActiveTab] = useState("charges");

  // Charges state
  const { charges, isLoading, createCharge, updateCharge, deleteCharge, refetch: refetchCharges } = useFinancialCharges();
  const { units } = useUnits();
  const { userId } = useUserRoleContext();
  const { condominiumId, condominium } = useCondominiumFilter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chargeToDelete, setChargeToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isProcessingCharges, setIsProcessingCharges] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({ day: 1, hour: 2, minute: 0 });
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const { toast } = useToast();

  // Expenses state
  const {
    expenses,
    isLoading: expensesLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    calculateApportionment,
    getApportionments,
    generateChargesFromApportionments,
  } = useCondominiumExpenses();
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isApportionmentDialogOpen, setIsApportionmentDialogOpen] = useState(false);
  const [isExpenseDeleteDialogOpen, setIsExpenseDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [apportionments, setApportionments] = useState<ExpenseApportionment[]>([]);
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    unit_id: "",
    charge_type: "taxa_condominio",
    amount: "",
    due_date: new Date(),
    description: "",
    status: "pendente",
  });

  const [expenseFormData, setExpenseFormData] = useState({
    expense_month: new Date().getMonth() + 1,
    expense_year: new Date().getFullYear(),
    category: "",
    description: "",
    total_amount: 0,
    invoice_number: "",
    supplier_name: "",
  });

  const resetForm = () => {
    setFormData({
      unit_id: "",
      charge_type: "taxa_condominio",
      amount: "",
      due_date: new Date(),
      description: "",
      status: "pendente",
    });
    setEditingCharge(null);
  };

  const resetExpenseForm = () => {
    setIsExpenseDialogOpen(false);
    setSelectedExpense(null);
    setExpenseFormData({
      expense_month: new Date().getMonth() + 1,
      expense_year: new Date().getFullYear(),
      category: "",
      description: "",
      total_amount: 0,
      invoice_number: "",
      supplier_name: "",
    });
  };

  // Charge handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const unit = units?.find(u => u.id === formData.unit_id);
    if (!unit) return;

    const chargeData = {
      ...formData,
      amount: parseFloat(formData.amount),
      due_date: format(formData.due_date, "yyyy-MM-dd"),
      condominium_id: unit.condominium_id,
      created_by: editingCharge ? editingCharge.created_by : userId,
      payment_date: null,
      payment_method: null,
      payment_reference: null,
    };

    if (editingCharge) {
      await updateCharge.mutateAsync({ id: editingCharge.id, ...chargeData });
    } else {
      await createCharge.mutateAsync(chargeData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (charge: any) => {
    setEditingCharge(charge);
    setFormData({
      unit_id: charge.unit_id,
      charge_type: charge.charge_type,
      amount: charge.amount.toString(),
      due_date: new Date(charge.due_date),
      description: charge.description || "",
      status: charge.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setChargeToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (chargeToDelete) {
      await deleteCharge.mutateAsync(chargeToDelete);
      setChargeToDelete(null);
    }
  };

  // Expense handlers
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominiumId) return;

    const data = {
      ...expenseFormData,
      condominium_id: condominiumId,
    };

    if (selectedExpense) {
      await updateExpense.mutateAsync({ id: selectedExpense.id, ...data });
    } else {
      await createExpense.mutateAsync(data);
    }

    resetExpenseForm();
  };

  const handleExpenseEdit = (expense: any) => {
    setSelectedExpense(expense);
    setExpenseFormData({
      expense_month: expense.expense_month,
      expense_year: expense.expense_year,
      category: expense.category,
      description: expense.description,
      total_amount: expense.total_amount,
      invoice_number: expense.invoice_number || "",
      supplier_name: expense.supplier_name || "",
    });
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseDelete = (expense: any) => {
    setSelectedExpense(expense);
    setIsExpenseDeleteDialogOpen(true);
  };

  const confirmExpenseDelete = async () => {
    if (selectedExpense) {
      await deleteExpense.mutateAsync(selectedExpense.id);
      setIsExpenseDeleteDialogOpen(false);
      setSelectedExpense(null);
    }
  };

  const handleCalculateApportionment = async (expense: any) => {
    await calculateApportionment.mutateAsync(expense.id);
  };

  const handleViewApportionments = async (expense: any) => {
    setSelectedExpense(expense);
    const data = await getApportionments(expense.id);
    setApportionments(data);
    setIsApportionmentDialogOpen(true);
  };

  const handleGenerateCharges = async () => {
    if (selectedExpense) {
      await generateChargesFromApportionments.mutateAsync(selectedExpense.id);
      setIsApportionmentDialogOpen(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleProcessMonthlyCharges = async () => {
    if (!condominiumId) {
      toast({ title: "Selecione um condomínio primeiro", variant: "destructive" });
      return;
    }

    setIsProcessingCharges(true);
    try {
      const now = new Date();
      const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const { data, error } = await supabase.functions.invoke('process-monthly-charges', {
        body: {
          condominium_id: condominiumId,
          month: targetMonth,
          year: targetYear,
        },
      });

      if (error) throw error;

      toast({
        title: "Processamento concluído",
        description: data?.message || `${data?.results?.charges_created || 0} cobranças geradas`,
      });

      // Refresh the charges list
      refetchCharges();
    } catch (error) {
      console.error('Error processing charges:', error);
      toast({
        title: "Erro ao processar cobranças",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCharges(false);
    }
  };

  const loadScheduleConfig = async () => {
    setIsLoadingSchedule(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-cron-schedule', {
        body: { action: 'get' },
      });

      if (error) throw error;
      if (data?.schedule) {
        setScheduleConfig(data.schedule);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const saveScheduleConfig = async () => {
    setIsSavingSchedule(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-cron-schedule', {
        body: {
          action: 'update',
          day: scheduleConfig.day,
          hour: scheduleConfig.hour,
          minute: scheduleConfig.minute,
        },
      });

      if (error) throw error;

      toast({
        title: "Agendamento salvo",
        description: data?.message || "Configuração atualizada com sucesso",
      });
      setIsScheduleDialogOpen(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Erro ao salvar agendamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const openScheduleDialog = () => {
    loadScheduleConfig();
    setIsScheduleDialogOpen(true);
  };


  const chargeStats = useMemo(() => {
    if (!charges) return { total: 0, pending: 0, paid: 0, overdue: 0, totalAmount: 0, overdueAmount: 0 };
    const pending = charges.filter((c) => c.status === "pendente");
    const paid = charges.filter((c) => c.status === "pago");
    const overdue = charges.filter((c) => c.status === "atrasado");
    return {
      total: charges.length,
      pending: pending.length,
      paid: paid.length,
      overdue: overdue.length,
      totalAmount: charges.reduce((acc, c) => acc + c.amount, 0),
      overdueAmount: overdue.reduce((acc, c) => acc + c.amount, 0),
    };
  }, [charges]);

  const expenseStats = useMemo(() => {
    if (!expenses) return { total: 0, totalAmount: 0, apportioned: 0, pending: 0 };
    return {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.total_amount, 0),
      apportioned: expenses.filter((e) => e.is_apportioned).length,
      pending: expenses.filter((e) => !e.is_apportioned).length,
    };
  }, [expenses]);

  // Filtered charges
  const filteredCharges = useMemo(() => {
    if (!charges) return [];
    return charges.filter((charge) => {
      const matchesSearch =
        charge.units?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        charge.units?.block?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        charge.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || charge.status === filterStatus;
      const matchesType = filterType === "all" || charge.charge_type === filterType;
      const matchesUnit = filterUnit === "all" || charge.unit_id === filterUnit;
      const matchesMonth = filterMonth === "all" || format(new Date(charge.due_date), "yyyy-MM") === filterMonth;
      return matchesSearch && matchesStatus && matchesType && matchesUnit && matchesMonth;
    });
  }, [charges, searchTerm, filterStatus, filterType, filterUnit, filterMonth]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((expense) => {
      const matchesSearch =
        expense.description.toLowerCase().includes(expenseSearchTerm.toLowerCase()) ||
        expense.supplier_name?.toLowerCase().includes(expenseSearchTerm.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || expense.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, expenseSearchTerm, filterCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredCharges.length / itemsPerPage);
  const paginatedCharges = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCharges.slice(start, start + itemsPerPage);
  }, [filteredCharges, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType, filterUnit, filterMonth]);

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  const exportToCSV = () => {
    if (filteredCharges.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Unidade", "Bloco", "Tipo", "Valor", "Vencimento", "Status", "Descrição"];
    const rows = filteredCharges.map((charge) => [
      charge.units?.unit_number || "",
      charge.units?.block || "",
      getChargeTypeLabel(charge.charge_type),
      charge.amount.toFixed(2),
      format(new Date(charge.due_date), "dd/MM/yyyy"),
      charge.status,
      charge.description || "",
    ]);

    const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado com sucesso!" });
  };

  const exportToPDF = () => {
    if (filteredCharges.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "warning" | "success" | "destructive"; label: string }> = {
      pendente: { variant: "warning", label: "Pendente" },
      pago: { variant: "success", label: "Pago" },
      atrasado: { variant: "destructive", label: "Atrasado" },
    };
    const config = variants[status] || variants.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getChargeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      taxa_condominio: "Taxa de Condomínio",
      taxa_extra: "Taxa Extra",
      multa: "Multa",
      outros: "Outros",
    };
    return labels[type] || type;
  };

  const getChargeTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "info" | "gold" | "muted"> = {
      taxa_condominio: "default",
      taxa_extra: "info",
      multa: "gold",
      outros: "muted",
    };
    return <Badge variant={variants[type] || "default"}>{getChargeTypeLabel(type)}</Badge>;
  };

  const getMonthName = (month: number) => {
    return format(new Date(2024, month - 1), "MMMM", { locale: ptBR });
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getCategoryBadgeVariant = (category: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      obras: "default",
      manutencao: "secondary",
      limpeza: "outline",
      seguranca: "destructive",
    };
    return variants[category] || "outline";
  };

  const totalCount = chargeStats.total + expenseStats.total;

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando gestão financeira..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Gestão Financeira"
          description="Gerencie cobranças e despesas do condomínio"
          count={totalCount}
          countLabel="registros"
          actions={
            <div className="flex flex-wrap gap-2">
              {activeTab === "charges" && (
                <Button variant="outline" size="icon" onClick={openScheduleDialog} title="Configurar agendamento">
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              {activeTab === "charges" && condominiumId && (
                <Button variant="outline" onClick={handleProcessMonthlyCharges} disabled={isProcessingCharges} className="text-sm">
                  {isProcessingCharges ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Gerar Boletos</span>
                  <span className="sm:hidden">Boletos</span>
                </Button>
              )}
              <Button onClick={() => activeTab === "charges" ? (resetForm(), setIsDialogOpen(true)) : setIsExpenseDialogOpen(true)} disabled={activeTab === "expenses" && !condominiumId} className="text-sm">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{activeTab === "charges" ? "Nova Cobrança" : "Nova Despesa"}</span>
                <span className="sm:hidden">{activeTab === "charges" ? "Cobrança" : "Despesa"}</span>
              </Button>
            </div>
          }
        />

        {condominiumId && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{condominium?.name}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="charges" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Cobranças</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Despesas</span>
            </TabsTrigger>
          </TabsList>

          {/* Charges Tab */}
          <TabsContent value="charges" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatsCard title="Total de Lançamentos" value={chargeStats.total} icon={Receipt} variant="default" description={`R$ ${chargeStats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <StatsCard title="Pendentes" value={chargeStats.pending} icon={Clock} variant="warning" description="Aguardando pagamento" />
              <StatsCard title="Pagos" value={chargeStats.paid} icon={CheckCircle} variant="success" />
              <StatsCard title="Atrasados" value={chargeStats.overdue} icon={AlertTriangle} variant="info" description={`R$ ${chargeStats.overdueAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            </div>

            <DataTableHeader
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por unidade, bloco ou descrição..."
              filters={
                <>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="taxa_condominio">Taxa de Condomínio</SelectItem>
                      <SelectItem value="taxa_extra">Taxa Extra</SelectItem>
                      <SelectItem value="multa">Multa</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterUnit} onValueChange={setFilterUnit}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Unidades</SelectItem>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.block ? `${unit.block} - ` : ""}Unidade {unit.unit_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Mês" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Meses</SelectItem>
                      {monthOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportToCSV} title="Exportar Excel"><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF} title="Exportar PDF"><FileText className="h-4 w-4 mr-2" />PDF</Button>
                </>
              }
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              resultCount={filteredCharges.length}
            />

            <Card className="border-border">
              <CardContent className="p-0">
                {isLoading ? (
                  <TableSkeleton columns={6} rows={5} />
                ) : filteredCharges.length === 0 ? (
                  <EmptyState
                    icon={DollarSign}
                    title={searchTerm || filterStatus !== "all" || filterType !== "all" ? "Nenhum lançamento encontrado" : "Nenhum lançamento cadastrado"}
                    description={searchTerm || filterStatus !== "all" || filterType !== "all" ? "Tente ajustar os filtros de busca" : "Crie o primeiro lançamento financeiro"}
                    actionLabel={!searchTerm && filterStatus === "all" && filterType === "all" ? "Novo Lançamento" : undefined}
                    onAction={!searchTerm && filterStatus === "all" && filterType === "all" ? () => { resetForm(); setIsDialogOpen(true); } : undefined}
                  />
                ) : (
                  <ResponsiveDataView
                    desktopView={
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCharges.map((charge) => (
                            <TableRow key={charge.id} className="group hover:bg-muted/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10"><Home className="h-4 w-4 text-primary" /></div>
                                  <div>
                                    <p className="font-medium">{charge.units?.block && `${charge.units.block} - `}Unidade {charge.units?.unit_number}</p>
                                    {charge.description && <p className="text-sm text-muted-foreground line-clamp-1">{charge.description}</p>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getChargeTypeBadge(charge.charge_type)}</TableCell>
                              <TableCell><span className="font-semibold text-foreground">R$ {charge.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></TableCell>
                              <TableCell><span className="text-sm">{format(new Date(charge.due_date), "dd/MM/yyyy")}</span></TableCell>
                              <TableCell>{getStatusBadge(charge.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(charge)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(charge.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    }
                    mobileView={
                      <div className="p-4 space-y-3">
                        {paginatedCharges.map((charge) => (
                          <MobileDataCard key={charge.id}>
                            <MobileDataHeader avatar={<div className="p-2 rounded-lg bg-primary/10 shrink-0"><Home className="h-5 w-5 text-primary" /></div>} title={`${charge.units?.block ? `${charge.units.block} - ` : ""}Unidade ${charge.units?.unit_number}`} subtitle={charge.description} badge={getStatusBadge(charge.status)} />
                            <div className="space-y-1">
                              <MobileDataRow label="Tipo" value={getChargeTypeBadge(charge.charge_type)} />
                              <MobileDataRow label="Valor" value={<span className="font-semibold text-primary">R$ {charge.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>} />
                              <MobileDataRow label="Vencimento" value={format(new Date(charge.due_date), "dd/MM/yyyy")} />
                            </div>
                            <MobileDataActions>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(charge)} className="text-xs flex-1"><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(charge.id)} className="text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </MobileDataActions>
                          </MobileDataCard>
                        ))}
                      </div>
                    }
                  />
                )}
              </CardContent>
              
              {filteredCharges.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">Exibindo {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCharges.length)} de {filteredCharges.length}</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="hidden sm:inline">por página</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-2 sm:px-3">
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 3) { pageNum = i + 1; }
                        else if (currentPage <= 2) { pageNum = i + 1; }
                        else if (currentPage >= totalPages - 1) { pageNum = totalPages - 2 + i; }
                        else { pageNum = currentPage - 1 + i; }
                        return (<Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>);
                      })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-2 sm:px-3">
                      <span className="hidden sm:inline mr-1">Próximo</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatsCard title="Total de Despesas" value={expenseStats.total} icon={Receipt} trend={{ value: 0, isPositive: true }} />
              <StatsCard title="Valor Total" value={`R$ ${expenseStats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} trend={{ value: 0, isPositive: true }} />
              <StatsCard title="Rateados" value={expenseStats.apportioned} icon={CheckCircle} trend={{ value: 0, isPositive: true }} />
              <StatsCard title="Pendentes" value={expenseStats.pending} icon={Calculator} trend={{ value: 0, isPositive: false }} />
            </div>

            <DataTableHeader
              searchValue={expenseSearchTerm}
              onSearchChange={setExpenseSearchTerm}
              searchPlaceholder="Buscar por descrição ou fornecedor..."
              filters={
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              }
            />

            <Card className="border-border">
              <CardContent className="p-0">
                {!condominiumId ? (
                  <EmptyState icon={Receipt} title="Selecione um Condomínio" description="Escolha um condomínio no seletor acima para visualizar as despesas." />
                ) : expensesLoading ? (
                  <TableSkeleton columns={7} rows={5} />
                ) : filteredExpenses.length === 0 ? (
                  <EmptyState icon={Receipt} title="Nenhuma despesa encontrada" description="Não há despesas registradas para este condomínio." actionLabel="Registrar Primeira Despesa" onAction={() => setIsExpenseDialogOpen(true)} />
                ) : (
                  <ResponsiveDataView
                    desktopView={
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell><Badge variant="outline">{getMonthName(expense.expense_month)}/{expense.expense_year}</Badge></TableCell>
                              <TableCell><Badge variant={getCategoryBadgeVariant(expense.category)}>{getCategoryLabel(expense.category)}</Badge></TableCell>
                              <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                              <TableCell>{expense.supplier_name || "-"}</TableCell>
                              <TableCell className="font-semibold">R$ {expense.total_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell>
                                {expense.is_apportioned ? (
                                  <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Rateado</Badge>
                                ) : (
                                  <Badge variant="secondary">Pendente</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {!expense.is_apportioned ? (
                                    <Button variant="outline" size="sm" onClick={() => handleCalculateApportionment(expense)} disabled={calculateApportionment.isPending}><Calculator className="h-4 w-4 mr-1" /> Ratear</Button>
                                  ) : (
                                    <Button variant="outline" size="sm" onClick={() => handleViewApportionments(expense)}><FileText className="h-4 w-4 mr-1" /> Ver Rateio</Button>
                                  )}
                                  <Button variant="ghost" size="icon" onClick={() => handleExpenseEdit(expense)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleExpenseDelete(expense)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    }
                    mobileView={
                      <div className="divide-y divide-border">
                        {filteredExpenses.map((expense) => (
                          <MobileDataCard key={expense.id}>
                            <MobileDataHeader
                              title={expense.description}
                              subtitle={`${getMonthName(expense.expense_month)}/${expense.expense_year}`}
                              badge={expense.is_apportioned ? 
                                <Badge variant="default" className="bg-green-600 text-xs">Rateado</Badge> : 
                                <Badge variant="secondary" className="text-xs">Pendente</Badge>
                              }
                            />
                            <div className="space-y-1">
                              <MobileDataRow label="Categoria" value={<Badge variant={getCategoryBadgeVariant(expense.category)} className="text-xs">{getCategoryLabel(expense.category)}</Badge>} />
                              <MobileDataRow label="Fornecedor" value={expense.supplier_name || "-"} />
                              <MobileDataRow label="Valor Total" value={<span className="font-semibold">R$ {expense.total_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>} />
                            </div>
                            <MobileDataActions>
                              {!expense.is_apportioned ? (
                                <Button variant="outline" size="sm" onClick={() => handleCalculateApportionment(expense)} disabled={calculateApportionment.isPending} className="text-xs flex-1"><Calculator className="h-3 w-3 mr-1" />Ratear</Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => handleViewApportionments(expense)} className="text-xs flex-1"><FileText className="h-3 w-3 mr-1" />Ver Rateio</Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleExpenseEdit(expense)} className="text-xs"><Pencil className="h-3 w-3" /></Button>
                              <Button variant="outline" size="sm" onClick={() => handleExpenseDelete(expense)} className="text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </MobileDataActions>
                          </MobileDataCard>
                        ))}
                      </div>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Charge Dialog */}
        <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ResponsiveDialogContent className="max-w-2xl">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{editingCharge ? "Editar Lançamento" : "Novo Lançamento"}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>Preencha os dados do lançamento financeiro</ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade *</Label>
                  <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                    <SelectContent>{units?.map((unit) => (<SelectItem key={unit.id} value={unit.id}>{unit.block ? `${unit.block} - ` : ""}Unidade {unit.unit_number}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charge_type">Tipo de Lançamento *</Label>
                  <Select value={formData.charge_type} onValueChange={(value) => setFormData({ ...formData, charge_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taxa_condominio">Taxa de Condomínio</SelectItem>
                      <SelectItem value="taxa_extra">Taxa Extra</SelectItem>
                      <SelectItem value="multa">Multa</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.due_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(formData.due_date, "PPP", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={formData.due_date} onSelect={(date) => date && setFormData({ ...formData, due_date: date })} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto">{editingCharge ? "Atualizar" : "Criar"} Lançamento</Button>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        {/* Expense Dialog */}
        <ResponsiveDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
          <ResponsiveDialogContent className="max-w-lg">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>{selectedExpense ? "Editar Despesa" : "Nova Despesa"}</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mês</Label>
                  <Select value={expenseFormData.expense_month.toString()} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, expense_month: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 12 }, (_, i) => (<SelectItem key={i + 1} value={(i + 1).toString()}>{getMonthName(i + 1)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Select value={expenseFormData.expense_year.toString()} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, expense_year: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 5 }, (_, i) => { const year = new Date().getFullYear() - 2 + i; return (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>); })}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Categoria</Label>
                  <Select value={expenseFormData.category} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={expenseFormData.description} onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })} placeholder="Descreva a despesa..." rows={3} />
                </div>
                <div className="col-span-2">
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" step="0.01" value={expenseFormData.total_amount} onChange={(e) => setExpenseFormData({ ...expenseFormData, total_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Nº Nota Fiscal</Label>
                  <Input value={expenseFormData.invoice_number} onChange={(e) => setExpenseFormData({ ...expenseFormData, invoice_number: e.target.value })} placeholder="Opcional" />
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={expenseFormData.supplier_name} onChange={(e) => setExpenseFormData({ ...expenseFormData, supplier_name: e.target.value })} placeholder="Opcional" />
                </div>
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={resetExpenseForm} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending} className="w-full sm:w-auto">{selectedExpense ? "Salvar" : "Registrar"}</Button>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        {/* Apportionment Dialog */}
        <ResponsiveDialog open={isApportionmentDialogOpen} onOpenChange={setIsApportionmentDialogOpen}>
          <ResponsiveDialogContent className="max-w-2xl">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Detalhes do Rateio</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {selectedExpense && `${selectedExpense.description} - R$ ${selectedExpense.total_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Valor Rateado</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apportionments.map((ap) => (
                    <TableRow key={ap.id}>
                      <TableCell>{ap.units?.unit_number}{ap.units?.block && ` - ${ap.units.block}`}</TableCell>
                      <TableCell>R$ {ap.apportioned_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><Badge variant={ap.status === "charged" ? "default" : "secondary"}>{ap.status === "charged" ? "Cobrado" : "Pendente"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => setIsApportionmentDialogOpen(false)} className="w-full sm:w-auto">Fechar</Button>
              {apportionments.some(ap => ap.status === "pending") && (
                <Button onClick={handleGenerateCharges} disabled={generateChargesFromApportionments.isPending} className="w-full sm:w-auto">
                  <Receipt className="h-4 w-4 mr-2" /> Gerar Cobranças
                </Button>
              )}
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        {/* Schedule Configuration Dialog */}
        <ResponsiveDialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <ResponsiveDialogContent className="sm:max-w-md">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Configurar Agendamento Automático</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Configure quando os boletos mensais serão gerados automaticamente.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            {isLoadingSchedule ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Dia do mês</Label>
                    <Select
                      value={String(scheduleConfig.day)}
                      onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, day: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Select
                      value={String(scheduleConfig.hour)}
                      onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, hour: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <SelectItem key={hour} value={String(hour)}>
                            {String(hour).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Minuto</Label>
                    <Select
                      value={String(scheduleConfig.minute)}
                      onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, minute: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((minute) => (
                          <SelectItem key={minute} value={String(minute)}>
                            {String(minute).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Os boletos serão gerados automaticamente no dia {scheduleConfig.day} de cada mês às {String(scheduleConfig.hour).padStart(2, '0')}:{String(scheduleConfig.minute).padStart(2, '0')}.
                </p>
              </div>
            )}
            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={saveScheduleConfig} disabled={isSavingSchedule || isLoadingSchedule} className="w-full sm:w-auto">
                {isSavingSchedule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} onConfirm={confirmDelete} title="Excluir Lançamento" description="Tem certeza que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita." confirmText="Excluir" variant="destructive" />
        <ConfirmDialog open={isExpenseDeleteDialogOpen} onOpenChange={setIsExpenseDeleteDialogOpen} onConfirm={confirmExpenseDelete} title="Excluir Despesa" description="Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita." confirmText="Excluir" variant="destructive" />
      </div>
    </DashboardLayout>
  );
}
