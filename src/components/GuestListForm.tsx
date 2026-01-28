import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, User, Phone } from "lucide-react";
import type { Guest } from "@/hooks/useReservationGuests";

interface GuestListFormProps {
  guestsCount: number;
  guests: Guest[];
  onGuestsChange: (guests: Guest[]) => void;
}

const GuestListForm = ({ guestsCount, guests, onGuestsChange }: GuestListFormProps) => {
  const updateGuest = (index: number, field: keyof Guest, value: string) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    onGuestsChange(newGuests);
  };

  // Formatar telefone enquanto digita
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (index: number, value: string) => {
    const formatted = formatPhone(value);
    updateGuest(index, 'phone', formatted);
  };

  if (guestsCount === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <Label className="text-base font-medium">Lista de Convidados</Label>
        <span className="text-xs text-muted-foreground">({guestsCount} convidados)</span>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Preencha os dados de cada convidado. Esta lista será enviada para a portaria.
      </p>
      
      <ScrollArea className={guestsCount > 4 ? "h-[280px]" : undefined}>
        <div className="space-y-4 pr-4">
          {guests.map((guest, index) => (
            <div 
              key={index} 
              className="p-4 border rounded-lg bg-muted/30 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Convidado {index + 1}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`guest-name-${index}`} className="text-xs">
                    Nome Completo *
                  </Label>
                  <Input
                    id={`guest-name-${index}`}
                    value={guest.name}
                    onChange={(e) => updateGuest(index, 'name', e.target.value)}
                    placeholder="Nome do convidado"
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor={`guest-phone-${index}`} className="text-xs">
                    Telefone
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={`guest-phone-${index}`}
                      value={guest.phone}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="pl-10"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default GuestListForm;
