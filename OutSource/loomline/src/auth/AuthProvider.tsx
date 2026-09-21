import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { capabilitiesFor, type Capability } from '@/lib/capabilities';
import { resolveLicence, vendorLicence, type LicenceState } from '@/lib/licence';
import type { AppUser, License } from '@/types/domain';
import type { TenantUsage } from '@/lib/tenantUsage';
import { DEMO_LICENCE, DEMO_USER } from '@/lib/demoSession';

type Phase = 'LOADING' | 'SIGNED_OUT' | 'NO_PROFILE' | 'DISABLED' | 'READY';

export interface ViewingTenant {
  id: string;
  name: string;
  /** Support changes are off until deliberately enabled. */
  allowWrites: boolean;
}

interface AuthValue {
  phase: Phase;
  user: User | null;
  profile: AppUser | null;
  licence: LicenceState;
  /** The raw licence, needed for limit checks. */
  licenceDoc: License | null;
  /** Live usage counters for this tenant. */
  usage: TenantUsage | null;
  /** Set when a vendor admin is looking at a customer's data. */
  viewingTenant: ViewingTenant | null;
  setViewingTenant: (tenant: ViewingTenant | null) => void;
  /** The tenant whose data every screen should read. */
  effectiveTenantId: string | null;
  isVendorAdmin: boolean;
  capabilities: Capability[];
  can: (cap: Capability) => boolean;
  /** True when the capability is granted *and* the licence permits writes. */
  canWrite: (cap: Capability) => boolean;
  signOut: () => Promise<void>;
  demoMode: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('LOADING');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [licence, setLicence] = useState<License | null>(null);
  const [isVendorAdmin, setIsVendorAdmin] = useState(false);
  const [usage, setUsage] = useState<TenantUsage | null>(null);

  /* Session storage, not local: closing the tab drops support access, so it
     cannot be left on by accident overnight. */
  const [viewingTenant, setViewing] = useState<ViewingTenant | null>(() => {
    try {
      const raw = sessionStorage.getItem('gpt.viewingTenant');
      return raw ? (JSON.parse(raw) as ViewingTenant) : null;
    } catch {
      return null;
    }
  });

  const setViewingTenant = useCallback((tenant: ViewingTenant | null) => {
    setViewing(tenant);
    try {
      if (tenant) sessionStorage.setItem('gpt.viewingTenant', JSON.stringify(tenant));
      else sessionStorage.removeItem('gpt.viewingTenant');
    } catch {
      // Storage unavailable; support view simply will not survive a reload.
    }
  }, []);

  const demoMode = !isFirebaseConfigured && import.meta.env.DEV;

  /* Demo mode lets the interface be walked before a Firebase project
     exists. It is unreachable in a production build. */
  useEffect(() => {
    if (!demoMode) return;
    setProfile(DEMO_USER);
    setLicence(DEMO_LICENCE);
    setIsVendorAdmin(true);
    setPhase('READY');
  }, [demoMode]);

  useEffect(() => {
    if (!auth || !db) {
      if (!demoMode) setPhase('SIGNED_OUT');
      return;
    }

    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLicence(null);
        setIsVendorAdmin(false);
        setPhase('SIGNED_OUT');
        return;
      }

      // A profile document is what makes an Auth account meaningful. Anyone
      // who self-registers gets an account with no profile, and the rules
      // then deny them everything — see Part F2.
      const snap = await getDoc(doc(db!, 'users', u.uid));
      if (!snap.exists()) {
        setPhase('NO_PROFILE');
        return;
      }

      const p = { uid: u.uid, ...snap.data() } as AppUser;
      if (p.disabled) {
        setProfile(p);
        setPhase('DISABLED');
        return;
      }

      setProfile(p);

      // Matches the rules exactly: vendor access is the presence of a
      // vendorAdmins document and nothing else.
      const vendor = await getDoc(doc(db!, 'vendorAdmins', u.uid))
        .then((s) => s.exists())
        .catch(() => false);
      setIsVendorAdmin(vendor);

      setPhase('READY');
    });
  }, [demoMode]);

  /* Usage counters, live. The interface can then say "3 of 5 modules used"
     before someone hits a wall rather than after. */
  useEffect(() => {
    if (!db || !profile?.tenantId || demoMode) return;
    return onSnapshot(
      doc(db, 'tenantUsage', profile.tenantId),
      (snap) =>
        setUsage(
          snap.exists()
            ? ({ tenantId: profile.tenantId, ...snap.data() } as TenantUsage)
            : null,
        ),
      () => setUsage(null),
    );
  }, [profile?.tenantId, demoMode]);

  /* Live licence listener — an activation in the vendor console reaches the
     customer's screen within seconds, with no sign-out required. */
  useEffect(() => {
    if (!db || !profile?.tenantId || demoMode) return;
    return onSnapshot(
      doc(db, 'licenses', profile.tenantId),
      (snap) => setLicence(snap.exists() ? ({ ...snap.data() } as License) : null),
      () => setLicence(null),
    );
  }, [profile?.tenantId, demoMode]);

  const value = useMemo<AuthValue>(() => {
    const caps = profile ? capabilitiesFor(profile.role, profile.capabilities) : [];
    const lic = isVendorAdmin ? vendorLicence() : resolveLicence(licence);
    const can = (c: Capability) => caps.includes(c);

    return {
      phase,
      user,
      profile,
      licence: lic,
      licenceDoc: licence,
      usage,
      viewingTenant,
      setViewingTenant,
      effectiveTenantId: viewingTenant?.id ?? profile?.tenantId ?? null,
      isVendorAdmin,
      capabilities: caps,
      can,
      /* While supporting a customer, changes are refused unless the vendor
         has deliberately turned them on. Read-only is the safe default when
         you are looking at somebody else's production data. */
      canWrite: (c) =>
        can(c) && lic.canWrite && (!viewingTenant || viewingTenant.allowWrites),
      signOut: async () => {
        if (auth) await fbSignOut(auth);
      },
      demoMode,
    };
  }, [
    phase, user, profile, licence, isVendorAdmin, demoMode, usage,
    viewingTenant, setViewingTenant,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
