import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, User, Building2, ArrowRight, Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import galliLogo from "@/assets/galli-logo.png";
import { adminSetupSchema } from "@/lib/validationSchemas";
import { getErrorMessage } from "@/lib/errorHandler";

type FormErrors = {
  organizationName?: string;
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const AdminSetup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    organizationName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Password strength indicators
  const passwordChecks = {
    minLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const validateForm = (): boolean => {
    const result = adminSetupSchema.safeParse(formData);
    
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

    setIsLoading(true);

    try {
      // Create the user with admin role
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName.trim(),
            role: "administrador",
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Generate unique slug
        const baseSlug = generateSlug(formData.organizationName);
        const timestamp = Date.now().toString(36);
        const slug = `${baseSlug}-${timestamp}`;

        // Create the organization
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: formData.organizationName.trim(),
            slug: slug,
            owner_id: authData.user.id,
            plan: "free",
            max_condominiums: 3,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Add user as organization member with owner role
        const { error: memberError } = await supabase
          .from("user_organization_members")
          .insert({
            user_id: authData.user.id,
            organization_id: orgData.id,
            role: "owner",
          });

        if (memberError) throw memberError;

        toast({
          title: "Conta criada com sucesso!",
          description: `Organização "${formData.organizationName}" criada. Agora, cadastre seu primeiro condomínio.`,
        });
        
        // Keep user logged in and redirect to first condominium setup
        navigate("/onboarding/first-condominium", { replace: true });
      }
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

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs ${valid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      {valid ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </div>
  );

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
          
          {/* Title */}
          <div className="text-center">
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              Configure sua organização e conta de administrador
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Name Field */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-medium text-foreground/90">
                Nome da Organização
              </Label>
              <div className="relative group">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Ex: Administradora XYZ"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.organizationName ? 'border-destructive' : ''
                  }`}
                  value={formData.organizationName}
                  onChange={(e) => updateField('organizationName', e.target.value)}
                  required
                  aria-invalid={!!errors.organizationName}
                />
              </div>
              {errors.organizationName && (
                <p className="text-sm text-destructive">{errors.organizationName}</p>
              )}
            </div>

            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground/90">
                Seu Nome Completo
              </Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Digite seu nome completo"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.fullName ? 'border-destructive' : ''
                  }`}
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  required
                  aria-invalid={!!errors.fullName}
                />
              </div>
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                E-mail
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@exemplo.com"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.email ? 'border-destructive' : ''
                  }`}
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                Senha
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Crie uma senha forte"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.password ? 'border-destructive' : ''
                  }`}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                  aria-invalid={!!errors.password}
                />
              </div>
              {formData.password && (
                <div className="grid grid-cols-2 gap-1 pt-1">
                  <PasswordCheck valid={passwordChecks.minLength} label="8+ caracteres" />
                  <PasswordCheck valid={passwordChecks.hasUppercase} label="Maiúscula" />
                  <PasswordCheck valid={passwordChecks.hasLowercase} label="Minúscula" />
                  <PasswordCheck valid={passwordChecks.hasNumber} label="Número" />
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/90">
                Confirmar Senha
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-gold-500 transition-colors duration-200" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.confirmPassword ? 'border-destructive' : ''
                  }`}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  required
                  aria-invalid={!!errors.confirmPassword}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 transition-all duration-300 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    Criar Organização
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </div>

            {/* Back to Login Button */}
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 text-muted-foreground hover:text-foreground group"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Voltar para Login
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-border/40">
            <p className="text-center text-sm text-muted-foreground/70">
              Cada organização possui seu próprio banco de dados isolado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Decorative Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
    </div>
  );
};

export default AdminSetup;
