import Link from 'next/link';
import { ArrowRight, BarChart2, Check, Globe, LineChart, Lock, Shield, ShoppingCart } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Navigation } from '~/components/navigation';
import { ThemeToggle } from '~/components/theme-toggle';

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-4 px-6 bg-background">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-xl">Sagelytics</h1>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="outline">Log In</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-background to-accent py-20 flex-1">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Monitor Competitors.
                <span className="block text-primary">Optimize Pricing.</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-lg">
                Gain a competitive edge with real-time price monitoring across major marketplaces and direct competitor websites.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    See How It Works
                  </Button>
                </a>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="absolute -top-6 -left-6 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl"></div>
              <div className="absolute -bottom-8 -right-8 w-80 h-80 bg-primary/10 rounded-full filter blur-3xl"></div>
              <div className="relative z-10 bg-card p-6 rounded-2xl shadow-xl border">
                <img 
                  src="/dashboard-preview.png" 
                  alt="Dashboard Preview" 
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Powerful Features</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Everything you need to stay ahead of the competition and optimize your pricing strategy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <ShoppingCart className="h-10 w-10 text-primary" />,
                title: "Marketplace Monitoring",
                description: "Track prices across Amazon, eBay, Walmart, and other major marketplaces in real-time."
              },
              {
                icon: <Globe className="h-10 w-10 text-primary" />,
                title: "Direct Website Tracking",
                description: "Monitor competitors' websites directly, even small shops without marketplace presence."
              },
              {
                icon: <BarChart2 className="h-10 w-10 text-primary" />,
                title: "AI Price Analysis",
                description: "Get AI-powered recommendations to optimize your pricing for maximum profitability."
              },
              {
                icon: <LineChart className="h-10 w-10 text-primary" />,
                title: "Trend Detection",
                description: "Identify pricing patterns and market trends to stay ahead of the competition."
              },
              {
                icon: <Shield className="h-10 w-10 text-primary" />,
                title: "Alerts & Notifications",
                description: "Receive instant alerts when competitors change prices or new products are detected."
              },
              {
                icon: <Lock className="h-10 w-10 text-primary" />,
                title: "Secure & Private",
                description: "Your data is always secure and private with our advanced encryption technology."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-card p-6 rounded-xl border hover:shadow-md transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-accent">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Get started in just a few simple steps and begin optimizing your pricing strategy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Add Your Products",
                description: "Import your product catalog or add items manually to start tracking."
              },
              {
                step: "2",
                title: "Connect Competitors",
                description: "Identify competitors across marketplaces or direct websites for monitoring."
              },
              {
                step: "3",
                title: "Optimize Pricing",
                description: "Receive AI-powered insights and adjust your pricing strategy for maximum profits."
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-medium mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that&apos;s right for your business needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: "Starter",
                price: "$49",
                description: "Perfect for small businesses just getting started",
                features: [
                  "Monitor up to 25 products",
                  "3 competitor websites",
                  "Daily price updates",
                  "Basic AI insights",
                  "Email alerts"
                ]
              },
              {
                title: "Professional",
                price: "$99",
                description: "For growing businesses with multiple products",
                features: [
                  "Monitor up to 100 products",
                  "10 competitor websites",
                  "Real-time price updates",
                  "Advanced AI insights",
                  "SMS & email alerts",
                  "API access"
                ],
                popular: true
              },
              {
                title: "Enterprise",
                price: "$199",
                description: "For large businesses with complex needs",
                features: [
                  "Unlimited products",
                  "Unlimited competitors",
                  "Real-time price updates",
                  "Custom AI algorithms",
                  "Priority support",
                  "Advanced reporting",
                  "White-label options"
                ]
              }
            ].map((plan, index) => (
              <div key={index} className={`bg-card rounded-xl border p-6 ${plan.popular ? "border-primary shadow-lg relative" : ""}`}>
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.title}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button 
                    variant={plan.popular ? "default" : "outline"} 
                    className="w-full"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-accent border-t">
        <div className="container mx-auto px-6">
          <div className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Sagelytics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
