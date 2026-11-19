import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { MonitoringTasksPanel } from '~/components/dashboard/MonitoringTasksPanel';
import { AddMonitoringTaskContainer } from '~/components/monitoring/AddMonitoringTaskContainer';
import { SetupNextStep } from '~/components/setup/NextStep';
import { redirect } from 'next/navigation';
import { auth } from '~/server/auth';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  return (
    <div className="container py-6 space-y-6 max-md:px-4">
      <h1 className="text-2xl font-bold tracking-tight">Price Monitoring</h1>

      <SetupNextStep />

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