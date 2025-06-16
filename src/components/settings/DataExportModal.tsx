'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Input } from '~/components/ui/input';
import { 
  Download, 
  FileSpreadsheet, 
  FileText,
  Database,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '~/lib/utils';
import type { DataType } from './DataImportExportClient';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: DataType;
}

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  filters: Record<string, unknown>;
}

export function DataExportModal({ isOpen, onClose, dataType }: DataExportModalProps) {
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    fields: [],
    dateRange: { from: undefined, to: undefined },
    filters: {},
  });

  const getDataTypeConfig = (type: DataType) => {
    const configs = {
      products: {
        title: 'Products',
        description: 'Export your product catalog with pricing and inventory data.',
        availableFields: [
          { key: 'name', label: 'Product Name', required: true },
          { key: 'sku', label: 'SKU', required: true },
          { key: 'price', label: 'Price', required: false },
          { key: 'category', label: 'Category', required: false },
          { key: 'description', label: 'Description', required: false },
          { key: 'stock', label: 'Stock Level', required: false },
          { key: 'isActive', label: 'Active Status', required: false },
          { key: 'createdAt', label: 'Created Date', required: false },
          { key: 'updatedAt', label: 'Updated Date', required: false },
        ],
        supportsDateRange: true,
        estimatedCount: 45,
      },
      competitors: {
        title: 'Competitors',
        description: 'Export competitor information and analysis data.',
        availableFields: [
          { key: 'domain', label: 'Domain', required: true },
          { key: 'businessName', label: 'Business Name', required: false },
          { key: 'matchScore', label: 'Match Score', required: false },
          { key: 'matchReasons', label: 'Match Reasons', required: false },
          { key: 'dataGaps', label: 'Data Gaps', required: false },
          { key: 'productCount', label: 'Product Count', required: false },
          { key: 'lastAnalyzed', label: 'Last Analyzed', required: false },
        ],
        supportsDateRange: true,
        estimatedCount: 3,
      },
      sales: {
        title: 'Sales Data',
        description: 'Export historical sales data and metrics.',
        availableFields: [
          { key: 'date', label: 'Sale Date', required: true },
          { key: 'productSku', label: 'Product SKU', required: true },
          { key: 'quantity', label: 'Quantity', required: true },
          { key: 'revenue', label: 'Revenue', required: true },
          { key: 'platform', label: 'Platform', required: false },
          { key: 'customer', label: 'Customer', required: false },
          { key: 'region', label: 'Region', required: false },
        ],
        supportsDateRange: true,
        estimatedCount: 0,
      },
      inventory: {
        title: 'Inventory',
        description: 'Export current inventory levels and stock data.',
        availableFields: [
          { key: 'sku', label: 'SKU', required: true },
          { key: 'quantity', label: 'Quantity', required: true },
          { key: 'location', label: 'Location', required: false },
          { key: 'reservedQuantity', label: 'Reserved', required: false },
          { key: 'lastUpdated', label: 'Last Updated', required: false },
          { key: 'minStock', label: 'Min Stock Level', required: false },
          { key: 'maxStock', label: 'Max Stock Level', required: false },
        ],
        supportsDateRange: false,
        estimatedCount: 0,
      },
    };
    return configs[type];
  };

  const config = getDataTypeConfig(dataType);

  // Initialize fields with required ones selected
  useState(() => {
    const requiredFields = config.availableFields
      .filter(field => field.required)
      .map(field => field.key);
    setExportOptions(prev => ({
      ...prev,
      fields: requiredFields,
    }));
  });

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      fields: checked 
        ? [...prev.fields, fieldKey]
        : prev.fields.filter(f => f !== fieldKey)
    }));
  };

  const handleExport = async () => {
    setExportStatus('processing');

    try {
      const exportData = {
        type: dataType,
        ...exportOptions,
      };

      const response = await fetch('/api/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = exportOptions.format === 'xlsx' ? 'xlsx' : exportOptions.format;
      a.download = `${dataType}-export-${timestamp}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportStatus('success');
      toast.success(`${config.title} exported successfully`);

      setTimeout(() => {
        onClose();
        setExportStatus('idle');
      }, 2000);
    } catch (error) {
      setExportStatus('error');
      toast.error(`Failed to export ${config.title.toLowerCase()}`);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
        return <Database className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEstimatedFileSize = () => {
    const baseSize = config.estimatedCount * exportOptions.fields.length * 10; // rough estimate in bytes
    if (baseSize < 1024) return `${baseSize}B`;
    if (baseSize < 1024 * 1024) return `${(baseSize / 1024).toFixed(1)}KB`;
    return `${(baseSize / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export {config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {exportStatus === 'idle' && (
            <>
              {/* Export Format */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Export Format</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {['csv', 'xlsx', 'json'].map((format) => (
                      <div
                        key={format}
                        className={cn(
                          'border rounded-lg p-3 cursor-pointer transition-colors',
                          exportOptions.format === format
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => setExportOptions(prev => ({ ...prev, format: format as ExportOptions['format'] }))}
                      >
                        <div className="flex items-center gap-2">
                          {getFormatIcon(format)}
                          <span className="font-medium text-sm uppercase">{format}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Field Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Fields</CardTitle>
                  <CardDescription>
                    Choose which fields to include in your export
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {config.availableFields.map((field) => (
                      <div key={field.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.key}
                          checked={exportOptions.fields.includes(field.key)}
                          onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                          disabled={field.required}
                        />
                        <Label 
                          htmlFor={field.key} 
                          className={cn(
                            "text-sm",
                            field.required && "font-medium"
                          )}
                        >
                          {field.label}
                          {field.required && <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Date Range (if supported) */}
              {config.supportsDateRange && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Date Range</CardTitle>
                    <CardDescription>
                      Filter data by date range (optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>From Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !exportOptions.dateRange.from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {exportOptions.dateRange.from ? (
                                format(exportOptions.dateRange.from, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={exportOptions.dateRange.from}
                              onSelect={(date) => setExportOptions(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, from: date }
                              }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>To Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !exportOptions.dateRange.to && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {exportOptions.dateRange.to ? (
                                format(exportOptions.dateRange.to, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={exportOptions.dateRange.to}
                              onSelect={(date) => setExportOptions(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, to: date }
                              }))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Export Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Export Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Records:</span>
                    <span className="font-medium">{config.estimatedCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Selected Fields:</span>
                    <span className="font-medium">{exportOptions.fields.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium uppercase">{exportOptions.format}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Size:</span>
                    <span className="font-medium">{getEstimatedFileSize()}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {exportStatus === 'processing' && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
              <p className="font-medium">Preparing your export...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
            </div>
          )}

          {exportStatus === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-medium text-lg">Export Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your {config.title.toLowerCase()} export has been downloaded
              </p>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="font-medium text-lg">Export Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                There was an error creating your export
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setExportStatus('idle')}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {exportStatus === 'idle' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport}
                disabled={exportOptions.fields.length === 0 || config.estimatedCount === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export {config.title}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 