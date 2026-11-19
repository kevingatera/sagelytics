import Link from 'next/link';
import { ArrowRight, BarChart2, Globe, LineChart, Lock, Search, Shield } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/theme-toggle';

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-4 px-4 sm:px-6 bg-background">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Sagelytics</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <nav className="hidden md:flex gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Button asChild variant="outline" size="sm" className="sm:h-10 sm:px-4">
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild size="sm" className="sm:h-10 sm:px-4">
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-background to-accent py-20 flex-1">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Monitor Competitors.
                <span className="block text-primary">Optimize Pricing.</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-lg">
                Find the competitors that matter to your business and track the prices they list on their own websites.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/register">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href="#how-it-works">See How It Works</a>
                </Button>
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
                icon: <Search className="h-10 w-10 text-primary" />,
                title: "Competitor Discovery",
                description: "Start from your own domain and get a list of likely competitors to review."
              },
              {
                icon: <Globe className="h-10 w-10 text-primary" />,
                title: "Website Price Tracking",
                description: "Monitor product pages on competitors' own websites on a schedule you choose."
              },
              {
                icon: <BarChart2 className="h-10 w-10 text-primary" />,
                title: "AI Price Analysis",
                description: "Match competitor products to yours and compare the prices side by side."
              },
              {
                icon: <LineChart className="h-10 w-10 text-primary" />,
                title: "Trend Detection",
                description: "See how competitor prices move over time from the prices monitoring records."
              },
              {
                icon: <Shield className="h-10 w-10 text-primary" />,
                title: "Alerts & Notifications",
                description: "Get alerted when a monitored price moves past the threshold you set."
              },
              {
                icon: <Lock className="h-10 w-10 text-primary" />,
                title: "Private to Your Account",
                description: "Your products, competitors and analysis are scoped to your account."
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
                description: "Review suggested competitors or add their websites yourself."
              },
              {
                step: "3",
                title: "Track Prices",
                description: "Monitor competitor product pages and compare their prices with yours."
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
