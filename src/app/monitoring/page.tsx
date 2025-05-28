import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { MonitoringTasksPanel } from '~/components/dashboard/MonitoringTasksPanel';
import { AddMonitoringTaskContainer } from '~/components/monitoring/AddMonitoringTaskContainer';
import { Button } from '~/components/ui/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { auth } from '~/server/auth';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const session = await auth();
  const userId = session?.user?.id ?? '';

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Price Monitoring</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">Active Tasks</TabsTrigger>
          <TabsTrigger value="add">Add New Task</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          <Suspense fallback={<div>Loading monitoring tasks...</div>}>
            <MonitoringTasksPanel />
          </Suspense>
        </TabsContent>
        <TabsContent value="add" className="mt-6">
          <Suspense fallback={<div>Loading form...</div>}>
            <AddMonitoringTaskContainer userId={userId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
} 