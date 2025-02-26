import React from 'react';
import { cn } from '~/lib/utils';

export function Skeleton(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse bg-gray-200', props.className)} {...props} />;
}
