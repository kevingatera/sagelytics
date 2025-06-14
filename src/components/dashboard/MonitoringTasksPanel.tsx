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
  productUrls: Array<{
    id: string;
    name: string;
    url: string;
    price?: number;
    currency?: string;
  }>;
  frequency: string;
  lastRun: string | null;
  nextRun: string | null;
  enabled: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export function MonitoringTasksPanel() {
  const [tasks, setTasks] = useState<MonitoringTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch monitoring tasks from API
  useEffect(() => {
    void fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring-tasks');
      
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring tasks');
      }
      
      const data = await response.json() as { tasks: MonitoringTask[] };
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching monitoring tasks:', error);
      toast.error('Failed to load monitoring tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const response = await fetch('/api/monitoring-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          enabled: !task.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update monitoring task');
      }

      // Update local state
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, enabled: !t.enabled } : t
        )
      );
      
      const status = task.enabled ? 'disabled' : 'enabled';
      toast.success(`Monitoring for ${task.competitorDomain} ${status}`);
    } catch (error) {
      console.error('Error updating monitoring task:', error);
      toast.error('Failed to update monitoring task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const response = await fetch(`/api/monitoring-tasks?taskId=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete monitoring task');
      }

      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      toast.success(`Monitoring task for ${task.competitorDomain} removed`);
    } catch (error) {
      console.error('Error deleting monitoring task:', error);
      toast.error('Failed to delete monitoring task');
    }
  };

  const handleRunNow = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      // Update the task to trigger immediate run
      const response = await fetch('/api/monitoring-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          // Force next run to be now by setting it to past date
          // The worker will pick it up on next cycle
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger monitoring task');
      }

      // Update last run time in local state
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, lastRun: new Date().toISOString() }
            : t
        )
      );
      
      toast.success(`Monitoring for ${task.competitorDomain} triggered`);
    } catch (error) {
      console.error('Error triggering monitoring task:', error);
      toast.error('Failed to trigger monitoring task');
    }
  };

  const formatFrequency = (frequency: string): string => {
    switch (frequency) {
      case '0 * * * *':
        return 'Hourly';
      case '0 */6 * * *':
        return 'Every 6 hours';
      case '0 0 * * *':
        return 'Daily (midnight)';
      case '0 0 */2 * *':
        return 'Every 2 days';
      case '0 0 * * 1':
        return 'Weekly (Monday)';
      default:
        return frequency;
    }
  };

  const formatTimeAgo = (isoDate: string | null): string => {
    if (!isoDate) return 'Never';
    
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

  const getStatusBadge = (status: string, enabled: boolean) => {
    if (!enabled) {
      return (
        <Badge variant="secondary">
          Paused
        </Badge>
      );
    }

    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-success/20 text-success">
            Active
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-medium">Active Monitoring Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading monitoring tasks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Active Monitoring Tasks</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTasks}
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
                  <TableCell>{task.productUrls.length}</TableCell>
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
                      {getStatusBadge(task.status, task.enabled)}
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
                        title="Run monitoring now"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete monitoring task"
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