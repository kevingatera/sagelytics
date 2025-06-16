import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FileSpreadsheet, Upload, FileCheck, AlertCircle } from "lucide-react";

interface ImportModalProps<T = unknown> {
  isOpen: boolean;
  onClose: () => void;
  type: "products" | "competitors";
  onImport: (data: T[]) => void;
}

export function ImportModal<T = unknown>({ isOpen, onClose, type, onImport }: ImportModalProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importTab, setImportTab] = useState<string>("upload");
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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
  
  const handleImport = () => {
    if (!file) return;
    
    setImportStatus("processing");
    
    // Simulate processing time
    setTimeout(() => {
      // Simulate successful import
      setImportStatus("success");
      
      // Mock data
      const mockData = type === "products" 
        ? Array(5).fill(0).map((_, i) => ({ 
            id: `PROD-${i+100}`, 
            name: `Imported Product ${i+1}`, 
            sku: `SKU-${Math.floor(Math.random() * 10000)}`,
            price: Math.floor(Math.random() * 100) + 9.99,
            category: "electronics",
            description: `Description for imported product ${i+1}`
          }))
        : Array(3).fill(0).map((_, i) => ({
            id: `COMP-${i+100}`,
            name: `Imported Competitor ${i+1}`,
            website: `https://example-${i+1}.com`,
            products: Math.floor(Math.random() * 100) + 10
          }));
          
      onImport(mockData as T[]);
      
      // Auto close after a delay
      setTimeout(() => {
        onClose();
        setFile(null);
        setImportStatus("idle");
      }, 1500);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import {type === "products" ? "Products" : "Competitors"}</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import {type === "products" ? "products" : "competitors"} in bulk.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={importTab} onValueChange={setImportTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upload">Upload File</TabsTrigger>
            <TabsTrigger value="template">Download Template</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="py-4">
            {importStatus === "idle" && (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-10 text-center ${
                    dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/20"
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
                        Drag and drop your CSV or Excel file here
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Supports .csv, .xlsx, and .xls files
                      </p>
                      <div className="relative">
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
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
                        {(file.size / 1024).toFixed(2)} KB • {file.type || "Unknown type"}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFile(null)}
                      >
                        Change File
                      </Button>
                    </>
                  )}
                </div>
          
                <div className="text-xs text-muted-foreground mt-4">
                  <p className="font-medium">File Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Must be a CSV or Excel file (.csv, .xlsx, .xls)</li>
                    <li>Maximum file size: 10MB</li>
                    <li>Must include all required fields</li>
                    <li>Download the template for the correct format</li>
                  </ul>
                </div>
              </>
            )}
            
            {importStatus === "processing" && (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="font-medium">Processing your file...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
              </div>
            )}
            
            {importStatus === "success" && (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-lg">Import Successful!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your {type === "products" ? "products" : "competitors"} have been imported
                </p>
              </div>
            )}
            
            {importStatus === "error" && (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="font-medium text-lg">Import Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  There was an error processing your file
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setImportStatus("idle")}>
                  Try Again
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="template" className="py-4">
            <div className="border rounded-lg p-6 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-primary mb-4" />
              <h3 className="font-medium mb-1">Download Template File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use this template to format your {type === "products" ? "products" : "competitors"} data correctly
              </p>
              <Button>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              
              <div className="mt-6 border-t pt-4 text-left">
                <p className="font-medium text-sm mb-2">Required Fields:</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                  {type === "products" ? (
                    <>
                      <li>Product Name</li>
                      <li>SKU</li>
                      <li>Price</li>
                      <li>Category</li>
                    </>
                  ) : (
                    <>
                      <li>Competitor Name</li>
                      <li>Website URL</li>
                      <li>Description (optional)</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importStatus === "processing"}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || importStatus !== "idle"}
            className={importStatus === "processing" ? "opacity-80" : ""}
          >
            {importStatus === "processing" ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
