'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { CreditCard, Package } from 'lucide-react';

export function SettingsBilling() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Pro Plan</h3>
                  <Badge>Current</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  $49/month • Up to 1,000 products
                </p>
              </div>
              <Button variant="outline">Change Plan</Button>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <Package className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Next billing date</p>
                <p className="text-sm text-muted-foreground">April 1, 2024</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Manage your payment methods and billing information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 04/2025</p>
              </div>
              <Button variant="ghost" size="sm">Edit</Button>
            </div>
            <Button variant="outline">Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your billing history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">March 2024</p>
                <p className="text-sm text-muted-foreground">Pro Plan • $49.00</p>
              </div>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">February 2024</p>
                <p className="text-sm text-muted-foreground">Pro Plan • $49.00</p>
              </div>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">January 2024</p>
                <p className="text-sm text-muted-foreground">Pro Plan • $49.00</p>
              </div>
              <Button variant="ghost" size="sm">Download</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 