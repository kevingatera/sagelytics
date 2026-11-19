'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LineChart, Activity } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { cn } from '~/lib/utils';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { navItems } from './nav-items';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isMini: boolean;
}

const NavItem = ({ href, icon, label, isActive, isMini }: NavItemProps) => {
  if (isMini) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              href={href} 
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex items-center justify-center h-10 w-10 rounded-md transition-colors mx-auto",
                isActive 
                  ? "bg-brand-100 text-brand-700" 
                  : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
              )}
            >
              <div className="w-5 h-5">{icon}</div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Link 
      href={href} 
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        isActive 
          ? "bg-brand-100 text-brand-700" 
          : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
      )}
    >
      <div className="w-5 h-5">{icon}</div>
      <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>
    </Link>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const [isMini, setIsMini] = useState(false);

  return (
    <div 
      className={cn(
        "fixed left-0 top-0 hidden md:flex flex-col h-screen border-r bg-sidebar transition-all duration-300 z-40",
        isMini ? "w-[4.5rem]" : "w-64"
      )}
      style={{
        '--sidebar-width': isMini ? '4.5rem' : '16rem'
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isMini ? (
          <Link href="/" className="flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Sagelytics</span>
          </Link>
        ) : (
          <div className="mx-auto">
            <LineChart className="h-6 w-6 text-primary" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMini(!isMini)}
          className="ml-auto"
          aria-label={isMini ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMini ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1 p-2 mt-4">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname.startsWith(item.href)}
            isMini={isMini}
          />
        ))}
      </nav>

      {!isMini && (
        <div className="mt-auto p-4 border-t">
          <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={18} className="text-brand-600 dark:text-brand-400" />
              <h3 className="font-medium text-sm">Pricing Insights</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              See what monitoring has found about competitor prices.
            </p>
            <Button asChild size="sm" className="w-full mt-2">
              <Link href="/insights">View Insights</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
