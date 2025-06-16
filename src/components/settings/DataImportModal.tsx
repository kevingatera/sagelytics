'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Checkbox } from '~/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { 
  FileSpreadsheet, 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Download,
  FileText,
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { toast } from 'sonner';
import type { DataType } from './DataImportExportClient';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: DataType;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportPreview {
  totalRows: number;
  validRows: number;
  errors: ImportError[];
  sampleData: Record<string, unknown>[];
}

export function DataImportModal({ isOpen, onClose, dataType }: DataImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importTab, setImportTab] = useState<string>('upload');
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'preview' | 'success' | 'error'>('idle');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx' | 'json'>('csv');

  const getDataTypeConfig = (type: DataType) => {
    const configs = {
      products: {
        title: 'Products',
        templateFields: ['name', 'sku', 'price', 'category', 'description', 'stock'],
        requiredFields: ['name', 'sku', 'price'],
        templateUrl: '/templates/products-template.csv',
        description: 'Import your product catalog with SKUs, prices, and inventory levels.',
      },
      competitors: {
        title: 'Competitors',
        templateFields: ['domain', 'name', 'industry', 'notes'],
        requiredFields: ['domain'],
        templateUrl: '/templates/competitors-template.csv',
        description: 'Add competitor domains and business information.',
      },
      sales: {
        title: 'Sales Data',
        templateFields: ['date', 'product_sku', 'quantity', 'revenue', 'platform'],
        requiredFields: ['date', 'product_sku', 'quantity', 'revenue'],
        templateUrl: '/templates/sales-template.csv',
        description: 'Import historical sales data and performance metrics.',
      },
      inventory: {
        title: 'Inventory',
        templateFields: ['sku', 'quantity', 'location', 'last_updated'],
        requiredFields: ['sku', 'quantity'],
        templateUrl: '/templates/inventory-template.csv',
        description: 'Import current stock levels and inventory data.',
      },
    };
    return configs[type];
  };

  const config = getDataTypeConfig(dataType);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0] ?? null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0] ?? null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setImportStatus('processing');

    // Simulate file parsing and validation
    setTimeout(() => {
      const mockPreview: ImportPreview = {
        totalRows: 100,
        validRows: 95,
        errors: [
          { row: 2, field: 'price', message: 'Invalid price format' },
          { row: 5, field: 'sku', message: 'SKU already exists' },
          { row: 12, field: 'name', message: 'Product name is required' },
          { row: 25, field: 'price', message: 'Price must be positive' },
          { row: 38, field: 'category', message: 'Invalid category' },
        ],
        sampleData: Array(5).fill(0).map((_, i) => ({
          name: `Sample ${config.title} ${i + 1}`,
          sku: `SKU-${1000 + i}`,
          price: (Math.random() * 100 + 10).toFixed(2),
          category: 'electronics',
          description: `Description for ${config.title.toLowerCase()} ${i + 1}`,
        })),
      };
      setPreview(mockPreview);
      setImportStatus('preview');
    }, 2000);
  };

  const handleImport = async () => {
    setImportStatus('processing');

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('type', dataType);
      formData.append('format', selectedFormat);
      formData.append('overwrite', overwriteExisting.toString());

      const response = await fetch('/api/data/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      setImportStatus('success');
      toast.success(`${config.title} imported successfully`, {
        description: `Imported ${result.imported} records with ${result.errors} errors.`,
      });

      setTimeout(() => {
        onClose();
        resetModal();
      }, 2000);
    } catch (error) {
      setImportStatus('error');
      toast.error(`Failed to import ${config.title.toLowerCase()}`);
    }
  };

  const resetModal = () => {
    setFile(null);
    setImportStatus('idle');
    setPreview(null);
    setImportTab('upload');
    setOverwriteExisting(false);
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = config.templateUrl;
    a.download = `${dataType}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={importTab} onValueChange={setImportTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="template">Get Template</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="py-4 space-y-4">
            {importStatus === 'idle' && (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/20'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {!file ? (
                    <>
                      <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your file here
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Supports .csv, .xlsx, .xls, and .json files (max 10MB)
                      </p>
                      <div className="relative">
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls,.json"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Label htmlFor="file-upload" asChild>
                          <Button variant="outline" className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            Browse Files
                          </Button>
                        </Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileCheck className="mx-auto h-10 w-10 text-primary mb-2" />
                      <p className="font-medium mb-1">{file.name}</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {(file.size / 1024).toFixed(2)} KB • {file.type || 'Unknown type'}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setFile(null)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handlePreview}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Preview & Validate
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="format">File Format</Label>
                    <Select value={selectedFormat} onValueChange={(value: 'csv' | 'xlsx' | 'json') => setSelectedFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="overwrite" 
                        checked={overwriteExisting}
                        onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)}
                      />
                      <Label htmlFor="overwrite" className="text-sm">
                        Overwrite existing records
                      </Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {importStatus === 'processing' && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="font-medium">
                  {importStatus === 'processing' && importTab === 'upload' ? 'Validating your file...' : 'Importing data...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
              </div>
            )}

            {importStatus === 'preview' && preview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Import Preview</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {preview.totalRows} rows
                    </Badge>
                    <Badge variant={preview.errors.length > 0 ? "destructive" : "default"}>
                      {preview.validRows} valid
                    </Badge>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        {preview.errors.length} Validation Errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {preview.errors.slice(0, 5).map((error, i) => (
                          <div key={i} className="text-xs bg-destructive/10 p-2 rounded">
                            <span className="font-medium">Row {error.row}:</span> {error.message} ({error.field})
                          </div>
                        ))}
                        {preview.errors.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            And {preview.errors.length - 5} more errors...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sample Data</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs font-mono bg-muted p-2 rounded max-h-32 overflow-y-auto">
                      {preview.sampleData.slice(0, 3).map((row, i) => (
                        <div key={i} className="mb-1">
                          {JSON.stringify(row, null, 2)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportStatus('idle')}>
                    Back to Upload
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={preview.validRows === 0}
                    className="flex-1"
                  >
                    Import {preview.validRows} Valid Records
                  </Button>
                </div>
              </div>
            )}

            {importStatus === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-medium text-lg">Import Successful!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your {config.title.toLowerCase()} have been imported
                </p>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="font-medium text-lg">Import Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  There was an error processing your file
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setImportStatus('idle')}>
                  Try Again
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="template" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Download Template</CardTitle>
                <CardDescription>
                  Use our template to ensure your data is formatted correctly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Required Fields</h4>
                  <div className="flex flex-wrap gap-2">
                    {config.requiredFields.map((field) => (
                      <Badge key={field} variant="destructive">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Optional Fields</h4>
                  <div className="flex flex-wrap gap-2">
                    {config.templateFields
                      .filter(field => !config.requiredFields.includes(field))
                      .map((field) => (
                        <Badge key={field} variant="outline">
                          {field}
                        </Badge>
                      ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button onClick={downloadTemplate} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/docs/data-import" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Docs
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 