import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { api } from '~/trpc/react';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function CompetitorManagement() {
  const [newCompetitor, setNewCompetitor] = useState('');
  const utils = api.useUtils();

  const { data } = api.competitor.get.useQuery();
  const { mutate: addCompetitor } = api.competitor.add.useMutation({
    onSuccess: () => {
      setNewCompetitor('');
      void utils.competitor.get.invalidate();
      toast.success('Competitor added');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add competitor');
    },
  });

  const { mutate: removeCompetitor } = api.competitor.remove.useMutation({
    onSuccess: () => {
      void utils.competitor.get.invalidate();
      toast.success('Competitor removed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove competitor');
    },
  });

  const { mutate: rediscoverCompetitors } = api.competitor.rediscover.useMutation({
    onSuccess: () => {
      void utils.competitor.get.invalidate();
      toast.success('Competitor discovery completed');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.trim()) {
      toast.error('Please enter a competitor URL');
      return;
    }

    try {
      // Basic URL validation
      let url = newCompetitor;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      new URL(url); // Will throw if invalid
      addCompetitor({ url: newCompetitor.trim() });
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Management</CardTitle>
        <CardDescription>Add or remove competitors from your tracking list</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <Input
            value={newCompetitor}
            onChange={(e) => setNewCompetitor(e.target.value)}
            placeholder="https://competitor.com"
            className="flex-1"
          />
          <Button type="submit">Add</Button>
        </form>

        <div className="space-y-2">
          {data?.competitors?.map((competitor) => (
            <div
              key={competitor.domain}
              className="flex items-center justify-between rounded-md bg-muted p-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{competitor.domain}</span>
                {competitor.domain.includes('.') && (
                  <a
                    href={`https://${competitor.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Visit site
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  try {
                    removeCompetitor({ url: competitor.domain });
                  } catch {
                    toast.error('Failed to remove competitor');
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" className="mt-4 w-full" onClick={() => rediscoverCompetitors()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Rediscover Competitors
        </Button>
      </CardContent>
    </Card>
  );
}
