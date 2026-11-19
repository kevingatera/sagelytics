'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { AlertCircle, Clock, Plus } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { MONITORABLE_URL_MESSAGE } from '~/app/api/monitoring-tasks/product-url';
import { rowStatus, suggestCompetitorUrl, type CompetitorOption } from './monitoring-urls';

const monitoringTaskSchema = z.object({
  competitorDomain: z.string().min(1, "Competitor domain is required"),
  frequency: z.string().min(1, "Frequency is required"),
  enabled: z.boolean().default(true),
  productIds: z.array(z.string()).min(1, "At least one product must be selected")
});

type MonitoringTaskFormValues = z.infer<typeof monitoringTaskSchema>;

export type MonitoringTaskSubmission = MonitoringTaskFormValues & {
  /** Competitor product page URL per selected product id. Empty means skip the row. */
  productUrls: Record<string, string>;
};

interface AddMonitoringTaskFormProps {
  competitors: CompetitorOption[];
  products: Array<{ id: string; name: string }>;
  /** Resolves true when the task was created. */
  onSubmit: (values: MonitoringTaskSubmission) => Promise<boolean>;
}

export function AddMonitoringTaskForm({ competitors, products, onSubmit }: AddMonitoringTaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productUrls, setProductUrls] = useState<Record<string, string>>({});

  const form = useForm<MonitoringTaskFormValues>({
    resolver: zodResolver(monitoringTaskSchema),
    defaultValues: {
      competitorDomain: '',
      frequency: '0 */6 * * *', // Every 6 hours by default
      enabled: true,
      productIds: []
    }
  });

  const competitorDomain = form.watch('competitorDomain');
  const selectedCompetitor = competitors.find((c) => c.domain === competitorDomain);

  const suggestedUrl = (domain: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return '';
    const competitor = competitors.find((c) => c.domain === domain);
    return suggestCompetitorUrl(competitor, product.name)?.url ?? '';
  };

  const handleSubmit = async (values: MonitoringTaskFormValues) => {
    setIsSubmitting(true);
    try {
      const created = await onSubmit({ ...values, productUrls });
      if (created) {
        form.reset();
        setSelectedProducts([]);
        setProductUrls({});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeCompetitor = (domain: string) => {
    form.setValue('competitorDomain', domain, { shouldValidate: true });
    // URLs belong to one competitor, so refill every selected row from the new one.
    setProductUrls(
      Object.fromEntries(selectedProducts.map((id) => [id, suggestedUrl(domain, id)])),
    );
  };

  const frequencyOptions = [
    { value: '0 * * * *', label: 'Hourly' },
    { value: '0 */6 * * *', label: 'Every 6 hours' },
    { value: '0 0 * * *', label: 'Daily (midnight)' },
    { value: '0 0 */2 * *', label: 'Every 2 days' },
    { value: '0 0 * * 1', label: 'Weekly (Monday)' }
  ];

  const toggleProduct = (productId: string) => {
    const newSelection = selectedProducts.includes(productId)
      ? selectedProducts.filter(id => id !== productId)
      : [...selectedProducts, productId];

    setSelectedProducts(newSelection);
    form.setValue('productIds', newSelection);
    setProductUrls((prev) => {
      const next = { ...prev };
      if (newSelection.includes(productId)) {
        next[productId] = prev[productId] ?? suggestedUrl(competitorDomain, productId);
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const selectedRows = products.filter((p) => selectedProducts.includes(p.id));
  const rowStatuses = selectedRows.map((p) => ({ product: p, status: rowStatus(productUrls[p.id]) }));
  const readyCount = rowStatuses.filter((r) => r.status.kind === 'ready').length;
  const hasInvalid = rowStatuses.some((r) => r.status.kind === 'invalid');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Monitoring Task</CardTitle>
        <CardDescription>
          Create a new automated price monitoring task for competitor products
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="competitorDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competitor</FormLabel>
                  <Select
                    onValueChange={changeCompetitor}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a competitor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {competitors.map(competitor => (
                        <SelectItem
                          key={competitor.domain}
                          value={competitor.domain}
                        >
                          {competitor.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the competitor whose products you want to monitor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monitoring Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {frequencyOptions.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How often should we check for price changes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enable Monitoring
                    </FormLabel>
                    <FormDescription>
                      Start monitoring immediately after creation
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="productIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Products to Monitor</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {products.length === 0 ? (
                      <div className="col-span-2 p-4 rounded-md bg-muted/50 text-center">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No products available for monitoring</p>
                      </div>
                    ) : (
                      products.map(product => (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent/50 ${
                            selectedProducts.includes(product.id) ? 'border-primary bg-accent' : ''
                          }`}
                          onClick={() => toggleProduct(product.id)}
                        >
                          <span className="text-sm font-medium">{product.name}</span>
                          {selectedProducts.includes(product.id) && (
                            <div className="h-4 w-4 rounded-full bg-primary"></div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <FormDescription>
                    Choose which of your products to monitor for this competitor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRows.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Competitor product pages</p>
                  <p className="text-sm text-muted-foreground">
                    The page on {selectedCompetitor?.domain ?? 'the competitor site'} to check for each product.
                    Pages found during competitor analysis are filled in. Leave a row empty to skip that product.
                  </p>
                </div>
                {rowStatuses.map(({ product, status }) => (
                  <div key={product.id} className="space-y-1">
                    <label htmlFor={`product-url-${product.id}`} className="text-sm font-medium">
                      {product.name}
                    </label>
                    <Input
                      id={`product-url-${product.id}`}
                      type="url"
                      inputMode="url"
                      placeholder="https://competitor.example/products/..."
                      value={productUrls[product.id] ?? ''}
                      onChange={(event) =>
                        setProductUrls((prev) => ({ ...prev, [product.id]: event.target.value }))
                      }
                      disabled={isSubmitting}
                      aria-invalid={status.kind === 'invalid'}
                    />
                    {status.kind === 'invalid' && (
                      <p className="text-xs text-destructive">{MONITORABLE_URL_MESSAGE}</p>
                    )}
                    {status.kind === 'skipped' && (
                      <p className="text-xs text-muted-foreground">
                        No competitor page known for this product. It will be skipped unless you enter a URL.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || products.length === 0 || hasInvalid || (selectedRows.length > 0 && readyCount === 0)}
            >
              {isSubmitting ? (
                <>Creating task...</>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Monitoring Task
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 