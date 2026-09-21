import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, deleteDoc, getDoc, increment, setDoc, writeBatch } from 'firebase/firestore';

/**
 * Rules tests, run against the Firestore emulator.
 *
 *   npm run test:rules
 *
 * These exist because the rules were repeatedly wrong in ways no amount of
 * reading caught — most notably a delete rule that referenced
 * `request.resource`, which does not exist on a delete. Reading rules is not
 * testing them.
 */

const TENANT = 'tenant-a';
const OTHER = 'tenant-b';

let env: RulesTestEnvironment;

const profile = (tenantId: string, over: Record<string, unknown> = {}) => ({
  tenantId,
  displayName: 'Test',
  email: 't@example.com',
  role: 'MANAGER',
  disabled: false,
  scanAccess: 'BOTH',
  capabilities: [],
  scope: { factoryIds: [], departmentIds: [], sectionIds: [], moduleIds: [], shiftIds: [] },
  ...over,
});

const licence = (over: Record<string, unknown> = {}) => ({
  plan: 'PAID',
  status: 'ACTIVE',
  billingCycle: 'YEARLY',
  startsAt: new Date(Date.now() - 86400000).toISOString(),
  expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  graceUntil: new Date(Date.now() + 86400000 * 37).toISOString(),
  // Epoch milliseconds are what the rules compare. Without these the rule
  // compared request.time against an ISO string, which is a type error that
  // denied every customer write.
  expiresAtMs: Date.now() + 86400000 * 30,
  graceUntilMs: Date.now() + 86400000 * 37,
  limits: {},
  ...over,
});

/*
 * `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST to whatever port it
 * actually started on, so the tests follow the emulator rather than assuming
 * a port. Hardcoding 8080 broke on any machine already running something
 * there — XAMPP's Apache, most commonly.
 */
function emulatorAddress(): { host: string; port: number } {
  const fromEnv = process.env.FIRESTORE_EMULATOR_HOST;
  if (fromEnv) {
    const [host, port] = fromEnv.split(':');
    return { host: host || '127.0.0.1', port: Number(port) || 8085 };
  }
  return { host: '127.0.0.1', port: 8085 };
}

beforeAll(async () => {
  const { host, port } = emulatorAddress();
  env = await initializeTestEnvironment({
    projectId: 'loomline-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host,
      port,
    },
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();

  // Seed identity and licences with rules bypassed.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // Vendor access is a document now, not a constant in the rules file.
    await setDoc(doc(db, 'vendorAdmins/vendor1'), { grantedAt: new Date().toISOString() });
    await setDoc(doc(db, 'users/alice'), profile(TENANT, { role: 'SYSTEM_ADMIN' }));
    await setDoc(doc(db, 'users/bob'), profile(OTHER));
    await setDoc(doc(db, 'users/olly'), profile(TENANT, { role: 'OPERATOR', scanAccess: 'IN' }));
    await setDoc(doc(db, 'users/dave'), profile(TENANT, { disabled: true }));
    await setDoc(doc(db, 'users/olga'), profile(TENANT, { role: 'OPERATOR', scanAccess: 'OUT' }));
    await setDoc(doc(db, `licenses/${TENANT}`), licence({
      limits: { maxFactories: 2, maxModules: 5, maxUsers: 10 },
    }));
    await setDoc(doc(db, `licenses/${OTHER}`), licence({ limits: {} }));
    await setDoc(doc(db, `tenantUsage/${TENANT}`), {
      tenantId: TENANT, factories: 1, modules: 0, users: 4,
    });
    await setDoc(doc(db, `tenantUsage/${OTHER}`), {
      tenantId: OTHER, factories: 0, modules: 0, users: 1,
    });
    await setDoc(doc(db, 'factories/f1'), { tenantId: TENANT, code: 'NF', name: 'Northfield Mill' });
    await setDoc(doc(db, 'bundles/B1'), {
      tenantId: TENANT,
      factoryId: 'f1',
      poLineId: 'l1',
      qty: 25,
      status: 'CREATED',
      currentModuleId: null,
    });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe('tenant isolation', () => {
  it('lets a user read their own tenant', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'factories/f1')));
  });

  it('refuses a user from another tenant', async () => {
    await assertFails(getDoc(doc(as('bob'), 'factories/f1')));
  });

  it('refuses an unauthenticated read', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'factories/f1')));
  });

  it('refuses an account with no profile document', async () => {
    await assertFails(getDoc(doc(as('nobody'), 'factories/f1')));
  });

  it('refuses a disabled account', async () => {
    await assertFails(getDoc(doc(as('dave'), 'factories/f1')));
  });
});

