import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Users, 
  Building2, 
  Calendar, 
  CheckCircle,
  FileText,
  XCircle,
  CalendarDays,
  Info,
  Clock
} from "lucide-react";
import { useCommonAreaReservations } from "@/hooks/useCommonAreaReservations";
import CommonAreaAvailabilityCalendar from "./CommonAreaAvailabilityCalendar";
import CommonAreaImageCarousel from "./CommonAreaImageCarousel";

interface CommonAreaCardProps {
  area: {
    id: string;
    name: string;
    description?: string | null;
    capacity?: number | null;
    rules?: string | null;
    requires_approval?: boolean | null;
    cancellation_policy?: string | null;
    image_url?: string | null;
    image_urls?: string[] | null;
    available_days?: number[] | null;
    opening_time?: string | null;
    closing_time?: string | null;
    condominiums?: { name: string } | null;
  };
  onReserve: (area: any, selectedDate?: Date) => void;
}

const DAY_NAMES_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatAvailableDays = (days: number[] | null | undefined): string => {
  if (!days || days.length === 0) return "Todos os dias";
  if (days.length === 7) return "Todos os dias";
  if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5])) return "Seg-Sex";
  if (JSON.stringify(days.sort()) === JSON.stringify([0, 6])) return "Fins de semana";
  return days.map(d => DAY_NAMES_SHORT[d]).join(", ");
};

const formatTime = (time: string | null | undefined): string => {
  if (!time) return "";
  return time.slice(0, 5);
};

const CommonAreaCard = ({ area, onReserve }: CommonAreaCardProps) => {
  const [infoOpen, setInfoOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const { data: reservations = [], isLoading: isLoadingReservations } = useCommonAreaReservations(area.id);

  const handleDateSelect = (date: Date) => {
    setCalendarOpen(false);
    onReserve(area, date);
  };

  // Obter array de imagens (prioriza image_urls, fallback para image_url)
  const getImages = (): string[] => {
    if (area.image_urls && Array.isArray(area.image_urls) && area.image_urls.length > 0) {
      return area.image_urls;
    }
    if (area.image_url) {
      return [area.image_url];
    }
    return [];
  };

  const images = getImages();

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
        {/* Imagem/Carrossel da área */}
        <div className="relative overflow-hidden">
          <CommonAreaImageCarousel images={images} areaName={area.name} />
          
          {/* Badge de aprovação sobre a imagem */}
          <div className="absolute top-3 right-3 z-10">
            {area.requires_approval ? (
              <Badge variant="warning" className="shadow-md">
                <CheckCircle className="mr-1 h-3 w-3" />
                Requer Aprovação
              </Badge>
            ) : (
              <Badge variant="success" className="shadow-md">
                Reserva Livre
              </Badge>
            )}
          </div>
        </div>
        
        <CardContent className="p-5 space-y-4">
          {/* Nome e Condomínio */}
          <div>
            <h3 className="font-semibold text-lg text-foreground">{area.name}</h3>
            {area.condominiums?.name && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{area.condominiums.name}</span>
              </div>
            )}
          </div>
          
          {/* Capacidade e Horários */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {area.capacity && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-md">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  {area.capacity} pessoas
                </span>
              </div>
            )}
            {(area.opening_time || area.closing_time) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {formatTime(area.opening_time)} - {formatTime(area.closing_time)}
                </span>
              </div>
            )}
          </div>

          {/* Dias disponíveis */}
          {area.available_days && (
            <div className="text-xs text-muted-foreground">
              📅 {formatAvailableDays(area.available_days)}
            </div>
          )}
          
          {/* Descrição resumida */}
          {area.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {area.description}
            </p>
          )}
          
          {/* Botões */}
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setInfoOpen(true)}
            >
              <Info className="mr-2 h-4 w-4" />
              Saiba Mais
            </Button>
            <Button 
              variant="gradient" 
              className="flex-1"
              onClick={() => setCalendarOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Reservar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Dialog - Saiba Mais */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {area.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Carrossel de Imagens */}
            {images.length > 0 && (
              <div className="rounded-lg overflow-hidden">
                <CommonAreaImageCarousel images={images} areaName={area.name} />
              </div>
            )}

            {/* Condomínio */}
            {area.condominiums?.name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{area.condominiums.name}</span>
              </div>
            )}

            {/* Status e Capacidade */}
            <div className="flex flex-wrap gap-3">
              {area.requires_approval ? (
                <Badge variant="warning">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Requer Aprovação
                </Badge>
              ) : (
                <Badge variant="success">
                  Reserva Livre
                </Badge>
              )}
              
              {area.capacity && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Capacidade: {area.capacity} pessoas
                </Badge>
              )}
            </div>

            {/* Funcionamento */}
            <div className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Funcionamento
              </h4>
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Dias: </span>
                    <span className="font-medium text-foreground">{formatAvailableDays(area.available_days)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horário: </span>
                    <span className="font-medium text-foreground">
                      {formatTime(area.opening_time) || "08:00"} - {formatTime(area.closing_time) || "22:00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {area.description && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Descrição
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {area.description}
                </p>
              </div>
            )}

            {/* Regras */}
            {area.rules && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Regras de Uso
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                  {area.rules}
                </div>
              </div>
            )}

            {/* Política de cancelamento */}
            {area.cancellation_policy && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Política de Cancelamento
                </h4>
                <div className="p-4 bg-destructive/10 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                  {area.cancellation_policy}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setInfoOpen(false)}>
              Fechar
            </Button>
            <Button 
              variant="gradient" 
              onClick={() => {
                setInfoOpen(false);
                setCalendarOpen(true);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Reservar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog - Reservar */}
      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Selecione uma data para reservar - {area.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Clique em uma data disponível para prosseguir com a reserva.
          </p>
          <CommonAreaAvailabilityCalendar
            commonAreaId={area.id}
            commonAreaName={area.name}
            reservations={reservations.map((r: any) => ({
              ...r,
              residents: r.residents ? {
                profiles: r.residents.profiles
              } : undefined
            }))}
            onDateSelect={handleDateSelect}
          />
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setCalendarOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommonAreaCard;
