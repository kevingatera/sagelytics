'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { api } from '~/trpc/react';
import { Trash2, RefreshCw, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '~/components/ui/tooltip';

export function CompetitorManagement({ disabled }: { disabled?: boolean } = {}) {
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
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Add Competitors</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Track competitor websites and their products</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newCompetitor}
          onChange={(e) => setNewCompetitor(e.target.value)}
          placeholder="https://competitor.com"
          className="flex-1 border-muted"
          disabled={isAdding || disabled}
        />
        <Button type="submit" disabled={isAdding || disabled}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </Button>
      </form>
      
      {!disabled && (
        <>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              data?.competitors?.map((competitor) => (
                <div
                  key={competitor.domain}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-2"
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
            className="w-full" 
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
        </>
      )}
    </div>
  );
}