describe('deleting master data', () => {
  // Regression: the original rule checked request.resource.data.tenantId,
  // which is null on a delete, so every delete failed.
  it('lets a manager delete a record in their tenant', async () => {
    await assertSucceeds(deleteDoc(doc(as('alice'), 'factories/f1')));
  });

  it('refuses a delete from another tenant', async () => {
    await assertFails(deleteDoc(doc(as('bob'), 'factories/f1')));
  });

  it('refuses a delete by an operator', async () => {
    await assertFails(deleteDoc(doc(as('olly'), 'factories/f1')));
  });
});

describe('creating and updating master data', () => {
  it('lets a manager create inside their tenant', async () => {
    await assertSucceeds(
      setDoc(doc(as('alice'), 'factories/f2'), { tenantId: TENANT, code: 'RV', name: 'Riverside Plant' }),
    );
  });

  it('refuses a create that plants a record in another tenant', async () => {
    await assertFails(
      setDoc(doc(as('alice'), 'factories/f3'), { tenantId: OTHER, code: 'X', name: 'X' }),
    );
  });

  it('refuses an update that moves a record to another tenant', async () => {
    await assertFails(
      setDoc(doc(as('alice'), 'factories/f1'), { tenantId: OTHER, code: 'Q1', name: 'Q' }),
    );
  });
});

describe('scan events', () => {
  const event = (over: Record<string, unknown> = {}) => ({
    tenantId: TENANT,
    factoryId: 'f1',
    bundleId: 'B1',
    moduleId: 'M1',
    direction: 'IN',
    qty: 25,
    userId: 'olly',
    shiftId: '',
    slotIndex: 9,
    clientTime: new Date().toISOString(),
    serverTime: null,
    ...over,
  });

  it('accepts a well-formed scan from an operator', async () => {
    await assertSucceeds(setDoc(doc(as('olly'), 'scanEvents/B1__M1__IN'), event()));
  });

  it('refuses a document id that does not match its contents', async () => {
    // The deterministic id is the duplicate guard; a mismatched id would
    // let the same scan be written twice under different keys.
    await assertFails(setDoc(doc(as('olly'), 'scanEvents/anything'), event()));
  });

  it('refuses a direction the operator may not scan', async () => {
    await assertFails(
      setDoc(doc(as('olly'), 'scanEvents/B1__M1__OUT'), event({ direction: 'OUT' })),
    );
  });

  it('refuses a scan attributed to another user', async () => {
    await assertFails(setDoc(doc(as('olly'), 'scanEvents/B1__M1__IN'), event({ userId: 'alice' })));
  });

  it('refuses a scan claiming a quantity the bundle does not have', async () => {
    // Production figures are the product. An operator writing their own
    // quantity could inflate a factory's entire output.
    await assertFails(setDoc(doc(as('olly'), 'scanEvents/B1__M1__IN'), event({ qty: 9999 })));
  });

  it('never allows a scan event to be changed or removed', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'scanEvents/B1__M1__IN'), event());
    });
    await assertFails(setDoc(doc(as('alice'), 'scanEvents/B1__M1__IN'), event({ qty: 999 })));
    await assertFails(deleteDoc(doc(as('alice'), 'scanEvents/B1__M1__IN')));
  });
});

describe('privilege escalation', () => {
  it('refuses an ADMIN promoting themselves to SYSTEM_ADMIN', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/adam'), profile(TENANT, { role: 'ADMIN' }));
    });
    await assertFails(
      setDoc(doc(as('adam'), 'users/adam'), profile(TENANT, { role: 'SYSTEM_ADMIN' })),
    );
  });

  it('refuses anyone changing their own role, including a system admin', async () => {
    await assertFails(
      setDoc(doc(as('alice'), 'users/alice'), profile(TENANT, { role: 'OPERATOR' })),
    );
  });

  it('refuses an operator re-enabling their own disabled account', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'users/olly'),
        profile(TENANT, { role: 'OPERATOR', scanAccess: 'IN', disabled: true }),
      );
    });
    await assertFails(
      setDoc(doc(as('olly'), 'users/olly'), profile(TENANT, { role: 'OPERATOR', disabled: false })),
    );
  });

  it('lets an operator clear their own password flag and nothing else', async () => {
    // Without this the forced password change is an inescapable loop.
    await assertSucceeds(
      setDoc(
        doc(as('olly'), 'users/olly'),
        { mustChangePassword: false, passwordChangedAt: new Date().toISOString() },
        { merge: true },
      ),
    );
  });
});

