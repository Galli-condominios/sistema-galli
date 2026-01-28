import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Database, Server, Zap, AlertTriangle } from "lucide-react";

const OwnerSettings = () => {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <PageHeader
            title="Configurações Globais"
            description="Configurações de nível de sistema"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <CardTitle>Segurança</CardTitle>
              </div>
              <CardDescription>Configurações de segurança do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">RLS Policies</p>
                  <p className="text-sm text-muted-foreground">Row Level Security ativo</p>
                </div>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Multi-tenancy</p>
                  <p className="text-sm text-muted-foreground">Isolamento por organização</p>
                </div>
                <Badge variant="default" className="bg-green-500">Configurado</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Rate Limiting</p>
                  <p className="text-sm text-muted-foreground">Proteção contra abuso</p>
                </div>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Database Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                <CardTitle>Banco de Dados</CardTitle>
              </div>
              <CardDescription>Informações do banco de dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Provider</p>
                  <p className="text-sm text-muted-foreground">PostgreSQL Cloud</p>
                </div>
                <Badge variant="outline">Cloud</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Região</p>
                  <p className="text-sm text-muted-foreground">South America (São Paulo)</p>
                </div>
                <Badge variant="secondary">sa-east-1</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">Operacional</p>
                </div>
                <Badge variant="default" className="bg-green-500">Online</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Edge Functions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-orange-500" />
                <CardTitle>Backend Functions</CardTitle>
              </div>
              <CardDescription>Funções serverless do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">ai-assistant</span>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">create-user</span>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">process-monthly-charges</span>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">fetch-system-logs</span>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Features */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle>Recursos</CardTitle>
              </div>
              <CardDescription>Funcionalidades do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Assistente IA</p>
                  <p className="text-sm text-muted-foreground">GPT integrado</p>
                </div>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Notificações Realtime</p>
                  <p className="text-sm text-muted-foreground">Websockets</p>
                </div>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">PWA</p>
                  <p className="text-sm text-muted-foreground">App instalável</p>
                </div>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Cache IndexedDB</p>
                  <p className="text-sm text-muted-foreground">Persistência offline</p>
                </div>
                <Badge variant="default" className="bg-green-500">Ativo</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning */}
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Atenção</p>
                <p className="text-sm text-muted-foreground">
                  Alterações nas configurações globais afetam todo o sistema. Tenha certeza antes de fazer mudanças.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default OwnerSettings;
