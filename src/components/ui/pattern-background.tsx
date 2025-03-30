'use client';

import { cn } from '~/lib/utils';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface PatternBackgroundProps {
  className?: string;
}

export function PatternBackground({ className }: PatternBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("w-full h-full bg-muted", className)} />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div 
      className={cn(
        "w-full h-full relative overflow-hidden",
        className
      )}
    >
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25px 25px, ${isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))'} 2%, transparent 0%),
            radial-gradient(circle at 75px 75px, ${isDark ? 'hsl(var(--secondary))' : 'hsl(var(--secondary))'} 2%, transparent 0%)
          `,
          backgroundSize: '100px 100px',
          backgroundPosition: '0 0, 50px 50px',
        }}
      />
      <div 
        className="absolute inset-0 opacity-20 dark:opacity-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))'} 25%, transparent 25%, transparent 50%, ${isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))'} 50%, ${isDark ? 'hsl(var(--primary))' : 'hsl(var(--primary))'} 75%, transparent 75%, transparent)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-background/30 dark:from-background/90 dark:via-background/70 dark:to-background/50" />
    </div>
  );
} 