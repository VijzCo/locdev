import type { ReactNode } from 'react';
import { usePlatform } from '@/platform/PlatformProvider';
import { useAuth } from '@/auth/AuthProvider';
import type { FeatureKey } from '@/platform/settings';
import { ErrorState } from '@/components/common/States';

/**
 * Blocks a route whose area is switched off platform-wide.
 *
 * Hiding the menu entry is not enough: a bookmarked address, a link in an
 * email or a typed URL would still reach the screen. The vendor turning an
 * area off has to mean it is gone.
 *
 * A vendor admin still gets through, so an area can be tested before it is
 * released to anyone.
 */
export function RequireFeature({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: ReactNode;
}) {
  const { featureOn } = usePlatform();
  const { isDevAdmin } = useAuth();

  if (featureOn(feature) || isDevAdmin) return <>{children}</>;

  return (
    <div className="p-6">
      <ErrorState
        title="Not available"
        detail="This part of the system is not switched on for your account. Contact your supplier if you need it."
      />
    </div>
  );
}
