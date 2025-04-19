'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart, 
  DollarSign, 
  Globe,
  Home, 
  LineChart, 
  LogOut,
  Menu, 
  PackageSearch, 
  Settings, 
  Store
} from 'lucide-react';
import { Button } from "~/components/ui/button";
import { cn } from '~/lib/utils';
import { useState } from 'react';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isMini: boolean;
}

const NavItem = ({ href, icon, label, isActive, isMini }: NavItemProps) => {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        isActive 
          ? "bg-brand-100 text-brand-700" 
          : "text-gray-600 hover:bg-brand-50 hover:text-brand-600"
      )}
    >
      <div className="w-5 h-5">{icon}</div>
      {!isMini && <span className={cn("font-medium", isActive && "font-semibold")}>{label}</span>}
    </Link>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const [isMini, setIsMini] = useState(false);

  const navItems = [
    { href: "/dashboard", icon: <Home size={20} />, label: "Dashboard" },
    { href: "/products", icon: <PackageSearch size={20} />, label: "Products" },
    { href: "/competitors", icon: <Store size={20} />, label: "Marketplaces" },
    { href: "/custom-competitors", icon: <Globe size={20} />, label: "Website Monitoring" },
    { href: "/insights", icon: <LineChart size={20} />, label: "AI Insights" },
    { href: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <div 
      className={cn(
        "flex flex-col h-screen border-r bg-sidebar transition-all duration-300",
        isMini ? "w-[4.5rem]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isMini ? (
          <Link href="/" className="flex items-center gap-2">
            <BarChart className="h-6 w-6 text-brand-700" />
            <h1 className="font-bold text-xl">PriceWhisperer</h1>
          </Link>
        ) : (
          <div className="mx-auto">
            <BarChart className="h-6 w-6 text-brand-700" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMini(!isMini)}
          className="ml-auto"
        >
          <Menu size={20} />
        </Button>
      </div>

      <div className="flex flex-col gap-1 p-2 mt-4">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href}
            isMini={isMini}
          />
        ))}
      </div>

      {!isMini && (
        <div className="mt-auto p-4 border-t">
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-brand-600 dark:text-brand-400" />
              <h3 className="font-medium text-sm">Pricing Strategy</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Optimize your pricing to increase revenue by 23% with AI suggestions.
            </p>
            <Button size="sm" className="w-full mt-2 bg-brand-400 dark:bg-brand-800 hover:bg-brand-700">
              View Insights
            </Button>
          </div>
        </div>
      )}

      {/* <div className="mt-2 p-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <LogOut size={18} className="mr-2" />
            {!isMini && "Log Out"}
          </Button>
        </Link>
      </div> */}
    </div>
  );
}
