import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { Capability } from '@/lib/capabilities';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/common/States';
import { ForcePasswordChange } from '@/pages/ForcePasswordChange';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { phase, licence, signOut, profile } = useAuth();
  const location = useLocation();

  if (phase === 'LOADING') {
    return (
      <div className="p-6">
        <LoadingState label="Signing in" />
      </div>
    );
  }

  if (phase === 'SIGNED_OUT') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  /* An Auth account without a profile document is a self-registration that
     no administrator has approved. It can read and write nothing. */
  if (phase === 'NO_PROFILE') {
    return (
      <div className="p-6">
        <ErrorState
          title="This account is not set up"
          detail="Your sign-in worked, but no administrator has given this account access yet. Ask your administrator to add you."
          action={
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          }
        />
      </div>
    );
  }

  if (phase === 'DISABLED') {
    return (
      <div className="p-6">
        <ErrorState
          title="This account is disabled"
          detail="Your administrator has turned off access for this account."
          action={
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          }
        />
      </div>
    );
  }

  if (!licence.canSignIn) {
    return (
      <div className="p-6">
        <ErrorState
          title="This account is suspended"
          detail="Production tracking is unavailable for your organisation. Contact your supplier to restore access."
          action={
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          }
        />
      </div>
    );
  }

  /* Replaces the application rather than overlaying it. A temporary
     password has usually been seen by more than one person, so carrying on
     without changing it defeats the point. */
  if (profile?.mustChangePassword) return <ForcePasswordChange />;

  return <>{children}</>;
}

export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(capability)) {
    return (
      <div className="p-6">
        <ErrorState
          title="You do not have access to this screen"
          detail="Your role does not include this area. Ask your administrator if you need it."
        />
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * The vendor console is not a hidden menu item — this returns the same
 * "not found" a bad address would, so its existence is undetectable from
 * inside a customer's application.
 */
export function RequireVendor({ children }: { children: ReactNode }) {
  const { isVendorAdmin } = useAuth();
  if (!isVendorAdmin) {
    return (
      <div className="p-6">
        <ErrorState title="Page not found" detail="That address does not exist." />
      </div>
    );
  }
  return <>{children}</>;
}
