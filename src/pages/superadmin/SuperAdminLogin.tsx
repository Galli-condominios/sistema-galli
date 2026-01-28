import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Crown, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import galliLogo from "@/assets/galli-logo.png";
import { toast } from "sonner";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: isCheckingAuth } = useSuperAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      navigate("/superadmin/dashboard", { replace: true });
    }
  }, [isAuthenticated, isCheckingAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("Login realizado com sucesso!");
      navigate("/superadmin/dashboard", { replace: true });
    } else {
      toast.error(result.error || "Erro ao fazer login");
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    );
  }

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
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
              Super Admin
            </h1>
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              Acesso restrito ao painel de administração global
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@galli.com"
                  className="pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40"
                  disabled={isLoading}
                />
              </div>
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-11 h-12 bg-background/50 border-border/60 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all duration-200 placeholder:text-muted-foreground/40"
                  disabled={isLoading}
                />
              </div>
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
              Este acesso é exclusivo para administradores do sistema.
              <br />
              Usuários regulares devem acessar pelo{" "}
              <a href="/auth" className="text-gold-600 dark:text-gold-400 font-medium hover:underline">
                login padrão
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Decorative Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
    </div>
  );
};

export default SuperAdminLogin;
