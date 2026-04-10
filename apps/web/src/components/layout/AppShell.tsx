import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import RuntimeWorkIndicator from './RuntimeWorkIndicator';
import Sidebar from './Sidebar';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar when resizing to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — always visible ≥ md */}
      <div className="hidden shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
          {/* Drawer */}
          <div className="absolute top-0 bottom-0 left-0 z-50 animate-page-enter">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center justify-between border-border border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span
              className="font-bold font-mono text-primary text-xs"
              style={{ textShadow: 'var(--glow-primary-sm)' }}
            >
              agent_orchestrator
            </span>
            <span className="animate-cursor-blink font-mono text-primary text-xs">_</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="border border-border p-1.5 text-muted-foreground transition-colors duration-150 hover:border-foreground/40 hover:text-foreground active:scale-95"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </header>

        <RuntimeWorkIndicator />

        <main
          key={location.pathname}
          className="min-w-0 flex-1 animate-page-enter overflow-y-auto overflow-x-hidden"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
