import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { collection, deleteField, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { resolveConfig, type ConfigLayer, type Resolution } from './resolve';
import type { ConfigKey, ConfigValues, ScopeLevel } from './schema';

/** Where a value is being read from — narrows the layer stack. */
export interface ConfigContextScope {
  factoryId?: string | null;
  departmentId?: string | null;
  sectionId?: string | null;
  moduleId?: string | null;
  styleId?: string | null;
}

interface OverrideDoc {
  id: string;
  scope: ScopeLevel;
  scopeId: string;
  values: Partial<ConfigValues>;
}

interface ConfigValue {
  loading: boolean;
  /** Reads a value for a scope. The workhorse of the whole engine. */
  cfg: <K extends ConfigKey>(key: K, scope?: ConfigContextScope) => ConfigValues[K];
  /** Same, but reports which layer supplied it. */
  resolve: <K extends ConfigKey>(key: K, scope?: ConfigContextScope) => Resolution<K>;
  /** All layers for a scope, most specific first. */
  layersFor: (scope?: ConfigContextScope) => ConfigLayer[];
  overrideValues: (level: ScopeLevel, scopeId: string) => Partial<ConfigValues>;
  setOverride: (level: ScopeLevel, scopeId: string, key: ConfigKey, value: unknown) => Promise<void>;
  clearOverride: (level: ScopeLevel, scopeId: string, key: ConfigKey) => Promise<void>;
}

const ConfigCtx = createContext<ConfigValue | null>(null);

const docIdFor = (level: ScopeLevel, scopeId: string) => `${level.toLowerCase()}_${scopeId}`;

const LEVEL_LABEL: Record<ScopeLevel, string> = {
  SYSTEM: 'Built-in default',
  TENANT: 'Organisation',
  FACTORY: 'Factory',
  DEPARTMENT: 'Department',
  SECTION: 'Section',
  STYLE: 'Style',
  MODULE: 'Module',
  MODULE_STYLE: 'Module + style',
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { profile, demoMode, effectiveTenantId } = useAuth();
  const [docs, setDocs] = useState<Record<string, OverrideDoc>>({});
  const [loading, setLoading] = useState(true);

  /**
   * Every override for the tenant is loaded once and kept live. The whole
   * set is a few dozen small documents even for a large factory, which is
   * far cheaper than resolving a threshold per module per render.
   */
  useEffect(() => {
    if (!db || !effectiveTenantId || demoMode) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      query(collection(db, 'configOverrides'), where('tenantId', '==', effectiveTenantId)),
      (snap) => {
        const next: Record<string, OverrideDoc> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as Omit<OverrideDoc, 'id'>;
          next[d.id] = { id: d.id, ...data };
        });
        setDocs(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [effectiveTenantId, demoMode]);

  const layersFor = useCallback(
    (scope: ConfigContextScope = {}): ConfigLayer[] => {
      const layer = (level: ScopeLevel, scopeId: string | null | undefined): ConfigLayer | null => {
        if (!scopeId) return null;
        const id = docIdFor(level, scopeId);
        return {
          level,
          ref: id,
          label: LEVEL_LABEL[level],
          values: docs[id]?.values ?? {},
        };
      };

      const moduleStyleId =
        scope.moduleId && scope.styleId ? `${scope.moduleId}__${scope.styleId}` : null;

      return [
        layer('MODULE_STYLE', moduleStyleId),
        layer('MODULE', scope.moduleId),
        layer('STYLE', scope.styleId),
        layer('SECTION', scope.sectionId),
        layer('DEPARTMENT', scope.departmentId),
        layer('FACTORY', scope.factoryId),
        layer('TENANT', effectiveTenantId),
      ].filter((l): l is ConfigLayer => l !== null);
    },
    [docs, effectiveTenantId],
  );

  const value = useMemo<ConfigValue>(() => {
    const resolve = <K extends ConfigKey>(key: K, scope?: ConfigContextScope) =>
      resolveConfig(key, layersFor(scope));

    return {
      loading,
      resolve,
      cfg: (key, scope) => resolve(key, scope).value,
      layersFor,
      overrideValues: (level, scopeId) => docs[docIdFor(level, scopeId)]?.values ?? {},

      setOverride: async (level, scopeId, key, val) => {
        if (!db || !profile?.tenantId) return;
        await setDoc(
          doc(db, 'configOverrides', docIdFor(level, scopeId)),
          {
            tenantId: profile.tenantId,
            scope: level,
            scopeId,
            values: { [key]: val },
          },
          { merge: true },
        );
      },

      /* Clearing removes the key rather than writing a blank, so the value
         falls back through the chain instead of shadowing its parent. */
      clearOverride: async (level, scopeId, key) => {
        if (!db || !profile?.tenantId) return;
        await setDoc(
          doc(db, 'configOverrides', docIdFor(level, scopeId)),
          { values: { [key]: deleteField() } },
          { merge: true },
        );
      },
    };
  }, [docs, layersFor, loading, profile?.tenantId]);

  return <ConfigCtx.Provider value={value}>{children}</ConfigCtx.Provider>;
}

export function useConfig(): ConfigValue {
  const ctx = useContext(ConfigCtx);
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider');
  return ctx;
}
