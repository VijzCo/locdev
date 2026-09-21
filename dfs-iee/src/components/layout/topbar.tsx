'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/utils/rbac';
import { LogOut } from 'lucide-react';

export function Topbar() {
  const router = useRouter();
  const { user, tenant } = useAuthStore();

  const handleSignOut = async () => {
    await signOut(firebaseAuth());
    router.replace('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <div className="text-sm text-muted-foreground">{tenant?.name}</div>
        {tenant?.subscription.status === 'trialing' && (
          <div className="text-xs font-medium text-accent">Free trial</div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="text-right">
            <div className="text-sm font-medium">{user.displayName}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
