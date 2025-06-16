
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ImportModal } from "~/components/shared/ImportModal";
import { Upload, Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  description: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
}

export function AddProductModal({ isOpen, onClose, onAddProduct }: AddProductModalProps) {
  const [activeTab, setActiveTab] = useState("single");
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    category: "electronics",
    description: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // Simple validation
    if (!formData.name || !formData.sku || !formData.price) {
      // Show error
      return;
    }

    onAddProduct({
      ...formData,
      id: `PROD-${Math.floor(Math.random() * 10000)}`,
      price: parseFloat(formData.price)
    });

    // Reset form and close
    setFormData({
      name: "",
      sku: "",
      price: "",
      category: "electronics",
      description: ""
    });
    onClose();
  };

  const handleImport = (importedProducts: Product[]) => {
    // Handle the imported products
    console.log("Imported products:", importedProducts);
    setShowImportModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Add a new product to track pricing across competitor platforms
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="single">Single Product</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="py-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      placeholder="e.g. Wireless Headphones" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU / Product ID</Label>
                    <Input 
                      id="sku" 
                      name="sku" 
                      value={formData.sku} 
                      onChange={handleChange} 
                      placeholder="e.g. WH-1000XM4" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Your Price ($)</Label>
                    <Input 
                      id="price" 
                      name="price" 
                      type="number" 
                      value={formData.price} 
                      onChange={handleChange} 
                      placeholder="e.g. 299.99" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => handleSelectChange("category", value)}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="home">Home & Kitchen</SelectItem>
                        <SelectItem value="beauty">Beauty & Personal Care</SelectItem>
                        <SelectItem value="sports">Sports & Outdoors</SelectItem>
                        <SelectItem value="toys">Toys & Games</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input 
                    id="description" 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange} 
                    placeholder="Brief description of the product" 
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="py-4">
              <div className="text-center py-8">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Bulk Import Products</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Upload a CSV or Excel file with multiple products
                </p>
                <Button onClick={() => setShowImportModal(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File to Import
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {activeTab === "single" && (
              <Button onClick={handleSubmit}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)} 
        type="products"
        onImport={handleImport}
      />
    </>
  );
}
