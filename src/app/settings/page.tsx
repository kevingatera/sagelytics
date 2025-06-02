'use client';

import { Suspense, useState } from "react";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { SettingsProfile } from "~/components/settings/SettingsProfile";
import { SettingsBilling } from "~/components/settings/SettingsBilling";
import { SettingsNotifications } from "~/components/settings/SettingsNotifications";
import { SettingsBusiness } from "~/components/settings/SettingsBusiness";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "profile";

  const handleRestartSetup = () => {
    // Simply navigate to business tab
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'business');
    window.history.pushState({}, '', url.toString());
    
    // Trigger tab change
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRestartSetup}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart Setup
              </Button>
            </div>

            <Tabs defaultValue={tab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Suspense fallback={<div>Loading...</div>}>
                  <SettingsProfile />
                </Suspense>
              </TabsContent>

              <TabsContent value="business" className="space-y-6">
                <Suspense fallback={<div>Loading...</div>}>
                  <SettingsBusiness />
                </Suspense>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Suspense fallback={<div>Loading...</div>}>
                  <SettingsBilling />
                </Suspense>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Suspense fallback={<div>Loading...</div>}>
                  <SettingsNotifications />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
} 