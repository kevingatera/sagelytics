'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useToast } from '~/components/ui/use-toast';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Badge } from '~/components/ui/badge';
import { 
  Building2, 
  Package, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit3,
  Search,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  description?: string;
}

interface ApiProduct {
  id: string;
  name: string;
  sku: string;
  yourPrice: number;
  competitors: { platform: string; price: number; difference: number; }[];
  stock: string;
  sales: number;
  category: string;
  description: string | null;
  matchData: {
    name: string;
    url: string;
    price: number;
    currency: string;
    matchedProducts: {
      name: string;
      url: string;
      matchScore: number;
      priceDiff: number | null;
    }[];
    lastUpdated: string;
  }[];
}

export function SettingsBusiness() {
  const { status } = useSession();
  const router = useRouter();
  const { toast: toastHook } = useToast();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      toastHook({
        title: 'Session expired',
        description: 'Please log in again to continue.',
        variant: 'destructive',
      });
      router.push('/login');
    }
  }, [status, router, toastHook]);

  // Get onboarding data (business details)
  const { data: onboardingData, isLoading: isOnboardingLoading, refetch: refetchOnboarding } = api.user.getOnboarding.useQuery(undefined, {
    enabled: status === 'authenticated'
  });
  
  // Get products
  const { data: products, isLoading: isProductsLoading, refetch: refetchProducts } = api.competitor.getProducts.useQuery(undefined, {
    enabled: status === 'authenticated'
  });

  // Mutations
  const updateBusinessDetails = api.user.updateBusinessDetails.useMutation();
  const addProduct = api.competitor.addProduct.useMutation();
  const updateProduct = api.competitor.updateProduct.useMutation();
  const deleteProduct = api.competitor.deleteProduct.useMutation();
  const triggerDiscovery = api.competitor.rediscover.useMutation();
  const resetOnboarding = api.user.resetOnboarding.useMutation();

  // Local state
  const [isBusinessLoading, setIsBusinessLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [businessForm, setBusinessForm] = useState({
    companyDomain: '',
    productCatalogUrl: '',
    businessType: '',
    identifiedCompetitors: [] as string[],
  });

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    category: '',
    description: '',
  });

  // Additional state for reset confirmation
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Update form when data loads
  useEffect(() => {
    if (onboardingData) {
      // Ensure identifiedCompetitors is always an array
      const competitors = Array.isArray(onboardingData.identifiedCompetitors) 
        ? onboardingData.identifiedCompetitors 
        : onboardingData.identifiedCompetitors 
          ? [onboardingData.identifiedCompetitors].flat() // Handle string or nested arrays
          : [];

      setBusinessForm({
        companyDomain: onboardingData.companyDomain ?? '',
        productCatalogUrl: onboardingData.productCatalogUrl ?? '',
        businessType: onboardingData.businessType ?? '',
        identifiedCompetitors: competitors,
      });
    }
  }, [onboardingData]);

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBusinessForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBusinessTypeChange = (value: string) => {
    setBusinessForm(prev => ({ ...prev, businessType: value }));
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusinessLoading(true);
    try {
      // Validate business type before submission
      if (!['ecommerce', 'saas', 'marketplace', 'other'].includes(businessForm.businessType)) {
        toast.error('Please select a valid business type');
        return;
      }
      
      await updateBusinessDetails.mutateAsync({
        ...businessForm,
        businessType: businessForm.businessType as 'ecommerce' | 'saas' | 'marketplace' | 'other',
      });
      toast.success('Business details updated successfully');
      await refetchOnboarding();
    } catch {
      toast.error('Failed to update business details');
    } finally {
      setIsBusinessLoading(false);
    }
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProductForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProductCategoryChange = (value: string) => {
    setProductForm(prev => ({ ...prev, category: value }));
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          ...productForm,
          price: parseFloat(productForm.price),
        });
        toast.success('Product updated successfully');
        setEditingProduct(null);
      } else {
        await addProduct.mutateAsync({
          ...productForm,
          price: parseFloat(productForm.price),
        });
        toast.success('Product added successfully');
        setShowAddProduct(false);
      }
      setProductForm({ name: '', sku: '', price: '', category: '', description: '' });
      await refetchProducts();
    } catch {
      toast.error(editingProduct ? 'Failed to update product' : 'Failed to add product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct.mutateAsync({ id });
      toast.success('Product deleted successfully');
      await refetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleEditProduct = (product: ApiProduct) => {
    const editProduct: Product = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.yourPrice,
      category: product.category,
      description: product.description ?? '',
    };
    setEditingProduct(editProduct);
    setProductForm({
      name: editProduct.name,
      sku: editProduct.sku,
      price: editProduct.price.toString(),
      category: editProduct.category,
      description: editProduct.description ?? '',
    });
    setShowAddProduct(true);
  };

  const handleTriggerDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const result = await triggerDiscovery.mutateAsync();
      toast.success(`Discovery completed! Found ${result.stats.totalDiscovered} competitors`);
      await refetchOnboarding();
    } catch {
      toast.error('Failed to trigger discovery');
    } finally {
      setIsDiscovering(false);
    }
  };

  const removeCompetitor = (index: number) => {
    setBusinessForm(prev => ({
      ...prev,
      identifiedCompetitors: prev.identifiedCompetitors.filter((_, i) => i !== index)
    }));
  };

  const addCompetitor = () => {
    const newCompetitor = prompt('Enter competitor domain:');
    if (newCompetitor && !businessForm.identifiedCompetitors.includes(newCompetitor)) {
      setBusinessForm(prev => ({
        ...prev,
        identifiedCompetitors: [...prev.identifiedCompetitors, newCompetitor]
      }));
    }
  };

  const handleResetOnboarding = async () => {
    if (resetConfirmation !== 'confirm') {
      toast.error('Please type the confirmation text exactly as shown');
      return;
    }

    setIsResetting(true);
    try {
      await resetOnboarding.mutateAsync({ confirmationText: resetConfirmation });
      toast.success('Setup reset successfully. Redirecting to onboarding...');
      
      // Redirect to onboarding after a short delay
      setTimeout(() => {
        router.push('/onboarding');
      }, 1500);
    } catch {
      toast.error('Failed to reset setup. Please try again.');
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
      setResetConfirmation('');
    }
  };

  // Show loading state or redirect when not authenticated
  if (status === 'loading' || isOnboardingLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Details
          </CardTitle>
          <CardDescription>
            Manage your company information and competitor tracking settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBusinessSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyDomain">Company Domain</Label>
                <Input
                  id="companyDomain"
                  name="companyDomain"
                  value={businessForm.companyDomain}
                  onChange={handleBusinessChange}
                  placeholder="https://yourcompany.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Select value={businessForm.businessType} onValueChange={handleBusinessTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productCatalogUrl">Product Catalog URL</Label>
              <Input
                id="productCatalogUrl"
                name="productCatalogUrl"
                value={businessForm.productCatalogUrl}
                onChange={handleBusinessChange}
                placeholder="https://docs.google.com/spreadsheets/..."
              />
            </div>

            <div className="space-y-2">
              <Label>Known Competitors</Label>
              <div className="space-y-2">
                {businessForm.identifiedCompetitors.map((competitor, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={competitor} readOnly className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeCompetitor(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addCompetitor}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Competitor
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={isBusinessLoading}>
              {isBusinessLoading ? 'Saving...' : 'Save Business Details'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Discovery & Rediscovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Competitor Discovery
          </CardTitle>
          <CardDescription>
            Trigger automatic competitor discovery and product matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h3 className="font-medium">Rediscover Competitors</h3>
                <p className="text-sm text-muted-foreground">
                  Scan for new competitors and update existing competitor data
                </p>
              </div>
              <Button 
                onClick={handleTriggerDiscovery} 
                disabled={isDiscovering}
                className="flex items-center gap-2"
              >
                {isDiscovering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isDiscovering ? 'Discovering...' : 'Start Discovery'}
              </Button>
            </div>
            
            {onboardingData?.identifiedCompetitors && Array.isArray(onboardingData.identifiedCompetitors) && (
              <div className="space-y-2">
                <Label>Current Competitors ({onboardingData.identifiedCompetitors.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {onboardingData.identifiedCompetitors.map((competitor: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Management
          </CardTitle>
          <CardDescription>
            Add, edit, and manage your product catalog for competitor tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Products</h3>
              <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ name: '', sku: '', price: '', category: '', description: '' });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription>
                      {editingProduct ? 'Update product details' : 'Add a new product to your catalog'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={productForm.name}
                          onChange={handleProductChange}
                          placeholder="e.g. Wireless Headphones"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          name="sku"
                          value={productForm.sku}
                          onChange={handleProductChange}
                          placeholder="e.g. WH-1000XM4"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={handleProductChange}
                          placeholder="299.99"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={productForm.category} onValueChange={handleProductCategoryChange}>
                          <SelectTrigger>
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={productForm.description}
                        onChange={handleProductChange}
                        placeholder="Product description..."
                        rows={3}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {isProductsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : products && products.length > 0 ? (
                products.map((product: ApiProduct) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>SKU: {product.sku}</span>
                        <span>${product.yourPrice}</span>
                        <Badge variant="outline">Product</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.competitors.length} competitor(s) • {product.sales} sales
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p>No products added yet. Add your first product to start tracking.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Onboarding */}
      <Card data-danger-zone>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-500">Reset Setup</span>
          </CardTitle>
          <CardDescription>
            Start over with a fresh setup. This will clear your current configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">What gets reset:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Business details and settings</li>
                <li>• Competitor connections</li>
                <li>• Product catalog configuration</li>
                <li>• Discovery preferences</li>
              </ul>
            </div>
            
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reset Setup
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-500">Reset Setup</DialogTitle>
                  <DialogDescription>
                    This will clear your current setup and take you back to the onboarding flow.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirmReset">
                      Type <code className="font-mono">confirm</code> to proceed:
                    </Label>
                    <Input
                      id="confirmReset"
                      value={resetConfirmation}
                      onChange={(e) => setResetConfirmation(e.target.value)}
                      placeholder="confirm"
                      className="font-mono"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowResetDialog(false);
                      setResetConfirmation('');
                    }}
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleResetOnboarding}
                    disabled={resetConfirmation !== 'confirm' || isResetting}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Setup'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 