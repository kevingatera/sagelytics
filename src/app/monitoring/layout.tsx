import { Sidebar } from '~/components/layout/Sidebar';
import { Navbar } from '~/components/layout/Navbar';

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background">
      <Sidebar />
      <div className="ml-[4.5rem] md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 