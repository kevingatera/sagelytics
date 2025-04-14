import { Navigation } from '~/components/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white dark:from-blue-900 dark:to-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <header className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold text-blue-600 dark:text-blue-400">Sagelytics</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            AI-Powered Pricing Strategy Platform
          </p>
        </header>

        <main>
          <section className="mb-16">
            <h2 className="mb-8 text-center text-3xl font-semibold text-gray-800 dark:text-gray-200">
              Stop guessing, start knowing
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Multi-platform Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Track prices across Amazon, Walmart, eBay, and Shopify in real-time.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Get predictive margin optimization and competitor strategy analysis.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>LLM-Generated Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Receive automated strategy memos and natural language insights.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="text-center">
            <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
              Ready to boost your margins by 15-40%?
            </h2>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </section>
        </main>

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          © 2025 Sagelytics. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
