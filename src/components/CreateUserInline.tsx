import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUserSchema } from "@/lib/validationSchemas";
import { getErrorMessage } from "@/lib/errorHandler";

interface CreateUserInlineProps {
  onUserCreated: (userId: string) => void;
  onCancel: () => void;
}

export const CreateUserInline = ({ onUserCreated, onCancel }: CreateUserInlineProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "morador" as "morador" | "sindico" | "administrador" | "porteiro",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    const result = createUserSchema.safeParse(formData);
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          role: formData.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar usuário");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });

      onUserCreated(response.data.userId);
    } catch (error) {
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Criar Novo Usuário
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="new_user_name" className="text-xs">Nome Completo *</Label>
          <Input
            id="new_user_name"
            placeholder="Nome do usuário"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_user_email" className="text-xs">E-mail *</Label>
          <Input
            id="new_user_email"
            type="email"
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_user_password" className="text-xs">Senha *</Label>
          <Input
            id="new_user_password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new_user_role" className="text-xs">Função</Label>
          <Select
            value={formData.role}
            onValueChange={(value: any) => setFormData({ ...formData, role: value })}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morador">Morador</SelectItem>
              <SelectItem value="sindico">Síndico</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
              <SelectItem value="porteiro">Porteiro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="gradient"
          className="w-full"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Criar Usuário
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
