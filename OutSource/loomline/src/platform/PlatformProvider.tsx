import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  PLATFORM_DEFAULTS,
  isFeatureOn,
  type FeatureKey,
  type PlatformSettings,
} from './settings';

interface PlatformValue {
  settings: PlatformSettings;
  loading: boolean;
  /**
   * False until the settings have been saved once. Everything runs on the
   * built-in defaults meanwhile, which look identical to a saved copy — so
   * the portal has to say which it is.
   */
  exists: boolean;
  featureOn: (key: FeatureKey) => boolean;
  /** Vendor only — the rules refuse everyone else. */
  save: (patch: Partial<PlatformSettings>) => Promise<void>;
}

const PlatformCtx = createContext<PlatformValue | null>(null);

/** Merges a stored document over the defaults, one level deep per section. */
function merge(stored: Partial<PlatformSettings> | null): PlatformSettings {
  if (!stored) return PLATFORM_DEFAULTS;
  return {
    ...PLATFORM_DEFAULTS,
    ...stored,
    branding: { ...PLATFORM_DEFAULTS.branding, ...(stored.branding ?? {}) },
    security: { ...PLATFORM_DEFAULTS.security, ...(stored.security ?? {}) },
    features: { ...PLATFORM_DEFAULTS.features, ...(stored.features ?? {}) },
  };
}

/**
 * Loads platform settings once and keeps them live.
 *
 * A change made in the vendor portal reaches every signed-in customer within
 * seconds — which is the point of switching an area off, and the reason this
 * is a listener rather than a read at startup.
 */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Partial<PlatformSettings> | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      doc(db, 'platformSettings', 'global'),
      (snap) => {
        setExists(snap.exists());
        setStored(snap.exists() ? (snap.data() as Partial<PlatformSettings>) : null);
        setLoading(false);
      },
      () => {
        // Unreadable settings must not black out the application; the
        // built-in defaults are a safe fallback.
        setStored(null);
        setExists(false);
        setLoading(false);
      },
    );
  }, []);

  const settings = useMemo(() => merge(stored), [stored]);

  const save = useCallback(async (patch: Partial<PlatformSettings>) => {
    if (!db) return;
    await setDoc(doc(db, 'platformSettings', 'global'), patch, { merge: true });
  }, []);

  const value = useMemo<PlatformValue>(
    () => ({
      settings,
      loading,
      exists,
      featureOn: (key) => isFeatureOn(settings, key),
      save,
    }),
    [settings, loading, exists, save],
  );

  return <PlatformCtx.Provider value={value}>{children}</PlatformCtx.Provider>;
}

export function usePlatform(): PlatformValue {
  const ctx = useContext(PlatformCtx);
  if (!ctx) throw new Error('usePlatform must be used inside PlatformProvider');
  return ctx;
}
