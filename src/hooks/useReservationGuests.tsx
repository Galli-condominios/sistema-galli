import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Guest {
  name: string;
  phone: string;
}

export interface ReservationGuest {
  id: string;
  reservation_id: string;
  guest_name: string;
  guest_phone: string | null;
  companion_count: number | null;
  created_at: string | null;
}

export const useReservationGuests = (reservationId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guests, isLoading } = useQuery({
    queryKey: ["reservation-guests", reservationId],
    queryFn: async () => {
      if (!reservationId) return [];
      
      const { data, error } = await supabase
        .from("reservation_guests")
        .select("*")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as ReservationGuest[];
    },
    enabled: !!reservationId,
  });

  const addGuests = useMutation({
    mutationFn: async ({ reservationId, guests }: { reservationId: string; guests: Guest[] }) => {
      const guestsToInsert = guests.map((guest) => ({
        reservation_id: reservationId,
        guest_name: guest.name,
        guest_phone: guest.phone || null,
        companion_count: 0,
      }));

      const { data, error } = await supabase
        .from("reservation_guests")
        .insert(guestsToInsert)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservation-guests"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar convidados",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    guests,
    isLoading,
    addGuests: addGuests.mutateAsync,
    isAddingGuests: addGuests.isPending,
  };
};

// Função para gerar relatório HTML para impressão
export const generateGuestListReport = (
  reservation: {
    common_areas?: { name: string };
    reservation_date: string;
    start_time: string;
    end_time: string;
    residents?: { profiles?: { full_name: string } };
    units?: { unit_number: string; condominiums?: { name: string } };
  },
  guests: ReservationGuest[]
) => {
  const formattedDate = new Date(reservation.reservation_date).toLocaleDateString('pt-BR');
  const formattedTime = `${reservation.start_time?.slice(0, 5)} - ${reservation.end_time?.slice(0, 5)}`;
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Lista de Convidados - ${reservation.common_areas?.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { font-size: 24px; margin-bottom: 10px; }
        .header p { color: #666; }
        .info { margin-bottom: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { margin-bottom: 8px; }
        .info-label { font-weight: bold; color: #333; }
        .info-value { color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #fafafa; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #888; }
        .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-line { width: 200px; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Lista de Convidados</h1>
        <p>Relatório para Portaria</p>
      </div>
      
      <div class="info">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Área:</span>
            <span class="info-value">${reservation.common_areas?.name || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Data:</span>
            <span class="info-value">${formattedDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Horário:</span>
            <span class="info-value">${formattedTime}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Morador:</span>
            <span class="info-value">${reservation.residents?.profiles?.full_name || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Unidade:</span>
            <span class="info-value">${reservation.units?.unit_number || '-'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Condomínio:</span>
            <span class="info-value">${reservation.units?.condominiums?.name || '-'}</span>
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Nome do Convidado</th>
            <th style="width: 150px;">Telefone</th>
            <th style="width: 100px;">Entrada</th>
          </tr>
        </thead>
        <tbody>
          ${guests.map((guest, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${guest.guest_name}</td>
              <td>${guest.guest_phone || '-'}</td>
              <td></td>
            </tr>
          `).join('')}
          ${guests.length === 0 ? '<tr><td colspan="4" style="text-align: center;">Nenhum convidado cadastrado</td></tr>' : ''}
        </tbody>
      </table>
      
      <p><strong>Total de convidados:</strong> ${guests.length}</p>
      
      <div class="signature-area">
        <div class="signature-line">Porteiro</div>
        <div class="signature-line">Morador Responsável</div>
      </div>
      
      <div class="footer">
        Gerado em ${new Date().toLocaleString('pt-BR')}
      </div>
    </body>
    </html>
  `;
};

// Função para imprimir relatório
export const printGuestList = (
  reservation: Parameters<typeof generateGuestListReport>[0],
  guests: ReservationGuest[]
) => {
  const html = generateGuestListReport(reservation, guests);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};
