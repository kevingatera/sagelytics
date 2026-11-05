'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { useToast } from '~/components/ui/use-toast';
import { api } from '~/trpc/react';

export function SettingsNotifications() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    enablePriceAlerts: true,
    enableCompetitorUpdates: true,
    enableMarketInsights: true,
    enableBillingUpdates: true,
    schedule: 'instant' as 'instant' | 'daily' | 'weekly',
  });

  const { data: userSettings, isLoading: isLoadingSettings } = api.notifications.getSettings.useQuery();
  const updateSettingsMutation = api.notifications.updateSettings.useMutation();

  // Update local state when user settings are loaded
  useEffect(() => {
    if (userSettings) {
      setSettings({
        enablePriceAlerts: userSettings.enablePriceAlerts ?? true,
        enableCompetitorUpdates: userSettings.enableCompetitorUpdates ?? true,
        enableMarketInsights: userSettings.enableMarketInsights ?? true,
        enableBillingUpdates: userSettings.enableBillingUpdates ?? true,
        schedule: (userSettings.schedule as 'instant' | 'daily' | 'weekly') ?? 'instant',
      });
    }
  }, [userSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync(settings);
      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Choose what updates you want to receive via email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="price-alerts">Price Alerts</Label>
              <Switch 
                id="price-alerts" 
                checked={settings.enablePriceAlerts}
                onCheckedChange={(checked) => handleSwitchChange('enablePriceAlerts', checked)}
                disabled={isLoadingSettings || updateSettingsMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="competitor-updates">Competitor Updates</Label>
              <Switch 
                id="competitor-updates" 
                checked={settings.enableCompetitorUpdates}
                onCheckedChange={(checked) => handleSwitchChange('enableCompetitorUpdates', checked)}
                disabled={isLoadingSettings || updateSettingsMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="market-insights">Market Insights</Label>
              <Switch 
                id="market-insights" 
                checked={settings.enableMarketInsights}
                onCheckedChange={(checked) => handleSwitchChange('enableMarketInsights', checked)}
                disabled={isLoadingSettings || updateSettingsMutation.isPending}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="billing-updates">Billing Updates</Label>
              <Switch 
                id="billing-updates" 
                checked={settings.enableBillingUpdates}
                onCheckedChange={(checked) => handleSwitchChange('enableBillingUpdates', checked)}
                disabled={isLoadingSettings || updateSettingsMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Schedule</CardTitle>
            <CardDescription>
              Set your preferred notification delivery schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="daily-digest">Daily Digest</Label>
              <Switch id="daily-digest" defaultChecked />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="weekly-summary">Weekly Summary</Label>
              <Switch id="weekly-summary" defaultChecked />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="instant-alerts">Instant Alerts</Label>
              <Switch id="instant-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
} 