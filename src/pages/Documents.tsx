import { useState, useMemo } from "react";
import { FileText, Upload, Trash2, Download, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useDocuments, DocumentFormData } from "@/hooks/useDocuments";
import { useCondominium } from "@/contexts/CondominiumContext";
import DashboardLayout from "@/components/DashboardLayout";
import PageHeader from "@/components/PageHeader";
import PageLoadingSpinner from "@/components/PageLoadingSpinner";
import StatsCard from "@/components/StatsCard";
import DataTableHeader from "@/components/DataTableHeader";
import EmptyState from "@/components/EmptyState";
import TableSkeleton from "@/components/TableSkeleton";
import StatsCardSkeleton from "@/components/StatsCardSkeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import ResponsiveDataView from "@/components/ResponsiveDataView";
import { MobileDataCard, MobileDataRow, MobileDataHeader, MobileDataActions } from "@/components/MobileDataCard";

const CATEGORIES = [
  { value: 'ata', label: 'Ata de Reunião' },
  { value: 'regimento', label: 'Regimento Interno' },
  { value: 'convencao', label: 'Convenção' },
  { value: 'comunicado', label: 'Comunicado' },
  { value: 'manual', label: 'Manual' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'outro', label: 'Outro' },
];

export default function Documents() {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { selectedCondominiumId, condominiums, isAdmin: isCondoAdmin } = useCondominium();
  const { documents, isLoading, uploading, refetch, uploadDocument, deleteDocument } = useDocuments();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<DocumentFormData & { file: File | null }>({
    condominium_id: selectedCondominiumId || '',
    title: '',
    description: '',
    category: 'outro',
    is_public: true,
    file: null
  });

  // Filter documents by selected condominium
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    // Filter by condominium for admin
    if (isCondoAdmin && selectedCondominiumId) {
      filtered = filtered.filter(doc => doc.condominium_id === selectedCondominiumId);
    }
    
    // Apply search and category filters
    return filtered.filter(doc => {
      const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.condominiums?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, filterCategory, selectedCondominiumId, isCondoAdmin]);

  // Stats
  const stats = useMemo(() => ({
    total: documents.length,
    atas: documents.filter(d => d.category === 'ata').length,
    regimentos: documents.filter(d => d.category === 'regimento' || d.category === 'convencao').length,
    publicos: documents.filter(d => d.is_public).length
  }), [documents]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Apenas arquivos PDF são permitidos",
          variant: "destructive"
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "O arquivo não pode exceder 10MB",
          variant: "destructive"
        });
        return;
      }
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async () => {
    const condoId = formData.condominium_id || selectedCondominiumId;
    
    if (!formData.file || !condoId || !formData.title) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const result = await uploadDocument(formData.file, {
      condominium_id: condoId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      is_public: formData.is_public
    });

    if (result) {
      setIsUploadDialogOpen(false);
      setFormData({
        condominium_id: selectedCondominiumId || '',
        title: '',
        description: '',
        category: 'outro',
        is_public: true,
        file: null
      });
    }
  };

  const handleDelete = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteDocument(documentToDelete);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSpinner message="Carregando documentos..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Biblioteca de Documentos"
        description="Gerencie atas, regimentos, convenções e outros documentos do condomínio"
        count={documents.length}
        countLabel="documentos"
        actions={
          isAdmin() && (
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Novo Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload de Documento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!selectedCondominiumId && (
                    <div>
                      <Label>Condomínio *</Label>
                      <Select
                        value={formData.condominium_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, condominium_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o condomínio" />
                        </SelectTrigger>
                        <SelectContent>
                          {condominiums.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Título *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Ata da Assembleia - Janeiro 2024"
                    />
                  </div>

                  <div>
                    <Label>Categoria *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional do documento"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Arquivo PDF *</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {formData.file && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formData.file.name} ({formatFileSize(formData.file.size)})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                    />
                    <Label>Visível para moradores</Label>
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar Documento
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          <StatsCardSkeleton count={4} />
        ) : (
          <>
            <StatsCard
              icon={FileText}
              value={stats.total}
              title="Total de Documentos"
            />
            <StatsCard
              icon={FileText}
              value={stats.atas}
              title="Atas de Reunião"
            />
            <StatsCard
              icon={FileText}
              value={stats.regimentos}
              title="Regimentos/Convenções"
            />
            <StatsCard
              icon={FileText}
              value={stats.publicos}
              title="Visíveis para Moradores"
            />
          </>
        )}
      </div>

      {/* Filters */}
      <DataTableHeader
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por título, arquivo ou condomínio..."
        onRefresh={refetch}
        resultCount={filteredDocuments.length}
        filters={
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Content */}
      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento encontrado"
          description={searchTerm || filterCategory !== 'all' 
            ? "Tente ajustar os filtros de busca" 
            : "Comece adicionando documentos à biblioteca"
          }
          actionLabel={isAdmin() ? "Adicionar Documento" : undefined}
          onAction={isAdmin() ? () => setIsUploadDialogOpen(true) : undefined}
        />
      ) : (
        <ResponsiveDataView
          desktopView={
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc, index) => (
                    <TableRow 
                      key={doc.id}
                      className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(doc.category)}</Badge>
                      </TableCell>
                      <TableCell>{doc.condominiums?.name || '-'}</TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>
                        <Badge variant={doc.is_public ? "default" : "outline"}>
                          {doc.is_public ? "Público" : "Restrito"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.file_url, '_blank')}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(doc.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
          mobileView={
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <MobileDataCard key={doc.id}>
                  <MobileDataHeader
                    avatar={
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    }
                    title={doc.title}
                    subtitle={doc.file_name}
                    badge={<Badge variant="secondary">{getCategoryLabel(doc.category)}</Badge>}
                  />
                  <MobileDataRow label="Condomínio" value={doc.condominiums?.name || '-'} />
                  <MobileDataRow label="Tamanho" value={formatFileSize(doc.file_size)} />
                  <MobileDataRow 
                    label="Acesso" 
                    value={
                      <Badge variant={doc.is_public ? "default" : "outline"}>
                        {doc.is_public ? "Público" : "Restrito"}
                      </Badge>
                    } 
                  />
                  <MobileDataActions>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                    {isAdmin() && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </MobileDataActions>
                </MobileDataCard>
              ))}
            </div>
          }
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Documento"
        description="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={confirmDelete}
      />
    </div>
    </DashboardLayout>
  );
}
