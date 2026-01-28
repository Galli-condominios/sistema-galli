import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Printer, Calendar, Clock, Home, User } from "lucide-react";
import { useReservationGuests, printGuestList } from "@/hooks/useReservationGuests";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReservationGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    common_areas?: { name: string };
    reservation_date: string;
    start_time: string;
    end_time: string;
    guests_count: number;
    status: string;
    residents?: { profiles?: { full_name: string } };
    units?: { unit_number: string; condominiums?: { name: string } };
  } | null;
}

const ReservationGuestsDialog = ({
  open,
  onOpenChange,
  reservation,
}: ReservationGuestsDialogProps) => {
  const { guests, isLoading } = useReservationGuests(reservation?.id);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { text: string; variant: "warning" | "success" | "destructive" | "muted" }> = {
      pendente: { text: "Pendente", variant: "warning" },
      aprovada: { text: "Aprovada", variant: "success" },
      rejeitada: { text: "Rejeitada", variant: "destructive" },
      cancelada: { text: "Cancelada", variant: "muted" },
    };
    const variant = variants[status] || variants.pendente;
    return <Badge variant={variant.variant}>{variant.text}</Badge>;
  };

  const handlePrint = () => {
    if (reservation && guests) {
      printGuestList(reservation, guests);
    }
  };

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Convidados
          </DialogTitle>
        </DialogHeader>

        {/* Reservation Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Área:</strong> {reservation.common_areas?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Data:</strong>{" "}
              {format(new Date(reservation.reservation_date), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Horário:</strong> {reservation.start_time?.slice(0, 5)} - {reservation.end_time?.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Morador:</strong> {reservation.residents?.profiles?.full_name || "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Unidade:</strong> {reservation.units?.unit_number}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              <strong>Status:</strong> {getStatusBadge(reservation.status)}
            </span>
          </div>
        </div>

        {/* Guests Table */}
        <div className="border rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !guests || guests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum convidado cadastrado para esta reserva</p>
              <p className="text-sm mt-1">Total esperado: {reservation.guests_count || 0} convidados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest, index) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{guest.guest_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {guest.guest_phone || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Summary and Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <strong>{guests?.length || 0}</strong> convidados cadastrados
            {reservation.guests_count > 0 && (
              <span> de <strong>{reservation.guests_count}</strong> esperados</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={handlePrint} disabled={!guests || guests.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Lista
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationGuestsDialog;
