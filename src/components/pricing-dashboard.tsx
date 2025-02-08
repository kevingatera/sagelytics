"use client"

import { useState, useEffect } from "react"
import { Bar, Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js"
import { ArrowDown, ArrowUp, DollarSign, Package, ShoppingCart, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { useTheme } from "next-themes"
import { Switch } from "~/components/ui/switch"
import { Label } from "~/components/ui/label"
import { Button } from "~/components/ui/button"
import { signOut, useSession } from "next-auth/react"
import annotationPlugin from 'chartjs-plugin-annotation'
import { api } from "~/trpc/react"
import { useRouter } from "next/navigation"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  annotationPlugin
)

export default function PricingDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedCompetitor, setSelectedCompetitor] = useState("all")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  // Show loading state while checking auth
  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (session && !session.user.onboardingCompleted) {
    router.push("/onboarding")
    return null
  }

  useEffect(() => setMounted(true), [])

  const [result] = api.competitor.get.useSuspenseQuery()
  const { competitors, priceData, insights } = result

  const data = {
    labels: ["January", "February", "March", "April", "May", "June", "July"],
    datasets: [
      {
        label: "Sales",
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Sales Data",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Pricing Strategy Dashboard</h1>
          <div className="flex items-center space-x-4">
            {mounted && (
              <>
                <Label htmlFor="dark-mode-toggle">Dark Mode</Label>
                <Switch
                  id="dark-mode-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
                />
              </>
            )}
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,350</div>
              <p className="text-xs text-muted-foreground">+180 new listings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,234.00</div>
              <p className="text-xs text-muted-foreground">+2.5% from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repricing Actions</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">456</div>
              <p className="text-xs text-muted-foreground">+23% from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Competitors</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{competitors?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active tracking</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Overview of sales performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Competitor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competitors</SelectItem>
                    {competitors?.map((competitor: string) => (
                      <SelectItem key={competitor} value={competitor}>
                        {competitor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="h-[300px] rounded-lg shadow-lg overflow-hidden">
                <Bar data={data} options={options} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pricing Strategy</CardTitle>
              <CardDescription>Adjust your pricing strategy based on market trends.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] rounded-lg shadow-lg overflow-hidden">
                <Line data={data} options={options} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>Pricing recommendations based on market analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {insights?.map((insight: any) => (
                  <li key={insight.product}>
                    <div className="flex items-center">
                      {insight.recommendation === 'increase' ? (
                        <ArrowUp className="text-green-500 dark:text-green-400 mr-2" />
                      ) : insight.recommendation === 'decrease' ? (
                        <ArrowDown className="text-red-500 dark:text-red-400 mr-2" />
                      ) : (
                        <Zap className="text-yellow-500 dark:text-yellow-400 mr-2" />
                      )}
                      <span className="font-semibold">{insight.message}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insight.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Competitor Price Intelligence</h2>
          <Card>
            <CardHeader>
              <CardTitle>Real-time Price Comparison</CardTitle>
              <CardDescription>Your prices vs competitors across platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Line
                  data={priceData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      annotation: {
                        annotations: {
                          priceWarning: {
                            type: 'line',
                            yMin: 100,
                            yMax: 100,
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2,
                            borderDash: [5, 5]
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

