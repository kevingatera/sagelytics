import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { api } from '~/trpc/react';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CompetitorManagement() {
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRediscovering, setIsRediscovering] = useState(false);
  const utils = api.useUtils();

  const { data, isLoading } = api.competitor.get.useQuery();
  
  const { mutate: addCompetitor } = api.competitor.add.useMutation({
    onSuccess: () => {
      setNewCompetitor('');
      setIsAdding(false);
      void utils.competitor.get.invalidate();
      toast.success('Competitor added');
    },
    onError: (error) => {
      setIsAdding(false);
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
    onSuccess: (data) => {
      void utils.competitor.get.invalidate();
      setIsRediscovering(false);
      toast.success(`Discovered ${data.stats.totalDiscovered} competitors`);
    },
    onError: (error) => {
      setIsRediscovering(false);
      toast.error(error.message || 'Failed to discover competitors');
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
      
      setIsAdding(true);
      addCompetitor({ url: newCompetitor.trim() });
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const handleRediscover = () => {
    setIsRediscovering(true);
    rediscoverCompetitors();
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
            disabled={isAdding}
          />
          <Button type="submit" disabled={isAdding}>
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            data?.competitors?.map((competitor) => (
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
            ))
          )}
        </div>

        <Button 
          variant="outline" 
          className="mt-4 w-full" 
          onClick={handleRediscover}
          disabled={isRediscovering}
        >
          {isRediscovering ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Rediscover Competitors
        </Button>
      </CardContent>
    </Card>
  );
}
