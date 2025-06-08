"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ProductTableClient } from "./ProductTableClient";
import { CompetitorProductsTable } from "~/components/products/CompetitorProductsTable";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "~/components/ui/dialog";
import { 
  Plus, 
  Package, 
  TrendingUp, 
  Eye,
  AlertCircle,
  Users,
  ArrowLeft,
  Filter,
  X
} from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface UserProduct {
  id: string;
  name: string;
  sku: string;
  yourPrice: number;
  competitors: Array<{ platform: string; price: number; difference: number; }>;
  stock: string;
  sales: number;
  category: string;
  description: string | null;
  matchData: never[];
}

interface CompetitorProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  competitorDomain: string;
  url: string;
  platform: string;
  lastUpdated: string;
}

interface MatchedProduct {
  id: string;
  name: string;
  sku: string;
  yourPrice: number;
  category: string;
  description: string | null;
  matches: Array<{
    competitorDomain: string;
    competitorProduct: {
      name: string;
      price: number;
      currency: string;
      url: string;
      matchScore: number;
      priceDiff: number | null;
    };
  }>;
  competitorCount: number;
  avgCompetitorPrice: number | null;
  pricePosition: 'lower' | 'higher' | 'unknown';
}

interface ProductPageClientProps {
  initialUserProducts: UserProduct[];
  initialCompetitorProducts: CompetitorProduct[];
  initialMatchedProducts: MatchedProduct[];
}

export function ProductPageClient({ 
  initialUserProducts, 
  initialCompetitorProducts,
  initialMatchedProducts
}: ProductPageClientProps) {
  const searchParams = useSearchParams();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ?? 'your-products');
  const [competitorFilter, setCompetitorFilter] = useState(searchParams.get('competitor') ?? '');
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    category: '',
    description: '',
  });

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    const competitor = searchParams.get('competitor');
    if (tab) setActiveTab(tab);
    if (competitor) setCompetitorFilter(competitor);
  }, [searchParams]);

  // Filter products based on competitor
  const filteredMatchedProducts = competitorFilter 
    ? initialMatchedProducts.filter(product => 
        product.matches.some(match => 
          match.competitorDomain.toLowerCase().includes(competitorFilter.toLowerCase())
        )
      )
    : initialMatchedProducts;

  const filteredCompetitorProducts = competitorFilter
    ? initialCompetitorProducts.filter(product =>
        product.competitorDomain.toLowerCase().includes(competitorFilter.toLowerCase())
      )
    : initialCompetitorProducts;

  // Get unique competitors for filter dropdown
  const uniqueCompetitors = Array.from(new Set([
    ...initialMatchedProducts.flatMap(p => p.matches.map(m => m.competitorDomain)),
    ...initialCompetitorProducts.map(p => p.competitorDomain)
  ]));

  const utils = api.useUtils();
  const addProductMutation = api.competitor.addProduct.useMutation({
    onSuccess: () => {
      toast.success('Product added successfully!');
      setIsAddProductOpen(false);
      setNewProduct({
        name: '',
        sku: '',
        price: '',
        category: '',
        description: '',
      });
      void utils.competitor.getProducts.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to add product: ${error.message}`);
    },
  });

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.price || !newProduct.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    const price = parseFloat(newProduct.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    addProductMutation.mutate({
      name: newProduct.name,
      sku: newProduct.sku,
      price: price,
      category: newProduct.category,
      description: newProduct.description || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/competitors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitors
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" asChild>
            <Link href="/competitors">
              <Users className="h-4 w-4 mr-2" />
              Manage Competitors
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog and monitor competitor pricing
            </p>
            {competitorFilter && (
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">Filtered by: </span>
                <Badge variant="secondary">{competitorFilter}</Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Competitor Filter */}
            {uniqueCompetitors.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={competitorFilter} onValueChange={setCompetitorFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by competitor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All competitors</SelectItem>
                    {uniqueCompetitors.map(competitor => (
                      <SelectItem key={competitor} value={competitor}>
                        {competitor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {competitorFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setCompetitorFilter('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
                         )}
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your catalog for competitor monitoring.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., Double Bed Room"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  placeholder="e.g., DBR-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="e.g., 299.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={newProduct.category} 
                  onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="tours">Tours & Activities</SelectItem>
                    <SelectItem value="meals">Meals & Dining</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="packages">Packages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Optional product description..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddProduct} 
                disabled={addProductMutation.isPending}
              >
                {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialUserProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Active product listings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitor Products</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialCompetitorProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Tracked competitor offerings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Products</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialMatchedProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Products with competitor matches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="your-products">
            Your Products ({initialUserProducts.length})
          </TabsTrigger>
          <TabsTrigger value="matched-products">
            Matched Products ({filteredMatchedProducts.length})
            {competitorFilter && ` • Filtered`}
          </TabsTrigger>
          <TabsTrigger value="competitor-products">
            Competitor Products ({filteredCompetitorProducts.length})
            {competitorFilter && ` • Filtered`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="your-products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Product Catalog</CardTitle>
              <CardDescription>
                Manage your products and monitor competitor pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {initialUserProducts.length > 0 ? (
                <ProductTableClient products={initialUserProducts.map((product, index) => ({
                  ...product,
                  id: index + 1,
                  matchData: []
                }))} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    Add your first product to start monitoring competitor pricing and gain market insights.
                  </p>
                  <Button onClick={() => setIsAddProductOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matched-products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matched Products</CardTitle>
              <CardDescription>
                Products you sell that have direct competitor matches with price comparisons
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredMatchedProducts.length > 0 ? (
                <div className="space-y-4 p-6">
                  {filteredMatchedProducts.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-lg font-bold">${product.yourPrice.toFixed(2)}</span>
                            {product.avgCompetitorPrice && (
                              <>
                                <span className="text-muted-foreground">vs</span>
                                <span className="text-lg">${product.avgCompetitorPrice.toFixed(2)} avg</span>
                                <Badge variant={product.pricePosition === 'lower' ? 'default' : 'secondary'}>
                                  {product.pricePosition === 'lower' ? 'Lower Price' : 'Higher Price'}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {product.competitorCount} competitor{product.competitorCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Competitor Matches:</h4>
                        <div className="grid gap-2">
                          {product.matches.map((match, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-md">
                              <div className="flex-1">
                                <p className="font-medium">{match.competitorProduct.name}</p>
                                <p className="text-sm text-muted-foreground">{match.competitorDomain}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${match.competitorProduct.price.toFixed(2)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {Math.round(match.competitorProduct.matchScore * 100)}% match
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : competitorFilter ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matches for this competitor</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    No products found matching &quot;{competitorFilter}&quot;. Try adjusting your filter or exploring all competitors.
                  </p>
                  <Button variant="outline" onClick={() => setCompetitorFilter('')}>
                    Clear Filter
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matched products yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    Run competitor discovery to find products that match between you and your competitors.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitor-products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Products</CardTitle>
              <CardDescription>
                Explore products offered by your competitors that you don&apos;t currently sell
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredCompetitorProducts.length === 0 && competitorFilter ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No competitor products found</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    No products found for &quot;{competitorFilter}&quot;. Try adjusting your filter or viewing all competitors.
                  </p>
                  <Button variant="outline" onClick={() => setCompetitorFilter('')}>
                    Clear Filter
                  </Button>
                </div>
              ) : (
                <CompetitorProductsTable products={filteredCompetitorProducts} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 