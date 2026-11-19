'use client';

import { Suspense, useCallback, useEffect, useRef } from "react";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { SettingsProfile } from "~/components/settings/SettingsProfile";
import { SettingsNotifications } from "~/components/settings/SettingsNotifications";
import { SettingsBusiness } from "~/components/settings/SettingsBusiness";
import { SettingsBilling } from "~/components/settings/SettingsBilling";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TABS = ["profile", "business", "notifications", "billing"] as const;
type SettingsTab = (typeof TABS)[number];

function toTab(value: string | null): SettingsTab {
  return TABS.find((tab) => tab === value) ?? "profile";
}

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The URL is the source of truth, so ?tab= works on first load, on back/forward and on links.
  const tab = toTab(searchParams.get("tab"));
  const tabListRef = useRef<HTMLDivElement>(null);

  // On narrow screens the tab list scrolls sideways; keep the selected tab visible.
  useEffect(() => {
    const list = tabListRef.current;
    const active = list?.querySelector<HTMLElement>('[data-state="active"]');
    if (!list || !active) return;
    const listBox = list.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    const overflowLeft = activeBox.left - listBox.left;
    const overflowRight = activeBox.right - listBox.right;
    if (overflowLeft < 0) list.scrollLeft += overflowLeft;
    else if (overflowRight > 0) list.scrollLeft += overflowRight;
  }, [tab]);

  const selectTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", toTab(value));
      // One-shot flags such as ?checkout= belong to the tab that received them.
      params.delete("checkout");
      params.delete("session_id");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="bg-background">
      <Sidebar />
      <div className="ml-[4.5rem] md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => selectTab("business")}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart Setup
              </Button>
            </div>

            <Tabs value={tab} onValueChange={selectTab} className="space-y-6">
              <TabsList ref={tabListRef} className="max-w-full justify-start overflow-x-auto">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
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

              <TabsContent value="notifications" className="space-y-6">
                <Suspense fallback={<div>Loading...</div>}>
                  <SettingsNotifications />
                </Suspense>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Suspense fallback={<div>Loading...</div>}>
                  <SettingsBilling />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
