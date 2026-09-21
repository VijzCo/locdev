import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LicenceBanner } from './LicenceBanner';
import { SupportBanner } from './SupportBanner';
import { AppFooter } from './AppFooter';
import { StageBanner } from './StageBanner';
import { SessionNotices } from './SessionNotices';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      {navOpen && (
        <button
          className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="fixed inset-y-0 left-0 z-40 lg:static lg:z-auto">
        <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onToggleNav={() => setNavOpen((v) => !v)} />
        <StageBanner />
        <SupportBanner />
        <LicenceBanner />
        <main className="flex-1 overflow-y-auto scrollbar-slim">
          <ErrorBoundary area="This screen">
            <Outlet />
          </ErrorBoundary>
        </main>
        <AppFooter />
        <SessionNotices />
      </div>
    </div>
  );
}
