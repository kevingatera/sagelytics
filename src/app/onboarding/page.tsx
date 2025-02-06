"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { useRouter } from "next/navigation"

const companySchema = z.object({
  companyDomain: z.string().url().min(1),
  productCatalog: z.string().url().min(1)
})

const competitorsSchema = z.object({
  competitor1: z.string().min(1),
  competitor2: z.string().min(1),
  competitor3: z.string().min(1)
})

const productsSchema = z.object({
  asins: z.string().min(1)
})

const apiSchema = z.object({
  apiKey: z.string().optional(),
  apiSecret: z.string().optional()
})

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(
      step === 1 ? companySchema :
      step === 2 ? competitorsSchema :
      step === 3 ? productsSchema :
      apiSchema
    )
  })

  const handleNext = async (data: unknown) => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      await fetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center">Sagelytics Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-8">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <div 
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center 
                    ${num <= step ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Company Domain</Label>
                  <Input
                    {...register("companyDomain")}
                    placeholder="https://yourcompany.com"
                  />
                  {errors.companyDomain && (
                    <p className="text-red-500 text-sm mt-1">
                      Valid company domain required
                    </p>
                  )}
                </div>
                <div>
                  <Label>Product Catalog URL</Label>
                  <Input
                    {...register("productCatalog")}
                    placeholder="https://docs.google.com/spreadsheets/..."
                  />
                  {errors.productCatalog && (
                    <p className="text-red-500 text-sm mt-1">
                      Valid product catalog URL required
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Top Competitor #1</Label>
                  <Input
                    {...register("competitor1")}
                    placeholder="Competitor website or store URL"
                  />
                </div>
                <div>
                  <Label>Top Competitor #2</Label>
                  <Input
                    {...register("competitor2")}
                    placeholder="Competitor website or store URL"
                  />
                </div>
                <div>
                  <Label>Top Competitor #3</Label>
                  <Input
                    {...register("competitor3")}
                    placeholder="Competitor website or store URL"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Product Identifiers</Label>
                  <Input
                    {...register("asins")}
                    placeholder="ASINs, SKUs, or product IDs (comma separated)"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    We'll automatically match these to competitor products
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>Inventory API Key (Optional)</Label>
                  <Input
                    {...register("apiKey")}
                    placeholder="Shopify/WooCommerce API key"
                  />
                </div>
                <div>
                  <Label>API Secret (Optional)</Label>
                  <Input
                    {...register("apiSecret")}
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <Button type="submit">
                {step === 4 ? 'Complete Setup' : 'Next'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 