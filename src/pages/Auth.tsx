import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUserRoleContext } from "@/contexts/UserRoleContext";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import galliLogo from "@/assets/galli-logo.png";
import { loginSchema } from "@/lib/validationSchemas";
import { getErrorMessage } from "@/lib/errorHandler";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRoleContext();

  useEffect(() => {
    if (role && !roleLoading) {
      switch (role) {
        case "morador":
          navigate("/dashboard/resident", { replace: true });
          break;
        case "porteiro":
          navigate("/dashboard/doorkeeper", { replace: true });
          break;
        case "administrador":
        case "sindico":
          navigate("/dashboard", { replace: true });
          break;
      }
    }
  }, [role, roleLoading, navigate]);

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse({ email, password });
    
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as 'email' | 'password';
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      toast({
        title: "Login bem-sucedido",
        description: "Redirecionando...",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gold-400/10 rounded-full blur-2xl" />
            </div>
            <img 
              src={galliLogo} 
              alt="Galli Administradora" 
              className="h-28 sm:h-40 object-contain relative z-10 drop-shadow-lg" 
            />
          </div>
          
          {/* Title */}
          <div className="text-center">
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              Entre com suas credenciais para acessar
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-5">
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  required
                  placeholder="seu@email.com"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.email ? 'border-destructive' : ''
                  }`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
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
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required
                  placeholder="••••••••"
                  className={`pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40 ${
                    errors.password ? 'border-destructive' : ''
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-semibold shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 transition-all duration-300 group"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <p className="text-center text-sm text-muted-foreground/70">
              Não possui acesso?{" "}
              <span className="text-gold-600 dark:text-gold-400 font-medium">
                Solicite ao administrador
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Decorative Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
    </div>
  );
};

export default Auth;
