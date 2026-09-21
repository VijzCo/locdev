'use client';

import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { firebaseAuth, firestore } from '@/lib/firebase/client';
import { COLLECTIONS } from '@/lib/firebase/collections';
import type { AppUser, Tenant, Permission } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;

  initialize: () => () => void;
  hasPermission: (p: Permission) => boolean;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  user: null,
  tenant: null,
  loading: true,
  error: null,

  initialize: () => {
    let unsubUser: (() => void) | undefined;
    let unsubTenant: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(firebaseAuth(), async (fbUser) => {
      // Clean up any previous user/tenant listeners
      unsubUser?.();
      unsubTenant?.();
      unsubUser = undefined;
      unsubTenant = undefined;

      if (!fbUser) {
        set({ firebaseUser: null, user: null, tenant: null, loading: false });
        return;
      }

      set({ firebaseUser: fbUser, loading: true, error: null });

      try {
        const userRef = doc(firestore(), COLLECTIONS.users, fbUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          set({
            user: null,
            tenant: null,
            loading: false,
            error: 'User profile not found. Contact your administrator.',
          });
          return;
        }

        const userData = { id: userSnap.id, ...userSnap.data() } as AppUser;
        set({ user: userData });

        // Live-subscribe to the user doc (role/permissions can change)
        unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            set({ user: { id: snap.id, ...snap.data() } as AppUser });
          }
        });

        // Subscribe to the tenant doc
        if (userData.tenantId) {
          const tenantRef = doc(firestore(), COLLECTIONS.tenants, userData.tenantId);
          unsubTenant = onSnapshot(tenantRef, (snap) => {
            if (snap.exists()) {
              set({ tenant: { id: snap.id, ...snap.data() } as Tenant, loading: false });
            } else {
              set({ tenant: null, loading: false });
            }
          });
        } else {
          set({ tenant: null, loading: false });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[auth] init error', err);
        set({
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load user',
        });
      }
    });

    // Return cleanup
    return () => {
      unsubAuth();
      unsubUser?.();
      unsubTenant?.();
    };
  },

  hasPermission: (p: Permission) => {
    return get().user?.permissions?.includes(p) ?? false;
  },

  reset: () => set({ firebaseUser: null, user: null, tenant: null, loading: false, error: null }),
}));
