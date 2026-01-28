import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Building2, MapPin, Hash, ArrowRight, Loader2, Sparkles } from "lucide-react";
import galliLogo from "@/assets/galli-logo.png";
import { firstCondominiumSchema } from "@/lib/validationSchemas";
import { getErrorMessage } from "@/lib/errorHandler";
import { useFirstCondominiumCheck } from "@/hooks/useFirstCondominiumCheck";
import { useCondominium } from "@/contexts/CondominiumContext";

type FormErrors = {
  name?: string;
  address?: string;
  total_units?: string;
};

const FirstCondominiumSetup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { organizationId, organizationName, setNeedsFirstCondominium } = useFirstCondominiumCheck();
  const { setSelectedCondominiumId, refreshCondominiums } = useCondominium();
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    total_units: "",
  });

  const validateForm = (): boolean => {
    const dataToValidate = {
      name: formData.name,
      address: formData.address || undefined,
      total_units: formData.total_units ? parseInt(formData.total_units, 10) : 0,
    };

    const result = firstCondominiumSchema.safeParse(dataToValidate);
    
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FormErrors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Verifique os campos destacados.",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId) {
      toast({
        title: "Erro",
        description: "Organização não encontrada. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const totalUnits = parseInt(formData.total_units, 10);

      // Create the condominium
      const { data: condominiumData, error: condominiumError } = await supabase
        .from("condominiums")
        .insert({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          total_units: totalUnits,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (condominiumError) throw condominiumError;

      // Generate units
      const units = Array.from({ length: totalUnits }, (_, i) => ({
        unit_number: String(i + 1).padStart(3, "0"),
        condominium_id: condominiumData.id,
      }));

      const { error: unitsError } = await supabase
        .from("units")
        .insert(units);

      if (unitsError) {
        console.error("Error creating units:", unitsError);
        // Don't throw - condominium was created successfully
      }

      // Get current user for onboarding progress
      const { data: { user } } = await supabase.auth.getUser();
      
      // Mark first condominium step as complete in onboarding
      if (user) {
        await supabase
          .from("onboarding_progress")
          .upsert({
            user_id: user.id,
            completed_steps: ['create-condominium', 'create-units'],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }

      toast({
        title: "Condomínio criado com sucesso!",
        description: `${formData.name} foi cadastrado com ${totalUnits} unidades.`,
      });

      // Mark that first condominium is now created - prevents redirect loop
      setNeedsFirstCondominium(false);

      // Refresh condominiums list and select the new one
      await refreshCondominiums();
      setSelectedCondominiumId(condominiumData.id);

      // Navigate to dashboard with onboarding flag to trigger tour
      navigate("/dashboard?onboarding=start", { replace: true });
    } catch (error) {
      toast({
        title: "Erro ao criar condomínio",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-gold-400/30 rounded-full" />
      <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-gold-500/20 rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-gold-300/20 rounded-full" />

      <Card className="w-full max-w-md border-gold-200/50 dark:border-gold-800/30 shadow-2xl shadow-gold-500/10 bg-card/95 backdrop-blur-sm animate-fade-in">
        <CardHeader className="space-y-6 px-6 sm:px-8 pt-8 pb-2">
          {/* Logo with Glow Effect */}
          <div className="flex justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gold-400/10 rounded-full blur-2xl" />
            </div>
            <img 
              src={galliLogo} 
              alt="Galli Administradora" 
              className="h-20 sm:h-28 object-contain relative z-10 drop-shadow-lg" 
            />
          </div>
          
          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-gold-500">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium">Parabéns!</span>
              <Sparkles className="h-5 w-5" />
            </div>
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              {organizationName ? (
                <>
                  <span className="font-semibold text-foreground">{organizationName}</span> foi criada com sucesso!
                </>
              ) : (
                "Sua organização foi criada com sucesso!"
              )}
            </CardDescription>
            <p className="text-sm text-muted-foreground/80">
              Agora, cadastre seu primeiro condomínio para começar a usar o sistema.
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Condominium Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground/90">
                Nome do Condomínio *
              </Label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Residencial das Flores"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.name ? 'border-destructive' : ''
                  }`}
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  aria-invalid={!!errors.name}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Address Field */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-foreground/90">
                Endereço
              </Label>
              <div className="relative group">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="address"
                  type="text"
                  placeholder="Ex: Rua das Palmeiras, 123 - Centro"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.address ? 'border-destructive' : ''
                  }`}
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  aria-invalid={!!errors.address}
                />
              </div>
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>

            {/* Total Units Field */}
            <div className="space-y-2">
              <Label htmlFor="total_units" className="text-sm font-medium text-foreground/90">
                Quantidade de Unidades *
              </Label>
              <div className="relative group">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="total_units"
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="Ex: 50"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.total_units ? 'border-destructive' : ''
                  }`}
                  value={formData.total_units}
                  onChange={(e) => updateField('total_units', e.target.value)}
                  required
                  aria-invalid={!!errors.total_units}
                />
              </div>
              {errors.total_units && (
                <p className="text-sm text-destructive">{errors.total_units}</p>
              )}
              <p className="text-xs text-muted-foreground/70">
                As unidades serão geradas automaticamente (001, 002, 003...).
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 transition-all duration-300 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando condomínio...
                  </>
                ) : (
                  <>
                    Cadastrar e Acessar Sistema
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border/40">
            <p className="text-center text-sm text-muted-foreground/70">
              Você poderá adicionar mais condomínios depois nas configurações.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Decorative Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
    </div>
  );
};

export default FirstCondominiumSetup;
