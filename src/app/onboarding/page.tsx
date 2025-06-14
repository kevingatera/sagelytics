'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useRouter } from 'next/navigation';
import { Building2, Link2, Users2, Key, CheckCircle, AlertCircle, Clock, Loader2, Circle } from 'lucide-react';
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
import type { ProgressUpdate } from '~/lib/services/progress-service';

interface ProgressEvent {
  type: 'progress' | 'connected' | 'error';
  sessionId?: string;
  step?: string;
  percentage?: number;
  message?: string;
  timestamp?: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

interface OnboardingResponse {
  success: boolean;
  sessionId?: string;
  message?: string;
}

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

// Helper function to get percentage for each step
const getStepPercentage = (step: string): number => {
  const stepMap: Record<string, number> = {
    initialization: 5,
    saving_data: 10,
    starting_analysis: 15,
    analyzing_domain: 20,
    fetching_website: 25,
    analyzing_products: 35,
    discovering_competitors: 60,
    analyzing_competitors: 75,
    processing_results: 85,
    storing_competitors: 90,
    finalizing: 95,
    complete: 100,
    error: 0,
  };
  return stepMap[step] ?? 0;
};

const getStepDisplayName = (step: string): string => {
  const stepNames: Record<string, string> = {
    initialization: 'Starting setup process',
    saving_data: 'Saving business information',
    starting_analysis: 'Connecting to analysis service',
    analyzing_domain: 'Analyzing your domain',
    fetching_website: 'Fetching website content',
    analyzing_products: 'Analyzing product catalog',
    discovering_competitors: 'Discovering competitors with AI',
    analyzing_competitors: 'Analyzing competitor data',
    processing_results: 'Processing results',
    storing_competitors: 'Storing competitor data',
    finalizing: 'Finalizing setup',
    complete: 'Setup complete',
    error: 'Error occurred',
  };
  return stepNames[step] ?? step;
};

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

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

