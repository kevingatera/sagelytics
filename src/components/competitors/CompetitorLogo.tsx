'use client';

import Image from 'next/image';
import { useState } from 'react';

interface CompetitorLogoProps {
  domain: string;
}

export function CompetitorLogo({ domain }: CompetitorLogoProps) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const [src, setSrc] = useState(`https://logo.clearbit.com/${cleanDomain}`);
  return (
    <Image
      src={src}
      onError={() => setSrc('/img/placeholder-logo.svg')}
      alt={domain}
      className="w-8 h-8 rounded border border-muted object-contain"
      width={32}
      height={32}
    />
  );
} 