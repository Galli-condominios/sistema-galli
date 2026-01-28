import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, MessageSquare, Bot, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAIKnowledgeBase, type KnowledgeBaseFormData } from "@/hooks/useAIKnowledgeBase";
import { useCondominium } from "@/contexts/CondominiumContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkFAQImport } from "./BulkFAQImport";
import { AIProviderConfig } from "./AIProviderConfig";

const categoryOptions = [
  { value: "geral", label: "Geral" },
  { value: "areas_comuns", label: "Áreas Comuns" },
  { value: "financeiro", label: "Financeiro" },
  { value: "regras", label: "Regras e Regulamentos" },
  { value: "mudancas", label: "Mudanças" },
  { value: "visitantes", label: "Visitantes" },
  { value: "encomendas", label: "Encomendas" },
  { value: "manutencao", label: "Manutenção" },
  { value: "outro", label: "Outro" }
];

const typeLabels = {
  faq: "Pergunta Frequente",
  rule: "Regra",
  info: "Informação"
};

export function AIConfigurationTab() {
  const { selectedCondominium } = useCondominium();
  const { entries, isLoading, createEntry, updateEntry, deleteEntry, isCreating } = useAIKnowledgeBase();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<KnowledgeBaseFormData>({
    type: "faq",
    question: "",
    answer: "",
    category: "geral",
    is_active: true,
    priority: 0
  });

  const resetForm = () => {
    setFormData({
      type: "faq",
      question: "",
      answer: "",
      category: "geral",
      is_active: true,
      priority: 0
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.answer.trim()) return;
    
    if (editingId) {
      updateEntry({ id: editingId, data: formData });
    } else {
      createEntry({
        ...formData,
        condominium_id: selectedCondominium?.id || null
      });
    }
    resetForm();
  };

  const handleEdit = (entry: any) => {
    setFormData({
      type: entry.type,
      question: entry.question || "",
      answer: entry.answer,
      category: entry.category || "geral",
      is_active: entry.is_active,
      priority: entry.priority || 0
    });
    setEditingId(entry.id);
    setIsAdding(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteEntry(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>FAQs</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Configurações</span>
          </TabsTrigger>
        </TabsList>

        {/* FAQs Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-4 px-3 sm:px-6">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Base de Conhecimento
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Perguntas frequentes para a IA responder
                </CardDescription>
              </div>
              {!isAdding && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <BulkFAQImport />
                  <Button onClick={() => setIsAdding(true)} size="sm" className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sm:inline">Adicionar</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6">
              {/* Add/Edit Form */}
              {isAdding && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-4 space-y-4 px-3 sm:px-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Tipo</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: "faq" | "rule" | "info") => 
                            setFormData(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger className="h-9 sm:h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="faq">Pergunta Frequente</SelectItem>
                            <SelectItem value="rule">Regra</SelectItem>
                            <SelectItem value="info">Informação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Categoria</Label>
                        <Select
                          value={formData.category || "geral"}
                          onValueChange={(value) => 
                            setFormData(prev => ({ ...prev, category: value }))
                          }
                        >
                          <SelectTrigger className="h-9 sm:h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.type === "faq" && (
                      <div className="space-y-2">
                        <Label className="text-sm">Pergunta</Label>
                        <Input
                          placeholder="Ex: Como reservar a churrasqueira?"
                          value={formData.question}
                          onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm">Resposta / Conteúdo</Label>
                      <Textarea
                        placeholder="Digite a resposta ou informação..."
                        value={formData.answer}
                        onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => 
                            setFormData(prev => ({ ...prev, is_active: checked }))
                          }
                        />
                        <Label className="text-sm">Ativo</Label>
                      </div>
                      
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={resetForm} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={!formData.answer.trim() || isCreating} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          {editingId ? "Atualizar" : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Entries List */}
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma FAQ cadastrada ainda.</p>
                  <p className="text-sm">Adicione perguntas frequentes para a IA responder.</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px] sm:h-[400px]">
                  <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
                    {entries.map((entry) => (
                      <Card key={entry.id} className={!entry.is_active ? "opacity-60" : ""}>
                        <CardContent className="p-3 sm:pt-4 sm:px-6">
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                                  {typeLabels[entry.type as keyof typeof typeLabels]}
                                </Badge>
                                {entry.category && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                                    {categoryOptions.find(c => c.value === entry.category)?.label || entry.category}
                                  </Badge>
                                )}
                                {!entry.is_active && (
                                  <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 sm:px-2">Inativo</Badge>
                                )}
                              </div>
                              
                              {entry.question && (
                                <p className="font-medium text-xs sm:text-sm leading-tight">{entry.question}</p>
                              )}
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                {entry.answer}
                              </p>
                            </div>
                            
                            <div className="flex gap-0.5 sm:gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(entry.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4">
          <AIProviderConfig />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir FAQ"
        description="Tem certeza que deseja excluir esta FAQ? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
