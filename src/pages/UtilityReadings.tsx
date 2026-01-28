import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import DataTableHeader from "@/components/DataTableHeader";
import StatsCard from "@/components/StatsCard";
import EmptyState from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow, Table, TableBody, TableHead, TableHeader } from "@/components/ui/table";
import { Droplet, Plus, Pencil, Trash2, MapPin, TrendingUp, DollarSign, Zap, Car, Flame, Gauge, FileText, Home, Calendar } from "lucide-react";
import { useWaterReadings } from "@/hooks/useWaterReadings";
import { useElectricityReadings } from "@/hooks/useElectricityReadings";
import { useUtilityRates } from "@/hooks/useUtilityRates";
import { useUnits } from "@/hooks/useUnits";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";
import { useCondominium } from "@/contexts/CondominiumContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const UtilityReadings = () => {
  const [activeTab, setActiveTab] = useState("water");
  
  // Water readings
  const { readings: waterReadings, isLoading: waterLoading, createReading: createWaterReading, updateReading: updateWaterReading, deleteReading: deleteWaterReading } = useWaterReadings();
  
  // Electricity readings
  const { readings: electricityReadings, isLoading: electricityLoading, createReading: createElectricityReading, updateReading: updateElectricityReading, deleteReading: deleteElectricityReading } = useElectricityReadings();
  
  // Gas readings (manual)
  const { selectedCondominiumId, isAdmin } = useCondominium();
  const [gasReadings, setGasReadings] = useState<any[]>([]);
  const [gasLoading, setGasLoading] = useState(true);
  
  const { getActiveRate, createRate } = useUtilityRates();
  const { units } = useUnits();
  const { condominiumId, condominium } = useCondominiumFilter();
  const { toast } = useToast();

  // Shared state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Water form
  const [waterFormData, setWaterFormData] = useState({
    unit_id: "",
    reading_month: new Date().getMonth() + 1,
    reading_year: new Date().getFullYear(),
    previous_reading: 0,
    current_reading: 0,
    rate_per_m3: 0,
  });

  // Electricity form
  const [electricityFormData, setElectricityFormData] = useState({
    unit_id: "",
    garage_identifier: "",
    meter_serial: "",
    reading_month: new Date().getMonth() + 1,
    reading_year: new Date().getFullYear(),
    previous_reading: 0,
    current_reading: 0,
    rate_per_kwh: 0,
  });

  // Gas form
  const [gasFormData, setGasFormData] = useState({
    unit_id: "",
    reading_month: new Date().getMonth() + 1,
    reading_year: new Date().getFullYear(),
    reading_value: "",
  });

  const [rateFormData, setRateFormData] = useState({
    rate_per_unit: 0,
    effective_date: new Date().toISOString().split("T")[0],
  });

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const waterActiveRate = getActiveRate("water");
  const electricityActiveRate = getActiveRate("electricity");

  // Fetch gas readings
  const fetchGasReadings = async () => {
    if (!selectedCondominiumId && isAdmin) {
      setGasLoading(false);
      return;
    }

    setGasLoading(true);
    
    let query = supabase
      .from("gas_readings")
      .select("*, units(unit_number, condominium_id, condominiums(name))")
      .order("reading_year", { ascending: false })
      .order("reading_month", { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      let filtered = data || [];
      if (isAdmin && selectedCondominiumId) {
        filtered = filtered.filter(r => r.units?.condominium_id === selectedCondominiumId);
      }
      setGasReadings(filtered);
    }
    setGasLoading(false);
  };

  useEffect(() => {
    fetchGasReadings();
  }, [selectedCondominiumId]);

  // Stats
  const waterStats = useMemo(() => {
    if (!waterReadings) return { total: 0, totalConsumption: 0, totalAmount: 0 };
    return {
      total: waterReadings.length,
      totalConsumption: waterReadings.reduce((sum, r) => sum + (r.consumption_m3 || 0), 0),
      totalAmount: waterReadings.reduce((sum, r) => sum + (r.calculated_amount || 0), 0),
    };
  }, [waterReadings]);

  const electricityStats = useMemo(() => {
    if (!electricityReadings) return { total: 0, totalConsumption: 0, totalAmount: 0 };
    return {
      total: electricityReadings.length,
      totalConsumption: electricityReadings.reduce((sum, r) => sum + (r.consumption_kwh || 0), 0),
      totalAmount: electricityReadings.reduce((sum, r) => sum + (r.calculated_amount || 0), 0),
    };
  }, [electricityReadings]);

  const gasStats = useMemo(() => {
    const total = gasReadings.length;
    const avgConsumption = gasReadings.length > 0
      ? (gasReadings.reduce((acc, r) => acc + r.reading_value, 0) / gasReadings.length)
      : 0;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const thisMonthReadings = gasReadings.filter(
      r => r.reading_month === currentMonth && r.reading_year === currentYear
    ).length;
    return { total, avgConsumption, thisMonthReadings };
  }, [gasReadings]);

  // Filtered readings
  const filteredWaterReadings = useMemo(() => {
    if (!waterReadings) return [];
    return waterReadings.filter((reading) => {
      const unitInfo = reading.units ? `${reading.units.unit_number} ${reading.units.block || ""}` : "";
      return unitInfo.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [waterReadings, searchTerm]);

  const filteredElectricityReadings = useMemo(() => {
    if (!electricityReadings) return [];
    return electricityReadings.filter((reading) => {
      const unitInfo = reading.units ? `${reading.units.unit_number} ${reading.units.block || ""}` : "";
      const garageInfo = reading.garage_identifier || "";
      return unitInfo.toLowerCase().includes(searchTerm.toLowerCase()) || 
             garageInfo.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [electricityReadings, searchTerm]);

  const filteredGasReadings = useMemo(() => {
    return gasReadings.filter((r) => {
      const unitInfo = r.units?.unit_number || "";
      return unitInfo.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [gasReadings, searchTerm]);

  const getMonthName = (month: number) => {
    return format(new Date(2024, month - 1), "MMMM", { locale: ptBR });
  };

  // Handlers
  const handleWaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominiumId) return;

    const data = {
      ...waterFormData,
      condominium_id: condominiumId,
      rate_per_m3: waterActiveRate?.rate_per_unit || waterFormData.rate_per_m3,
    };

    if (selectedReading) {
      await updateWaterReading.mutateAsync({ id: selectedReading.id, ...data });
    } else {
      await createWaterReading.mutateAsync(data);
    }
    resetForm();
  };

  const handleElectricitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominiumId) return;

    const data = {
      ...electricityFormData,
      condominium_id: condominiumId,
      rate_per_kwh: electricityActiveRate?.rate_per_unit || electricityFormData.rate_per_kwh,
    };

    if (selectedReading) {
      await updateElectricityReading.mutateAsync({ id: selectedReading.id, ...data });
    } else {
      await createElectricityReading.mutateAsync(data);
    }
    resetForm();
  };

  const handleGasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...gasFormData,
      reading_value: parseFloat(gasFormData.reading_value),
    };

    const { error } = await supabase.from("gas_readings").insert([data]);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Leitura registrada!" });
      fetchGasReadings();
    }
    resetForm();
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominiumId) return;

    const utilityType = activeTab === "water" ? "water" : "electricity";
    const unitLabel = activeTab === "water" ? "m³" : "kWh";

    await createRate.mutateAsync({
      condominium_id: condominiumId,
      utility_type: utilityType,
      rate_per_unit: rateFormData.rate_per_unit,
      unit_label: unitLabel,
      effective_date: rateFormData.effective_date,
    });

    setIsRateDialogOpen(false);
    setRateFormData({ rate_per_unit: 0, effective_date: new Date().toISOString().split("T")[0] });
  };

  const handleEdit = (reading: any) => {
    setSelectedReading(reading);
    if (activeTab === "water") {
      setWaterFormData({
        unit_id: reading.unit_id,
        reading_month: reading.reading_month,
        reading_year: reading.reading_year,
        previous_reading: reading.previous_reading,
        current_reading: reading.current_reading,
        rate_per_m3: reading.rate_per_m3,
      });
    } else if (activeTab === "electricity") {
      setElectricityFormData({
        unit_id: reading.unit_id,
        garage_identifier: reading.garage_identifier,
        meter_serial: reading.meter_serial || "",
        reading_month: reading.reading_month,
        reading_year: reading.reading_year,
        previous_reading: reading.previous_reading,
        current_reading: reading.current_reading,
        rate_per_kwh: reading.rate_per_kwh,
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (reading: any) => {
    setSelectedReading(reading);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedReading) {
      if (activeTab === "water") {
        await deleteWaterReading.mutateAsync(selectedReading.id);
      } else if (activeTab === "electricity") {
        await deleteElectricityReading.mutateAsync(selectedReading.id);
      }
      setIsDeleteDialogOpen(false);
      setSelectedReading(null);
    }
  };

  const resetForm = () => {
    setIsDialogOpen(false);
    setSelectedReading(null);
    setWaterFormData({
      unit_id: "",
      reading_month: new Date().getMonth() + 1,
      reading_year: new Date().getFullYear(),
      previous_reading: 0,
      current_reading: 0,
      rate_per_m3: waterActiveRate?.rate_per_unit || 0,
    });
    setElectricityFormData({
      unit_id: "",
      garage_identifier: "",
      meter_serial: "",
      reading_month: new Date().getMonth() + 1,
      reading_year: new Date().getFullYear(),
      previous_reading: 0,
      current_reading: 0,
      rate_per_kwh: electricityActiveRate?.rate_per_unit || 0,
    });
    setGasFormData({
      unit_id: "",
      reading_month: new Date().getMonth() + 1,
      reading_year: new Date().getFullYear(),
      reading_value: "",
    });
  };

  const generateGasReport = () => {
    if (filteredGasReadings.length === 0) {
      toast({ title: "Aviso", description: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }
    const reportData = filteredGasReadings.map((r) => ({
      Condomínio: r.units?.condominiums?.name,
      Unidade: r.units?.unit_number,
      Mês: months[r.reading_month - 1],
      Ano: r.reading_year,
      "Consumo (m³)": r.reading_value,
    }));

    const csv = [
      Object.keys(reportData[0]).join(","),
      ...reportData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-gas-${new Date().toISOString()}.csv`;
    a.click();
    toast({ title: "Sucesso", description: "Relatório gerado!" });
  };

  const totalReadings = waterStats.total + electricityStats.total + gasStats.total;

  return (
    <DashboardLayout>
      <PageHeader
        title="Leituras de Consumo"
        count={totalReadings}
        actions={
          <div className="flex gap-2">
            {activeTab !== "gas" && (
              <Button variant="outline" onClick={() => setIsRateDialogOpen(true)}>
                Configurar Tarifa
              </Button>
            )}
            {activeTab === "gas" && (
              <Button variant="outline" onClick={generateGasReport} disabled={filteredGasReadings.length === 0}>
                <FileText className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
            )}
            <Button onClick={() => setIsDialogOpen(true)} disabled={!condominiumId}>
              <Plus className="h-4 w-4 mr-2" /> Nova Leitura
            </Button>
          </div>
        }
      />

      {condominiumId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="h-4 w-4" />
          <span>{condominium?.name}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="water" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            <span className="hidden sm:inline">Água</span>
          </TabsTrigger>
          <TabsTrigger value="electricity" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Energia</span>
          </TabsTrigger>
          <TabsTrigger value="gas" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">Gás</span>
          </TabsTrigger>
        </TabsList>

        {/* Water Tab */}
        <TabsContent value="water" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total de Leituras"
              value={waterStats.total}
              icon={Droplet}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Consumo Total"
              value={`${waterStats.totalConsumption.toFixed(2)} m³`}
              icon={TrendingUp}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Valor Total"
              value={`R$ ${waterStats.totalAmount.toFixed(2)}`}
              icon={DollarSign}
              trend={{ value: 0, isPositive: true }}
            />
          </div>

          {waterActiveRate && (
            <Badge variant="outline">
              Tarifa vigente: R$ {waterActiveRate.rate_per_unit.toFixed(2)}/m³
            </Badge>
          )}

          <Card>
            <DataTableHeader
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por unidade..."
            />
            <CardContent className="p-0">
              {!condominiumId ? (
                <EmptyState icon={Droplet} title="Selecione um Condomínio" description="Escolha um condomínio para visualizar as leituras." />
              ) : filteredWaterReadings.length === 0 ? (
                <EmptyState icon={Droplet} title="Nenhuma leitura" description="Não há leituras de água registradas." actionLabel="Registrar" onAction={() => setIsDialogOpen(true)} />
              ) : (
                <ResponsiveDataView
                  desktopView={
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Leit. Ant.</TableHead>
                          <TableHead>Leit. Atual</TableHead>
                          <TableHead>Consumo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWaterReadings.map((reading) => (
                          <TableRow key={reading.id}>
                            <TableCell className="font-medium">
                              {reading.units?.unit_number}
                              {reading.units?.block && <span className="text-muted-foreground text-sm ml-1">- {reading.units.block}</span>}
                            </TableCell>
                            <TableCell><Badge variant="outline">{getMonthName(reading.reading_month)}/{reading.reading_year}</Badge></TableCell>
                            <TableCell>{reading.previous_reading}</TableCell>
                            <TableCell>{reading.current_reading}</TableCell>
                            <TableCell><Badge variant="secondary">{reading.consumption_m3?.toFixed(2)} m³</Badge></TableCell>
                            <TableCell className="font-semibold text-primary">R$ {reading.calculated_amount?.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(reading)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(reading)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  }
                  mobileView={
                    <div className="space-y-3 p-4">
                      {filteredWaterReadings.map((reading) => (
                        <MobileDataCard key={reading.id}>
                          <MobileDataHeader
                            avatar={
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Droplet className="h-4 w-4 text-primary" />
                              </div>
                            }
                            title={`${reading.units?.unit_number}${reading.units?.block ? ` - ${reading.units.block}` : ''}`}
                            subtitle={`${getMonthName(reading.reading_month)}/${reading.reading_year}`}
                            badge={<Badge variant="secondary" className="text-[10px]">{reading.consumption_m3?.toFixed(2)} m³</Badge>}
                            actions={
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(reading)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(reading)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            }
                          />
                          <MobileDataRow label="Leitura Anterior" value={reading.previous_reading} />
                          <MobileDataRow label="Leitura Atual" value={reading.current_reading} />
                          <MobileDataRow label="Valor" value={<span className="text-primary font-semibold">R$ {reading.calculated_amount?.toFixed(2)}</span>} />
                        </MobileDataCard>
                      ))}
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Electricity Tab */}
        <TabsContent value="electricity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total de Leituras"
              value={electricityStats.total}
              icon={Zap}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Consumo Total"
              value={`${electricityStats.totalConsumption.toFixed(2)} kWh`}
              icon={TrendingUp}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Valor Total"
              value={`R$ ${electricityStats.totalAmount.toFixed(2)}`}
              icon={DollarSign}
              trend={{ value: 0, isPositive: true }}
            />
          </div>

          {electricityActiveRate && (
            <Badge variant="outline">
              Tarifa vigente: R$ {electricityActiveRate.rate_per_unit.toFixed(2)}/kWh
            </Badge>
          )}

          <Card>
            <DataTableHeader
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por unidade ou garagem..."
            />
            <CardContent className="p-0">
              {!condominiumId ? (
                <EmptyState icon={Zap} title="Selecione um Condomínio" description="Escolha um condomínio para visualizar as leituras." />
              ) : filteredElectricityReadings.length === 0 ? (
                <EmptyState icon={Zap} title="Nenhuma leitura" description="Não há leituras de energia registradas." actionLabel="Registrar" onAction={() => setIsDialogOpen(true)} />
              ) : (
                <ResponsiveDataView
                  desktopView={
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Garagem/Medidor</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Consumo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredElectricityReadings.map((reading) => (
                          <TableRow key={reading.id}>
                            <TableCell className="font-medium">
                              {reading.units?.unit_number}
                              {reading.units?.block && <span className="text-muted-foreground text-sm ml-1">- {reading.units.block}</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span>{reading.garage_identifier}</span>
                                {reading.meter_serial && <Badge variant="outline" className="text-xs">#{reading.meter_serial}</Badge>}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{getMonthName(reading.reading_month)}/{reading.reading_year}</Badge></TableCell>
                            <TableCell><Badge variant="secondary">{reading.consumption_kwh?.toFixed(2)} kWh</Badge></TableCell>
                            <TableCell className="font-semibold text-primary">R$ {reading.calculated_amount?.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(reading)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(reading)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  }
                  mobileView={
                    <div className="space-y-3 p-4">
                      {filteredElectricityReadings.map((reading) => (
                        <MobileDataCard key={reading.id}>
                          <MobileDataHeader
                            avatar={
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Zap className="h-4 w-4 text-primary" />
                              </div>
                            }
                            title={`${reading.units?.unit_number}${reading.units?.block ? ` - ${reading.units.block}` : ''}`}
                            subtitle={`${reading.garage_identifier}${reading.meter_serial ? ` #${reading.meter_serial}` : ''}`}
                            badge={<Badge variant="secondary" className="text-[10px]">{reading.consumption_kwh?.toFixed(2)} kWh</Badge>}
                            actions={
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(reading)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(reading)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            }
                          />
                          <MobileDataRow label="Período" value={`${getMonthName(reading.reading_month)}/${reading.reading_year}`} />
                          <MobileDataRow label="Valor" value={<span className="text-primary font-semibold">R$ {reading.calculated_amount?.toFixed(2)}</span>} />
                        </MobileDataCard>
                      ))}
                    </div>
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gas Tab */}
        <TabsContent value="gas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total de Leituras"
              value={gasStats.total}
              icon={Flame}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Consumo Médio"
              value={`${gasStats.avgConsumption.toFixed(2)} m³`}
              icon={TrendingUp}
              trend={{ value: 0, isPositive: true }}
            />
            <StatsCard
              title="Leituras Este Mês"
              value={gasStats.thisMonthReadings}
              icon={Calendar}
              trend={{ value: 0, isPositive: true }}
            />
          </div>

          <Card>
            <DataTableHeader
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por unidade..."
            />
            <CardContent className="p-0">
              {!condominiumId ? (
                <EmptyState icon={Flame} title="Selecione um Condomínio" description="Escolha um condomínio para visualizar as leituras." />
              ) : filteredGasReadings.length === 0 ? (
                <EmptyState icon={Flame} title="Nenhuma leitura" description="Não há leituras de gás registradas." actionLabel="Registrar" onAction={() => setIsDialogOpen(true)} />
              ) : (
                <ResponsiveDataView
                  desktopView={
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Condomínio</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Consumo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGasReadings.map((reading) => (
                          <TableRow key={reading.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <Home className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">{reading.units?.unit_number}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{reading.units?.condominiums?.name}</TableCell>
                            <TableCell><Badge variant="outline">{months[reading.reading_month - 1]} / {reading.reading_year}</Badge></TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                <Flame className="mr-1 h-3 w-3" />
                                {reading.reading_value} m³
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  }
                  mobileView={
                    <div className="space-y-3 p-4">
                      {filteredGasReadings.map((reading) => (
                        <MobileDataCard key={reading.id}>
                          <MobileDataHeader
                            avatar={
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                <Flame className="h-4 w-4 text-primary" />
                              </div>
                            }
                            title={reading.units?.unit_number}
                            subtitle={reading.units?.condominiums?.name}
                            badge={<Badge variant="secondary" className="text-[10px]">{reading.reading_value} m³</Badge>}
                          />
                          <MobileDataRow label="Período" value={`${months[reading.reading_month - 1]}/${reading.reading_year}`} />
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

      {/* Dialog for new reading - switches based on active tab */}
      <ResponsiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {selectedReading ? "Editar Leitura" : `Nova Leitura de ${activeTab === "water" ? "Água" : activeTab === "electricity" ? "Energia" : "Gás"}`}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          
          {activeTab === "water" && (
            <form onSubmit={handleWaterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Unidade</Label>
                  <Select value={waterFormData.unit_id} onValueChange={(value) => setWaterFormData({ ...waterFormData, unit_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                    <SelectContent>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.unit_number}{unit.block && ` - ${unit.block}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mês</Label>
                  <Select value={waterFormData.reading_month.toString()} onValueChange={(value) => setWaterFormData({ ...waterFormData, reading_month: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (<SelectItem key={i + 1} value={(i + 1).toString()}>{getMonthName(i + 1)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Select value={waterFormData.reading_year.toString()} onValueChange={(value) => setWaterFormData({ ...waterFormData, reading_year: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => { const year = new Date().getFullYear() - 2 + i; return (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>); })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leitura Anterior (m³)</Label>
                  <Input type="number" step="0.01" value={waterFormData.previous_reading} onChange={(e) => setWaterFormData({ ...waterFormData, previous_reading: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Leitura Atual (m³)</Label>
                  <Input type="number" step="0.01" value={waterFormData.current_reading} onChange={(e) => setWaterFormData({ ...waterFormData, current_reading: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Consumo:</span>
                    <span className="font-semibold">{(waterFormData.current_reading - waterFormData.previous_reading).toFixed(2)} m³</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Valor:</span>
                    <span className="font-semibold text-primary">R$ {((waterFormData.current_reading - waterFormData.previous_reading) * (waterActiveRate?.rate_per_unit || waterFormData.rate_per_m3)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto">{selectedReading ? "Salvar" : "Registrar"}</Button>
              </ResponsiveDialogFooter>
            </form>
          )}

          {activeTab === "electricity" && (
            <form onSubmit={handleElectricitySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Unidade</Label>
                  <Select value={electricityFormData.unit_id} onValueChange={(value) => setElectricityFormData({ ...electricityFormData, unit_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                    <SelectContent>
                      {units?.map((unit) => (<SelectItem key={unit.id} value={unit.id}>{unit.unit_number}{unit.block && ` - ${unit.block}`}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Identificador Garagem</Label>
                  <Input value={electricityFormData.garage_identifier} onChange={(e) => setElectricityFormData({ ...electricityFormData, garage_identifier: e.target.value })} placeholder="Ex: G-101" />
                </div>
                <div>
                  <Label>Nº Medidor (opcional)</Label>
                  <Input value={electricityFormData.meter_serial} onChange={(e) => setElectricityFormData({ ...electricityFormData, meter_serial: e.target.value })} placeholder="Ex: MED-001" />
                </div>
                <div>
                  <Label>Mês</Label>
                  <Select value={electricityFormData.reading_month.toString()} onValueChange={(value) => setElectricityFormData({ ...electricityFormData, reading_month: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (<SelectItem key={i + 1} value={(i + 1).toString()}>{getMonthName(i + 1)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Select value={electricityFormData.reading_year.toString()} onValueChange={(value) => setElectricityFormData({ ...electricityFormData, reading_year: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => { const year = new Date().getFullYear() - 2 + i; return (<SelectItem key={year} value={year.toString()}>{year}</SelectItem>); })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Leitura Anterior (kWh)</Label>
                  <Input type="number" step="0.01" value={electricityFormData.previous_reading} onChange={(e) => setElectricityFormData({ ...electricityFormData, previous_reading: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Leitura Atual (kWh)</Label>
                  <Input type="number" step="0.01" value={electricityFormData.current_reading} onChange={(e) => setElectricityFormData({ ...electricityFormData, current_reading: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Consumo:</span>
                    <span className="font-semibold">{(electricityFormData.current_reading - electricityFormData.previous_reading).toFixed(2)} kWh</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Valor:</span>
                    <span className="font-semibold text-primary">R$ {((electricityFormData.current_reading - electricityFormData.previous_reading) * (electricityActiveRate?.rate_per_unit || electricityFormData.rate_per_kwh)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto">{selectedReading ? "Salvar" : "Registrar"}</Button>
              </ResponsiveDialogFooter>
            </form>
          )}

          {activeTab === "gas" && (
            <form onSubmit={handleGasSubmit} className="space-y-4">
              <div>
                <Label>Unidade</Label>
                <Select value={gasFormData.unit_id} onValueChange={(value) => setGasFormData({ ...gasFormData, unit_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {units?.map((unit) => (<SelectItem key={unit.id} value={unit.id}>{unit.unit_number}{unit.block && ` - ${unit.block}`}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mês</Label>
                  <Select value={gasFormData.reading_month.toString()} onValueChange={(value) => setGasFormData({ ...gasFormData, reading_month: parseInt(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map((month, idx) => (<SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input type="number" value={gasFormData.reading_year} onChange={(e) => setGasFormData({ ...gasFormData, reading_year: parseInt(e.target.value) })} required />
                </div>
              </div>
              <div>
                <Label>Leitura Atual (m³)</Label>
                <Input type="number" step="0.01" value={gasFormData.reading_value} onChange={(e) => setGasFormData({ ...gasFormData, reading_value: e.target.value })} required placeholder="Ex: 15.50" />
              </div>
              <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto">Registrar</Button>
              </ResponsiveDialogFooter>
            </form>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Rate Dialog */}
      <ResponsiveDialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Configurar Tarifa de {activeTab === "water" ? "Água" : "Energia"}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <form onSubmit={handleRateSubmit} className="space-y-4">
            <div>
              <Label>Tarifa (R$/{activeTab === "water" ? "m³" : "kWh"})</Label>
              <Input type="number" step="0.01" value={rateFormData.rate_per_unit} onChange={(e) => setRateFormData({ ...rateFormData, rate_per_unit: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Data de Vigência</Label>
              <Input type="date" value={rateFormData.effective_date} onChange={(e) => setRateFormData({ ...rateFormData, effective_date: e.target.value })} />
            </div>
            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRateDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
              <Button type="submit" className="w-full sm:w-auto">Salvar Tarifa</Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir Leitura"
        description="Tem certeza que deseja excluir esta leitura? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </DashboardLayout>
  );
};

export default UtilityReadings;
