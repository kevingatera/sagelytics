"use client"

import { useState } from "react"
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

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, PointElement)

export default function PricingDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState("all")

  // Mock data for demonstration
  const revenueData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: [12000, 19000, 15000, 22000, 18000, 25000],
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  }

  const competitorPriceData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Your Price",
        data: [100, 105, 102, 108],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        label: "Competitor A",
        data: [98, 103, 106, 105],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "Competitor B",
        data: [102, 100, 104, 106],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 overflow-y-auto bg-gray-800 md:block">
        <div className="px-4 py-4">
          <h2 className="text-lg font-semibold text-white">Pricing Strategy</h2>
          <nav className="mt-5">
            <a href="#" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 rounded">
              Dashboard
            </a>
            <a href="#" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 rounded">
              Competitor Analysis
            </a>
            <a href="#" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 rounded">
              Inventory Management
            </a>
            <a href="#" className="block px-4 py-2 text-gray-300 hover:bg-gray-700 rounded">
              Settings
            </a>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-100">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-semibold text-gray-800">Pricing Strategy Dashboard</h1>

          {/* Key Metrics */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          {/* Multi-platform Monitoring */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Multi-platform Monitoring</h2>
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>Compare your performance across different platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="w-[180px] mb-4">
                    <SelectValue placeholder="Select Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="walmart">Walmart</SelectItem>
                    <SelectItem value="ebay">eBay</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-[300px]">
                  <Bar
                    data={revenueData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Tracking */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Tracking</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alert</CardTitle>
                  <CardDescription>Products that need restocking</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Product A</span>
                      <span className="text-red-500">5 left</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Product B</span>
                      <span className="text-orange-500">12 left</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Product C</span>
                      <span className="text-yellow-500">20 left</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Overstock Warning</CardTitle>
                  <CardDescription>Products with excess inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                      <span>Product X</span>
                      <span className="text-blue-500">150% of target</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Product Y</span>
                      <span className="text-blue-500">130% of target</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Historical Price Trends */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Historical Price Trends</h2>
            <Card>
              <CardHeader>
                <CardTitle>Price Comparison</CardTitle>
                <CardDescription>Your prices vs competitors over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Line
                    data={competitorPriceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">AI-Generated Insights</h2>
            <Card>
              <CardHeader>
                <CardTitle>Pricing Recommendations</CardTitle>
                <CardDescription>AI-powered suggestions for optimal pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li>
                    <div className="flex items-center">
                      <ArrowUp className="text-green-500 mr-2" />
                      <span className="font-semibold">Increase price for Product A</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Competitor prices have risen, and demand remains strong. Consider a 5% increase.
                    </p>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <ArrowDown className="text-red-500 mr-2" />
                      <span className="font-semibold">Decrease price for Product B</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      New competitor entered the market with lower prices. Recommend a 3% decrease to stay competitive.
                    </p>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <Zap className="text-yellow-500 mr-2" />
                      <span className="font-semibold">Dynamic pricing for Product C</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      High demand volatility detected. Implement dynamic pricing strategy based on real-time market
                      data.
                    </p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

