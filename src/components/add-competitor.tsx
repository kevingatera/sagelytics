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

export function AddCompetitor() {
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
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
      toast.error('Please enter a competitor URL');
      return;
    }
    try {
      let url = newCompetitor;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      new URL(url);
      setIsAdding(true);
      addCompetitor({ url: newCompetitor.trim() });
    } catch {
      toast.error('Please enter a valid URL');
    }
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
          disabled={isAdding}
        />
        <Button type="submit" disabled={isAdding}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </Button>
      </form>
    </div>
  );
}