describe('audit trail integrity', () => {
  it('refuses an entry attributed to somebody else', async () => {
    // A forged entry is worse than no trail, because it reads as authoritative.
    await assertFails(
      setDoc(doc(as('olly'), 'auditLogs/forged'), {
        tenantId: TENANT, userId: 'alice', action: 'LABEL_PRINT', entity: 'bundle', entityId: 'B1',
      }),
    );
  });

  it('accepts an entry naming the person writing it', async () => {
    await assertSucceeds(
      setDoc(doc(as('olly'), 'auditLogs/real'), {
        tenantId: TENANT, userId: 'olly', action: 'LABEL_PRINT', entity: 'bundle', entityId: 'B1',
      }),
    );
  });

  it('never allows an audit entry to be altered or removed', async () => {
    await assertFails(deleteDoc(doc(as('alice'), 'auditLogs/real')));
  });
});

describe('licence date handling', () => {
  /*
   * The regression that blocked every customer for several rounds: the rule
   * compared `request.time` against `graceUntil`, an ISO string. Comparing a
   * timestamp to a string is a type error, the expression fails, and a
   * failed condition denies — so no customer could write anything, while the
   * vendor account worked fine because it short-circuits earlier.
   */
  it('lets a customer write when the licence carries millisecond dates', async () => {
    await assertSucceeds(
      setDoc(doc(as('alice'), 'departments/d1'), { tenantId: TENANT, code: 'SEW', name: 'Sewing' }),
    );
  });

  it('still lets a customer write when only ISO dates exist, rather than locking them out', async () => {
    // Legacy licences fall back to the status check. Fail-open on the date
    // is deliberate: locking a paying customer out of their own system is
    // worse than a few days of grace the vendor can correct.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `licenses/${TENANT}`), {
        plan: 'PAID',
        status: 'ACTIVE',
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        graceUntil: new Date(Date.now() + 86400000 * 8).toISOString(),
        limits: { maxFactories: 2, maxModules: 5, maxUsers: 10 },
      });
    });
    await assertSucceeds(
      setDoc(doc(as('alice'), 'departments/d2'), { tenantId: TENANT, code: 'CUT', name: 'Cutting' }),
    );
  });

  it('refuses a write once the grace period has passed', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `licenses/${TENANT}`),
        licence({
          status: 'EXPIRED',
          expiresAtMs: Date.now() - 86400000 * 30,
          graceUntilMs: Date.now() - 86400000 * 20,
        }),
      );
    });
    await assertFails(
      setDoc(doc(as('alice'), 'departments/d3'), { tenantId: TENANT, code: 'X', name: 'X' }),
    );
  });
});

describe('vendor access', () => {
  it('is granted by a vendorAdmins document', async () => {
    await assertSucceeds(getDoc(doc(as('vendor1'), `licenses/${OTHER}`)));
  });

  it('is refused without one', async () => {
    await assertFails(getDoc(doc(as('alice'), `licenses/${OTHER}`)));
  });

  it('cannot be granted from inside a tenant', async () => {
    // Otherwise any administrator could promote themselves to vendor.
    await assertFails(
      setDoc(doc(as('alice'), 'vendorAdmins/alice'), { grantedAt: new Date().toISOString() }),
    );
  });
});

