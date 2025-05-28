'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <Link href="/" className="text-primary hover:text-primary-focus underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
} 