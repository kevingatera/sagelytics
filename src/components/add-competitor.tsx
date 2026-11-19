'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { api } from '~/trpc/react';
import { Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '~/components/ui/tooltip';

export function AddCompetitor({ hideHeading = false }: { hideHeading?: boolean } = {}) {
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
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
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetitor.trim()) {
      setError('Enter a competitor website first.');
      return;
    }
    try {
      let url = newCompetitor;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      new URL(url);
      setError(null);
      setIsAdding(true);
      addCompetitor({ url: newCompetitor.trim() });
    } catch {
      setError('Enter a valid website, such as competitor.com.');
    }
  };
  return (
    <div className="space-y-4">
      {!hideHeading && (
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
      )}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          aria-label="Competitor website"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'add-competitor-error' : undefined}
          value={newCompetitor}
          onChange={(e) => {
            setNewCompetitor(e.target.value);
            setError(null);
          }}
          placeholder="https://competitor.com"
          className="flex-1 border-muted"
          disabled={isAdding}
        />
        <Button type="submit" disabled={isAdding}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </Button>
      </form>
      {error && (
        <p id="add-competitor-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