describe('licence limits', () => {
  // Limits are billable, so they are enforced by the database rather than
  // by the interface. A create must move the usage counter by exactly one
  // and stay inside the licensed number.

  const factory = (n: string) => ({ tenantId: TENANT, code: n, name: n });

  it('allows a factory create inside the licence', async () => {
    const db = as('alice');
    const batch = writeBatch(db);
    batch.set(doc(db, 'factories/f2'), factory('F2'));
    batch.set(doc(db, `tenantUsage/${TENANT}`), { factories: 2 }, { merge: true });
    await assertSucceeds(batch.commit());
  });

  it('allows a plain create when the counter has room, without a batch', async () => {
    // The limit is read from the counter as it stands, so a create does not
    // have to be batched with the counter update for the rules to pass. The
    // client still batches them, to keep the count honest.
    await assertSucceeds(setDoc(doc(as('alice'), 'factories/f2b'), factory('F2B')));
  });

  it('refuses a factory create that would exceed the licence', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `tenantUsage/${TENANT}`),
        { tenantId: TENANT, factories: 2, modules: 0, users: 4 },
      );
    });
    const db = as('alice');
    const batch = writeBatch(db);
    batch.set(doc(db, 'factories/f3'), factory('F3'));
    batch.set(doc(db, `tenantUsage/${TENANT}`), { factories: 3 }, { merge: true });
    await assertFails(batch.commit());
  });

  it('accepts a counter moved with increment(), since the rule reads the stored value', async () => {
    /*
     * Kept as a regression test. An earlier version compared the result of
     * the write using getAfter(), which cannot see through a field
     * transform — so every create using increment() was refused, and the
     * new record appeared on screen and then vanished on rollback.
     */
    const db = as('alice');
    const batch = writeBatch(db);
    batch.set(doc(db, 'factories/f7'), factory('F7'));
    batch.set(doc(db, `tenantUsage/${TENANT}`), { factories: increment(1) }, { merge: true });
    await assertSucceeds(batch.commit());
  });

  it('refuses a factory create by a manager — top role only', async () => {
    const db = as('bob');
    await assertFails(setDoc(doc(db, 'factories/f6'), factory('F6')));
  });

  it('refuses a user create beyond the licensed count', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `tenantUsage/${TENANT}`),
        { tenantId: TENANT, factories: 1, modules: 0, users: 10 },
      );
    });
    const db = as('alice');
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/newbie'), profile(TENANT, { role: 'OPERATOR' }));
    batch.set(doc(db, `tenantUsage/${TENANT}`), { users: 11 }, { merge: true });
    await assertFails(batch.commit());
  });

  it('refuses an admin placing a user into another tenant', async () => {
    // This is the fault that started all of it: customer administrators
    // ending up inside the vendor's tenant.
    const db = as('alice');
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/stray'), profile(OTHER, { role: 'SYSTEM_ADMIN' }));
    batch.set(doc(db, `tenantUsage/${TENANT}`), { users: 5 }, { merge: true });
    await assertFails(batch.commit());
  });
});

describe('WIP counters', () => {
  const counter = { tenantId: TENANT, factoryId: 'f1', moduleId: 'M1', pieces: 25, bundles: 1 };

  // Regression: the rule required IN access, but WIP falls on the way out
  // as well as rising on the way in. An OUT-only operator had the whole
  // atomic batch rejected, taking the scan with it.
  it('lets an OUT-only operator write the WIP counter', async () => {
    await assertSucceeds(setDoc(doc(as('olga'), 'moduleWip/M1'), counter));
  });

  it('lets an IN-only operator write the WIP counter', async () => {
    await assertSucceeds(setDoc(doc(as('olly'), 'moduleWip/M1'), counter));
  });

  it('refuses a counter write from another tenant', async () => {
    await assertFails(setDoc(doc(as('bob'), 'moduleWip/M1'), counter));
  });

  it('never allows a counter to be deleted', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'moduleWip/M1'), counter);
    });
    await assertFails(deleteDoc(doc(as('alice'), 'moduleWip/M1')));
  });
});

describe('bundles', () => {
  it('refuses an update that changes the quantity', async () => {
    await assertFails(
      setDoc(
        doc(as('alice'), 'bundles/B1'),
        { tenantId: TENANT, poLineId: 'l1', qty: 999, status: 'IN_MODULE' },
        { merge: true },
      ),
    );
  });

  it('never allows a bundle to be deleted', async () => {
    await assertFails(deleteDoc(doc(as('alice'), 'bundles/B1')));
  });
});

describe('licensing', () => {
  it('refuses writes once the licence has expired past grace', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `licenses/${TENANT}`),
        licence({
          status: 'EXPIRED',
          expiresAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          graceUntil: new Date(Date.now() - 86400000 * 20).toISOString(),
        }),
      );
    });

    await assertFails(
      setDoc(doc(as('alice'), 'factories/f9'), { tenantId: TENANT, code: 'X', name: 'X' }),
    );
    // Reads keep working — expiry is read-only, not lockout.
    await assertSucceeds(getDoc(doc(as('alice'), 'factories/f1')));
  });

  it('refuses a customer editing their own licence', async () => {
    await assertFails(
      setDoc(doc(as('alice'), `licenses/${TENANT}`), licence({ expiresAt: '2099-01-01T00:00:00Z' })),
    );
  });
});
