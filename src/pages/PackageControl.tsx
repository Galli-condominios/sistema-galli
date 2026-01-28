import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Plus, CheckCircle } from "lucide-react";
import { usePackages } from "@/hooks/usePackages";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCondominiumFilter } from "@/hooks/useCondominiumFilter";

const PackageControl = () => {
  const { condominiumId, shouldFilter } = useCondominiumFilter();
  const { packages, isLoading, createPackage, markAsCollected, refetch } = usePackages();
  const [isOpen, setIsOpen] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    unit_id: "",
    tracking_code: "",
    sender: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    fetchUnits();
    getCurrentUser();
  }, [condominiumId, shouldFilter]);

  const fetchUnits = async () => {
    let query = supabase
      .from("units")
      .select("*, condominiums(name)")
      .order("unit_number");
    
    if (shouldFilter && condominiumId) {
      query = query.eq("condominium_id", condominiumId);
    }
    
    const { data } = await query;
    setUnits(data || []);
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  // Filter packages by condominium
  const filteredPackages = useMemo(() => {
    if (!shouldFilter || !condominiumId) return packages;
    return packages?.filter(p => {
      const unit = units.find(u => u.id === p.unit_id);
      return unit?.condominium_id === condominiumId;
    });
  }, [packages, shouldFilter, condominiumId, units]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createPackage(
      {
        ...formData,
        logged_by: userId,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setFormData({
            unit_id: "",
            tracking_code: "",
            sender: "",
            description: "",
            notes: "",
          });
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { text: string; className: string }> = {
      aguardando: {
        text: "Aguardando Coleta",
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
      },
      coletada: {
        text: "Coletada",
        className: "bg-green-500/10 text-green-500 border-green-500",
      },
    };
    const variant = variants[status] || variants.aguardando;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando encomendas..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Controle de Encomendas</h2>
            <p className="text-muted-foreground">
              Registre e gerencie as encomendas recebidas
            </p>
          </div>
          <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
            <ResponsiveDialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Encomenda
              </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="sm:max-w-2xl">
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Registrar Nova Encomenda</ResponsiveDialogTitle>
              </ResponsiveDialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_id">Unidade</Label>
                  <select
                    id="unit_id"
                    value={formData.unit_id}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_id: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2"
                    required
                  >
                    <option value="">Selecione a unidade</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.condominiums?.name} - Unidade {unit.unit_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tracking_code">Código de Rastreio</Label>
                    <Input
                      id="tracking_code"
                      value={formData.tracking_code}
                      onChange={(e) =>
                        setFormData({ ...formData, tracking_code: e.target.value })
                      }
                      placeholder="Ex: BR123456789BR"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender">Remetente</Label>
                    <Input
                      id="sender"
                      value={formData.sender}
                      onChange={(e) =>
                        setFormData({ ...formData, sender: e.target.value })
                      }
                      placeholder="Ex: Amazon, Correios..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Breve descrição da encomenda"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar e Notificar</Button>
                </div>
              </form>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>

        <Card className="border-border">
          <CardContent className="p-4 md:p-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : !filteredPackages || filteredPackages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma encomenda registrada
              </div>
            ) : (
              <ResponsiveDataView
                desktopView={
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Remetente</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Recebido em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPackages?.map((pkg: any) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">
                            {pkg.units?.unit_number}
                          </TableCell>
                          <TableCell>{pkg.sender || "-"}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {pkg.tracking_code || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {format(new Date(pkg.received_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                          <TableCell className="text-right">
                            {pkg.status === "aguardando" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsCollected(pkg.id)}
                                className="text-green-500 hover:text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Marcar Coletada
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                }
                mobileView={
                  <div className="space-y-3">
                    {filteredPackages?.map((pkg: any) => (
                      <MobileDataCard key={pkg.id}>
                        <MobileDataHeader
                          avatar={
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                          }
                          title={`Unidade ${pkg.units?.unit_number}`}
                          subtitle={pkg.sender || "Sem remetente"}
                          badge={getStatusBadge(pkg.status)}
                        />
                        <MobileDataRow label="Código" value={
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {pkg.tracking_code || "-"}
                          </code>
                        } />
                        <MobileDataRow 
                          label="Recebido em" 
                          value={format(new Date(pkg.received_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} 
                        />
                        {pkg.status === "aguardando" && (
                          <MobileDataActions>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsCollected(pkg.id)}
                              className="flex-1 text-green-500"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Marcar Coletada
                            </Button>
                          </MobileDataActions>
                        )}
                      </MobileDataCard>
                    ))}
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

export default PackageControl;
