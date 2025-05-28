'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useRouter } from 'next/navigation';
import { Building2, Link2, Users2, Key } from 'lucide-react';
import { Progress } from '~/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Controller } from 'react-hook-form';
import { toast } from 'sonner';

const fullSchema = z
  .object({
    companyDomain: z.string().url({ message: 'Valid company domain required' }),
    productCatalog: z.string().url().optional().or(z.literal('')),
    competitor1: z.string().optional().default(''),
    competitor2: z.string().optional().default(''),
    competitor3: z.string().optional().default(''),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
  })
  .refine(
    (data) =>
      !(data.apiKey && !data.apiSecret) && !(data.apiKey && data.apiSecret),
    {
      message: 'Both API fields must be filled or left empty',
      path: ['apiSecret'],
    },
  );

type FullForm = z.infer<typeof fullSchema>;

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
  } = useForm<FullForm>({
    resolver: zodResolver(fullSchema),
    mode: 'onChange',
    defaultValues: {
      businessType: undefined,
    },
  });

  const steps = [
    { title: 'Company Details', icon: Building2 },
    { title: 'Competitors', icon: Users2 },
    { title: 'Integration', icon: Key },
  ];

  const onNext = async (data: FullForm) => {
    if (step < 2) {
      const fields: (keyof FullForm)[] =
        step === 0
          ? ['companyDomain', 'productCatalog', 'businessType']
          : ['competitor1', 'competitor2', 'competitor3'];
      const valid = await trigger(fields);
      if (!valid) return;
      setStep(step + 1);
    } else {
      try {
        setIsLoading(true);
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('Failed to complete onboarding');
        }
        
        const result = await response.json();

        if (result.success) {
          // Trigger initial competitor analysis if applicable
          if (data.competitor1) {
            await fetch('/api/competitor-initial');
          }
          
          toast.success('Setup complete!', {
            description: 'Your account has been set up successfully.',
          });
          
          router.refresh();
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Onboarding error:', error);
        toast.error('Setup failed', {
          description: 'There was an error completing your setup.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8">
          <h1 className="mb-2 text-center text-3xl font-bold">Welcome to Sagelytics</h1>
          <p className="text-center text-muted-foreground">Let&apos;s get your account set up</p>
        </div>

        <div className="mb-8">
          <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
          <div className="mt-4 flex justify-between">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 ${i === step ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[step]?.title}</CardTitle>
            <CardDescription>
              {step === 0 && 'Enter your company information'}
              {step === 1 && 'Add your main competitors'}
              {step === 2 && 'Set up your integrations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onNext)} className="space-y-6">
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>Business Type</Label>
                    <Controller
                      name="businessType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
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
                      )}
                    />
                    {errors.businessType && (
                      <p className="mt-1 text-sm text-destructive">{errors.businessType.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Company Domain</Label>
                    <div className="flex">
                      <Input {...register('companyDomain')} placeholder="https://yourcompany.com" />
                      <Button type="button" variant="ghost" size="icon" className="ml-2">
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.companyDomain && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.companyDomain.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Product Catalog URL</Label>
                    <Input
                      {...register('productCatalog', {
                        required: 'Product catalog URL is required',
                      })}
                      placeholder="https://docs.google.com/spreadsheets/..."
                    />
                    {errors.productCatalog && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.productCatalog.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  {[1, 2, 3].map((num) => (
                    <div key={num}>
                      <Label>Top Competitor #{num}</Label>
                      <Input
                        {...register(`competitor${num}` as keyof FullForm)}
                        placeholder="https://competitor.com"
                      />
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>API Key (Optional)</Label>
                    <Input {...register('apiKey')} placeholder="Enter your API key" />
                  </div>
                  <div>
                    <Label>API Secret (Optional)</Label>
                    <Input {...register('apiSecret')} type="password" />
                    {errors.apiSecret && (
                      <p className="mt-1 text-sm text-destructive">{errors.apiSecret.message}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={step === 0}
                >
                  Back
                </Button>
                <Button type="submit">{step === 2 ? 'Complete Setup' : 'Continue'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
