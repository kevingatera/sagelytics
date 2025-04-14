'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api } from '~/trpc/react';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { CompetitorManagement } from '~/components/competitor-management';
import { StatsCards } from '~/components/dashboard/stats-cards';
import { SalesOverview } from '~/components/dashboard/sales-overview';
import { PricingStrategy } from '~/components/dashboard/pricing-strategy';
import { AIInsights } from '~/components/dashboard/ai-insights';
import { PriceComparison } from '~/components/dashboard/price-comparison';
import { ProductMatching } from '~/components/dashboard/product-matching';
import type { DashboardData } from '~/lib/types/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { RefreshCw, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

export default function PricingDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const { data: result, error, refetch } = api.competitor.get.useQuery<DashboardData>();
  const { mutate: rediscover, isPending: isRediscovering } = api.competitor.rediscover.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session && !session.user.onboardingCompleted) {
      router.push('/onboarding');
    }
    if (error?.data?.code === 'NOT_FOUND') {
      router.push('/onboarding');
    }
  }, [status, session, error, router]);

  if (status === 'loading' || !result) return <div>Loading...</div>;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Market Watch</h1>
              <p className="mt-2 text-muted-foreground">
                Keep an eye on your competition and stay ahead
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {mounted && (
                <>
                  <Label htmlFor="dark-mode-toggle">Dark Mode</Label>
                  <Switch
                    id="dark-mode-toggle"
                    checked={theme === 'dark'}
                    onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  />
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => rediscover()} disabled={isRediscovering}>
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isRediscovering ? 'animate-spin' : ''}`}
                    />
                    {isRediscovering ? 'Looking for updates...' : 'Check for Updates'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Look for new competitors and price changes</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </div>

          <StatsCards competitors={result.competitors} />

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Quick Overview</TabsTrigger>
              <TabsTrigger value="competitors">Who You&apos;re Up Against</TabsTrigger>
              <TabsTrigger value="pricing">Price Watch</TabsTrigger>
              <TabsTrigger value="insights">Smart Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Sales Performance</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>See how your sales compare across different platforms</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>
                      How you&apos;re doing across different sales channels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SalesOverview data={result} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Price Trends</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Track how prices are changing over time</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Recent price changes in your market</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceComparison priceData={result.priceData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="competitors" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Track Competitors</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add or remove competitors you want to keep an eye on</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Manage your competitor watchlist</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompetitorManagement />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Similar Products</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>See which competitor products match yours</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Products similar to yours</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductMatching competitors={result.competitors} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Pricing Tips</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Get suggestions on how to price your products</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Smart pricing recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PricingStrategy data={result} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Market Prices</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>See how prices are changing across your market</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CardDescription>Price changes and patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PriceComparison priceData={result.priceData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>AI Suggestions</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Get smart recommendations based on market data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription>Smart tips to help you stay competitive</CardDescription>
                </CardHeader>
                <CardContent>
                  <AIInsights insights={result.insights} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
