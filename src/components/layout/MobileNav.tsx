'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LineChart, Menu } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet';
import { cn } from '~/lib/utils';
import { navItems } from './nav-items';

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <LineChart className="h-6 w-6 text-primary" />
          <SheetTitle className="text-xl font-bold">Sagelytics</SheetTitle>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 transition-colors',
                  isActive
                    ? 'bg-brand-100 font-semibold text-brand-700'
                    : 'font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300',
                )}
              >
                <span className="h-5 w-5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