  // Cleanup function for event source
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectToProgressUpdates = (sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('🔌 [Progress] Connecting to progress stream for session:', sessionId);
    const eventSource = new EventSource(`/api/onboarding/progress/${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as ProgressEvent;
        console.log('[Progress] Progress update received:', {
          step: data.step,
          percentage: data.percentage,
          message: data.message,
          estimatedTimeRemaining: data.estimatedTimeRemaining,
          timestamp: data.timestamp
        });
        
        if (data.type === 'progress') {
          setProgress(data);
          
          // Add step to progress history if it's new
          if (data.step && !progressSteps.includes(data.step)) {
            console.log('[Progress] New step started:', data.step);
            setProgressSteps(prev => [...prev, data.step!]);
          }
          
          // Handle completion
          if (data.step === 'complete') {
            console.log('[Progress] Analysis completed successfully!', {
              message: data.message,
              timestamp: new Date().toISOString()
            });
            setTimeout(() => {
              toast.success('Setup complete!', {
                description: data.message ?? 'Setup completed successfully!',
              });
              router.refresh();
              router.push('/dashboard');
            }, 1500);
          }
          
          // Handle errors
          if (data.step === 'error') {
            console.error('[Progress] Analysis failed:', {
              error: data.error,
              message: data.message,
              timestamp: new Date().toISOString()
            });
            setHasError(true);
            setErrorMessage(data.error ?? 'An unknown error occurred');
            setIsLoading(false);
            setIsAnalyzing(false);
          }
        }
      } catch (error) {
        console.error('❌ [Progress] Failed to parse progress update:', {
          error: error instanceof Error ? error.message : String(error),
          rawEvent: event.data,
          timestamp: new Date().toISOString()
        });
        setHasError(true);
        setErrorMessage('Failed to parse progress update');
      }
    };

    eventSource.onerror = (error) => {
      console.error('[Progress] Stream error:', {
        error,
        sessionId,
        timestamp: new Date().toISOString()
      });
      setHasError(true);
      setErrorMessage('Connection to progress service lost. Please refresh the page.');
      eventSource.close();
    };

    eventSource.onopen = () => {
      console.log('[Progress] Stream connected successfully for session:', sessionId);
      setHasError(false);
      setErrorMessage('');
    };
  };

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
        console.log('[Onboarding] Starting competitor analysis for:', {
          domain: data.companyDomain,
          businessType: data.businessType,
          competitorCount: [data.competitor1, data.competitor2, data.competitor3].filter(Boolean).length,
          hasCatalog: !!data.productCatalog,
          timestamp: new Date().toISOString()
        });

        setIsLoading(true);
        setHasError(false);
        setErrorMessage('');
        
        console.log('📤 [Onboarding] Sending request to /api/onboarding with payload:', {
          companyDomain: data.companyDomain,
          businessType: data.businessType,
          competitors: [data.competitor1, data.competitor2, data.competitor3].filter(Boolean)
        });

        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { message?: string };
          console.error('❌ [Onboarding] API request failed:', {
            status: response.status,
            statusText: response.statusText,
            errorMessage: errorData.message,
            timestamp: new Date().toISOString()
          });
          throw new Error(errorData.message ?? `Server error: ${response.status}`);
        }
        
        const result = await response.json() as OnboardingResponse;
        console.log('[Onboarding] API response received:', {
          success: result.success,
          sessionId: result.sessionId,
          timestamp: new Date().toISOString()
        });

        if (result.success && result.sessionId) {
          console.log('[Onboarding] Starting progress tracking for session:', result.sessionId);
          // Start progress tracking
          setIsAnalyzing(true);
          setProgressSteps([]);
          connectToProgressUpdates(result.sessionId);
          
          // If no competitors provided, will complete immediately
          if (!data.competitor1) {
            console.log('[Onboarding] No competitors provided, completing immediately');
            setTimeout(() => {
              router.refresh();
              router.push('/dashboard');
            }, 2000);
          }
        } else {
          console.error('❌ [Onboarding] Invalid response from server:', result);
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('[Onboarding] Complete setup failed:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setHasError(true);
        setErrorMessage(errorMessage);
        toast.error('Setup failed', {
          description: errorMessage,
        });
        setIsLoading(false);
        setIsAnalyzing(false);
      }
    }
  };

  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
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

        {!isAnalyzing ? (
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
                    disabled={step === 0 || isLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {step === 2 ? 'Complete Setup' : 'Continue'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {hasError ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Setup Failed
                  </>
                ) : (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Setting up your account
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {hasError 
                  ? 'There was an error during setup'
                  : "We're analyzing your business and finding competitors. This may take a few minutes."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasError ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setHasError(false);
                        setErrorMessage('');
                        setIsAnalyzing(false);
                        setIsLoading(false);
                      }}
                      variant="outline"
                    >
                      Go Back
                    </Button>
                    <Button 
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {progress && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{progress.message}</span>
                        <span className="text-muted-foreground">
                          {progress.percentage}%
                          {progress.estimatedTimeRemaining && (
                            <> • About {formatTimeRemaining(progress.estimatedTimeRemaining)} remaining</>
                          )}
                        </span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Progress:</h4>
                    <div className="space-y-1">
                      {[
                        'initialization',
                        'saving_data', 
                        'starting_analysis',
                        'analyzing_domain',
                        'fetching_website',
                        'analyzing_products',
                        'discovering_competitors',
                        'analyzing_competitors',
                        'processing_results',
                        'storing_competitors',
                        'finalizing',
                        'complete'
                      ].map((stepKey) => {
                        const isCompleted = progressSteps.includes(stepKey);
                        const isCurrent = progress?.step === stepKey;
                        
                        return (
                          <div
                            key={stepKey}
                            className={`flex items-center gap-2 text-sm ${
                              isCompleted || isCurrent
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : isCurrent ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                            <span>{getStepDisplayName(stepKey)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
