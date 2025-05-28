'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Clock, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type MonitoringTask = {
  id: string;
  competitorDomain: string;
  productCount: number;
  frequency: string;
  lastRun: string;
  enabled: boolean;
};

export function MonitoringTasksPanel() {
  const [tasks, setTasks] = useState<MonitoringTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for the demo
  const mockTasks: MonitoringTask[] = [
    {
      id: 'task-1',
      competitorDomain: 'amazon.com',
      productCount: 5,
      frequency: '0 * * * *', // Hourly
      lastRun: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      enabled: true,
    },
    {
      id: 'task-2',
      competitorDomain: 'walmart.com',
      productCount: 3,
      frequency: '0 0 * * *', // Daily
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20 hours ago
      enabled: true,
    },
    {
      id: 'task-3',
      competitorDomain: 'ebay.com',
      productCount: 2,
      frequency: '0 */6 * * *', // Every 6 hours
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      enabled: false,
    },
  ];

  // Fetch monitoring tasks on component mount
  useEffect(() => {
    // In a real implementation, this would fetch from the API
    setTasks(mockTasks);
  }, []);

  const handleToggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, enabled: !task.enabled } : task
      )
    );
    
    const task = tasks.find(t => t.id === taskId);
    const status = task?.enabled ? 'disabled' : 'enabled';
    toast.success(`Monitoring for ${task?.competitorDomain} ${status}`);
    
    // In a real implementation, this would call the API
    // await MicroserviceClient.getInstance().updateMonitoringTask({
    //   taskId,
    //   updates: { enabled: !task?.enabled },
    // });
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    
    // Remove from local state
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    toast.success(`Monitoring task for ${task?.competitorDomain} removed`);
    
    // In a real implementation, this would call the API
    // await MicroserviceClient.getInstance().removeMonitoringTask(taskId);
  };

  const handleRunNow = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    
    // Update last run time
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, lastRun: new Date().toISOString() }
          : t
      )
    );
    
    toast.success(`Monitoring for ${task?.competitorDomain} triggered`);
    
    // In a real implementation, this would call the API
    // await fetch('/api/product-monitor/run', {
    //   method: 'POST',
    //   body: JSON.stringify({ taskId }),
    //   headers: { 'Content-Type': 'application/json' },
    // });
  };

  const formatFrequency = (frequency: string): string => {
    switch (frequency) {
      case '0 * * * *':
        return 'Hourly';
      case '0 */6 * * *':
        return 'Every 6 hours';
      case '0 0 * * *':
        return 'Daily (midnight)';
      default:
        return frequency;
    }
  };

  const formatTimeAgo = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Active Monitoring Tasks</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            // Simulate loading
            setTimeout(() => {
              setLoading(false);
              toast.success('Monitoring tasks refreshed');
            }, 1000);
          }}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active monitoring tasks. Add competitors to start monitoring prices.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.competitorDomain}</TableCell>
                  <TableCell>{task.productCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatFrequency(task.frequency)}
                    </div>
                  </TableCell>
                  <TableCell>{formatTimeAgo(task.lastRun)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={task.enabled}
                        onCheckedChange={() => handleToggleTask(task.id)}
                      />
                      <Badge
                        variant={task.enabled ? 'default' : 'secondary'}
                        className={task.enabled ? 'bg-success/20 text-success' : ''}
                      >
                        {task.enabled ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRunNow(task.id)}
                        disabled={!task.enabled}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 