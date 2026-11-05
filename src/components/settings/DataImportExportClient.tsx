'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Database, 
  Users, 
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileDown,
  FileUp
} from 'lucide-react';
import { toast } from 'sonner';
import { DataImportModal } from './DataImportModal';
import { DataExportModal } from './DataExportModal';
import { ImportHistoryTable } from './ImportHistoryTable';
import { api } from '~/trpc/react';

export type DataType = 'products' | 'competitors';

interface ImportStats {
  type: DataType;
  count: number;
  lastImport: string | null;
  status: 'success' | 'error' | 'pending' | 'none';
}

interface ExportStats {
  type: DataType;
  count: number;
  lastExport: string | null;
  canExport: boolean;
}

export function DataImportExportClient() {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('products');

  // Get real data from tRPC
  const { data: dataStats, isLoading } = api.competitor.getDataStats.useQuery();

  const importStats: ImportStats[] = [
    { 
      type: 'products', 
      count: dataStats?.products.count ?? 0, 
      lastImport: dataStats?.products.lastImport ?? null, 
      status: dataStats?.products.count ? 'success' : 'none' 
    },
    { 
      type: 'competitors', 
      count: dataStats?.competitors.count ?? 0, 
      lastImport: dataStats?.competitors.lastImport ?? null, 
      status: dataStats?.competitors.count ? 'success' : 'none' 
    },
  ];

  const exportStats: ExportStats[] = [
    { 
      type: 'products', 
      count: dataStats?.products.count ?? 0, 
      lastExport: dataStats?.products.lastImport ?? null, 
      canExport: (dataStats?.products.count ?? 0) > 0 
    },
    { 
      type: 'competitors', 
      count: dataStats?.competitors.count ?? 0, 
      lastExport: dataStats?.competitors.lastImport ?? null, 
      canExport: (dataStats?.competitors.count ?? 0) > 0 
    },
  ];

  const getDataTypeInfo = (type: DataType) => {
    const info = {
      products: {
        title: 'Products',
        description: 'Your product catalog with SKUs, prices, and inventory',
        icon: Package,
        color: 'bg-blue-500',
      },
      competitors: {
        title: 'Competitors',
        description: 'Competitor domains and their product information',
        icon: Users,
        color: 'bg-green-500',
      },
    };
    return info[type];
  };

  const getStatusIcon = (status: ImportStats['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const handleImport = (type: DataType) => {
    setSelectedDataType(type);
    setImportModalOpen(true);
  };

  const handleExport = (type: DataType) => {
    setSelectedDataType(type);
    setExportModalOpen(true);
  };

  const handleQuickExport = async (type: DataType) => {
    try {
      const response = await fetch(`/api/data/export?type=${type}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${getDataTypeInfo(type).title} exported successfully`);
    } catch {
      toast.error(`Failed to export ${getDataTypeInfo(type).title.toLowerCase()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 bg-muted rounded-lg" />
                  <div className="h-4 w-4 bg-muted rounded" />
                </div>
                <div className="h-5 w-24 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-6 w-16 bg-muted rounded" />
                <div className="h-9 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {importStats.map((stat) => {
              const info = getDataTypeInfo(stat.type);
              const Icon = info.icon;
              
              return (
                <Card key={stat.type} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${info.color} bg-opacity-10`}>
                        <Icon className={`h-5 w-5 text-white`} style={{color: info.color.replace('bg-', '').replace('-500', '')}} />
                      </div>
                      {getStatusIcon(stat.status)}
                    </div>
                    <CardTitle className="text-lg">{info.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {info.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Records</span>
                      <Badge variant={stat.count > 0 ? "default" : "secondary"}>
                        {stat.count}
                      </Badge>
                    </div>
                    {stat.lastImport && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Import</span>
                        <span className="text-sm">{stat.lastImport}</span>
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      onClick={() => handleImport(stat.type)}
                      variant={stat.count > 0 ? "outline" : "default"}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {stat.count > 0 ? 'Re-import' : 'Import'} {info.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Import Guidelines</CardTitle>
              <CardDescription>
                Follow these guidelines for successful data imports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Supported Formats</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• CSV files (.csv)</li>
                    <li>• JSON files (.json)</li>
                    <li>• Maximum file size: 10MB</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Requirements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Include all required fields</li>
                    <li>• Ensure data consistency</li>
                    <li>• Validate before importing</li>
                    <li>• Use UTF-8 encoding</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {exportStats.map((stat) => {
              const info = getDataTypeInfo(stat.type);
              const Icon = info.icon;
              
              return (
                <Card key={stat.type} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${info.color} bg-opacity-10`}>
                        <Icon className={`h-5 w-5 text-white`} style={{color: info.color.replace('bg-', '').replace('-500', '')}} />
                      </div>
                      <Badge variant={stat.canExport ? "default" : "secondary"}>
                        {stat.canExport ? 'Ready' : 'No Data'}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{info.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {info.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Records</span>
                      <span className="text-sm font-medium">{stat.count}</span>
                    </div>
                    {stat.lastExport && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Export</span>
                        <span className="text-sm">{stat.lastExport}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={() => handleQuickExport(stat.type)}
                        disabled={!stat.canExport}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Quick Export
                      </Button>
                      <Button 
                        onClick={() => handleExport(stat.type)}
                        disabled={!stat.canExport}
                        size="sm"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Custom
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Choose from different export formats and options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Quick Export</h4>
                  <p className="text-sm text-muted-foreground">
                    Download data immediately in CSV format with all available fields.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Custom Export</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose specific fields and export format (CSV or JSON).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ImportHistoryTable />
        </TabsContent>
      </Tabs>

      <DataImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        dataType={selectedDataType}
      />

      <DataExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        dataType={selectedDataType}
      />
    </div>
  );
} 