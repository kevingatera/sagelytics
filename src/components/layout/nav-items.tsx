import { Eye, Home, LineChart, PackageSearch, Settings, Store } from 'lucide-react';

export const navItems = [
  { href: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
  { href: '/products', icon: <PackageSearch size={20} />, label: 'Products' },
  { href: '/competitors', icon: <Store size={20} />, label: 'Competitors' },
  { href: '/monitoring', icon: <Eye size={20} />, label: 'Monitoring' },
  { href: '/insights', icon: <LineChart size={20} />, label: 'AI Insights' },
  { href: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];
