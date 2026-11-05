'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '~/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  MoreHorizontal,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface ImportExportRecord {
  id: string;
  type: 'import' | 'export';
  dataType: 'products' | 'competitors' | 'sales' | 'inventory';
  status: 'success' | 'error' | 'processing';
  recordsProcessed: number;
  errorCount: number;
  fileName: string;
  fileSize: number;
  format: 'csv' | 'xlsx' | 'json';
  createdAt: string;
  completedAt?: string;
  errorDetails?: string[];
}

export function ImportHistoryTable() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'import' | 'export'>('all');

  // Mock data - in real implementation, this would come from tRPC query
  const records: ImportExportRecord[] = [
    {
      id: '1',
      type: 'import',
      dataType: 'products',
      status: 'success',
      recordsProcessed: 150,
      errorCount: 3,
      fileName: 'products-import-2024-01-15.csv',
      fileSize: 25600,
      format: 'csv',
      createdAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:32:00Z',
    },
    {
      id: '2',
      type: 'export',
      dataType: 'competitors',
      status: 'success',
      recordsProcessed: 5,
      errorCount: 0,
      fileName: 'competitors-export-2024-01-14.xlsx',
      fileSize: 12800,
      format: 'xlsx',
      createdAt: '2024-01-14T15:45:00Z',
      completedAt: '2024-01-14T15:45:30Z',
    },
    {
      id: '3',
      type: 'import',
      dataType: 'sales',
      status: 'error',
      recordsProcessed: 0,
      errorCount: 1,
      fileName: 'sales-data-2024-01-12.csv',
      fileSize: 48200,
      format: 'csv',
      createdAt: '2024-01-12T09:15:00Z',
      errorDetails: ['Invalid date format in row 1', 'Missing required field: product_sku'],
    },
    {
      id: '4',
      type: 'export',
      dataType: 'products',
      status: 'success',
      recordsProcessed: 45,
      errorCount: 0,
      fileName: 'products-full-export-2024-01-10.json',
      fileSize: 156800,
      format: 'json',
      createdAt: '2024-01-10T14:20:00Z',
      completedAt: '2024-01-10T14:21:00Z',
    },
    {
      id: '5',
      type: 'import',
      dataType: 'competitors',
      status: 'processing',
      recordsProcessed: 0,
      errorCount: 0,
      fileName: 'new-competitors-2024-01-16.csv',
      fileSize: 5120,
      format: 'csv',
      createdAt: '2024-01-16T11:00:00Z',
    },
  ];

  const filteredRecords = records.filter(record => {
    if (selectedFilter === 'all') return true;
    return record.type === selectedFilter;
  });

  const getStatusIcon = (status: ImportExportRecord['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ImportExportRecord['status']) => {
    const variants = {
      success: 'default' as const,
      error: 'destructive' as const,
      processing: 'secondary' as const,
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const formatDataType = (dataType: string) => {
    return dataType.charAt(0).toUpperCase() + dataType.slice(1);
  };

  const handleDownload = (record: ImportExportRecord) => {
    // In real implementation, this would download the file
    console.log('Downloading:', record.fileName);
  };

  const handleRetry = (record: ImportExportRecord) => {
    // In real implementation, this would retry the import/export
    console.log('Retrying:', record.id);
  };

  const handleDelete = (record: ImportExportRecord) => {
    // In real implementation, this would delete the record
    console.log('Deleting:', record.id);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Import/Export History</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('all')}
            >
              All
            </Button>
            <Button
              variant={selectedFilter === 'import' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('import')}
            >
              Imports
            </Button>
            <Button
              variant={selectedFilter === 'export' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('export')}
            >
              Exports
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredRecords.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {record.type === 'import' ? (
                        <div className="p-1 bg-blue-100 rounded">
                          <Download className="h-3 w-3 text-blue-600 rotate-180" />
                        </div>
                      ) : (
                        <div className="p-1 bg-green-100 rounded">
                          <Download className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                      <span className="capitalize font-medium">{record.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{formatDataType(record.dataType)}</div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {record.format}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-mono text-sm truncate max-w-[200px]" title={record.fileName}>
                        {record.fileName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(record.fileSize)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      {getStatusBadge(record.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {record.recordsProcessed.toLocaleString()}
                      </div>
                      {record.errorCount > 0 && (
                        <div className="text-xs text-red-500">
                          {record.errorCount} errors
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">
                        {format(new Date(record.createdAt), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.createdAt), 'HH:mm')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {record.status === 'success' && record.type === 'export' && (
                          <DropdownMenuItem onClick={() => handleDownload(record)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download File
                          </DropdownMenuItem>
                        )}
                        {record.status === 'error' && (
                          <DropdownMenuItem onClick={() => handleRetry(record)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(record)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No {selectedFilter === 'all' ? 'import/export' : selectedFilter} history found
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 