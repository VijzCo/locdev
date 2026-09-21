import { collection, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { buildSlotsWithBreaks } from '@/time/slots';
import { db } from '@/lib/firebase';

/**
 * Seed data from §41. Written as one batch so a failure leaves nothing
 * behind, and with deterministic document ids so running it twice replaces
 * the same records rather than creating a second copy of the factory.
 *
 * Everything it writes carries `seeded: true`, which is what `clearDemoData`
 * looks for — real production records are never touched.
 */

const SEED_FLAG = { seeded: true };

interface SeedResult {
  factories: number;
  departments: number;
  sections: number;
  modules: number;
  styles: number;
}

export async function seedDemoData(tenantId: string): Promise<SeedResult> {
  if (!db) throw new Error('Connect a Firebase project first.');

  const batch = writeBatch(db);
  const id = (prefix: string, key: string) => `seed_${tenantId}_${prefix}_${key}`;

  /* Two factories, so cross-factory isolation is visible immediately and
     identical module codes in different factories can be checked. */
  const factories = [
    { key: 'nf', code: 'NF', name: 'Northfield Mill', timezone: 'Africa/Maseru' },
    { key: 'rv', code: 'RV', name: 'Riverside Plant', timezone: 'Africa/Maseru' },
  ];

  factories.forEach((f) => {
    batch.set(doc(db!, 'factories', id('factory', f.key)), {
      tenantId,
      code: f.code,
      name: f.name,
      timezone: f.timezone,
      active: true,
      ...SEED_FLAG,
    });
  });

  const departments = [
    { key: 'nf-cut', factory: 'nf', code: 'CUT', name: 'Cutting', stage: 'CUTTING' },
    { key: 'nf-sew', factory: 'nf', code: 'SEW', name: 'Sewing', stage: 'SEWING' },
    { key: 'nf-fin', factory: 'nf', code: 'FIN', name: 'Finishing', stage: 'FINISHING' },
    { key: 'rv-sew', factory: 'rv', code: 'SEW', name: 'Sewing', stage: 'SEWING' },
  ];

  departments.forEach((d) => {
    batch.set(doc(db!, 'departments', id('dept', d.key)), {
      tenantId,
      factoryId: id('factory', d.factory),
      code: d.code,
      name: d.name,
      stage: d.stage,
      active: true,
      ...SEED_FLAG,
    });
  });

  const sections = [
    { key: 'nf-a', dept: 'nf-sew', factory: 'nf', code: 'S01', name: 'Section A' },
    { key: 'nf-b', dept: 'nf-sew', factory: 'nf', code: 'S02', name: 'Section B' },
    { key: 'nf-cut', dept: 'nf-cut', factory: 'nf', code: 'C01', name: 'Cutting floor' },
    { key: 'rv-a', dept: 'rv-sew', factory: 'rv', code: 'S01', name: 'Section A' },
  ];

  sections.forEach((s) => {
    batch.set(doc(db!, 'sections', id('section', s.key)), {
      tenantId,
      factoryId: id('factory', s.factory),
      departmentId: id('dept', s.dept),
      code: s.code,
      name: s.name,
      active: true,
      ...SEED_FLAG,
    });
  });

  /* M01 appears in both factories on purpose — §32 requires the system to
     tell identical module codes apart across factories. */
  const modules = [
    { key: 'nf-m01', section: 'nf-a', dept: 'nf-sew', factory: 'nf', code: 'M01', name: 'Module 01', operators: 24 },
    { key: 'nf-m02', section: 'nf-a', dept: 'nf-sew', factory: 'nf', code: 'M02', name: 'Module 02', operators: 22 },
    { key: 'nf-m03', section: 'nf-b', dept: 'nf-sew', factory: 'nf', code: 'M03', name: 'Module 03', operators: 20 },
    { key: 'nf-c01', section: 'nf-cut', dept: 'nf-cut', factory: 'nf', code: 'C01', name: 'Cutting 01', operators: 8 },
    { key: 'rv-m01', section: 'rv-a', dept: 'rv-sew', factory: 'rv', code: 'M01', name: 'Module 01', operators: 18 },
  ];

  modules.forEach((m) => {
    batch.set(doc(db!, 'modules', id('module', m.key)), {
      tenantId,
      factoryId: id('factory', m.factory),
      departmentId: id('dept', m.dept),
      sectionId: id('section', m.section),
      code: m.code,
      name: m.name,
      operatorCount: m.operators,
      active: true,
      ...SEED_FLAG,
    });
  });

  const styles = [
    {
      key: 'st1001',
      code: 'ST-1001',
      description: 'Long sleeve polo',
      smv: 14.5,
      colours: ['Navy', 'White', 'Charcoal'],
      sizes: ['S', 'M', 'L', 'XL'],
    },
    {
      key: 'st1002',
      code: 'ST-1002',
      description: 'Cotton crew tee',
      smv: 8.2,
      colours: ['Black', 'Sand'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
  ];

  styles.forEach((s) => {
    batch.set(doc(db!, 'styles', id('style', s.key)), {
      tenantId,
      code: s.code,
      description: s.description,
      smv: s.smv,
      colours: s.colours,
      sizes: s.sizes,
      routeStages: ['CUTTING', 'SEWING'],
      active: true,
      ...SEED_FLAG,
    });
  });

  /* A day shift per factory, with a lunch break. Without a shift every
     slot reads as closed and scanning is blocked, so the demo data would
     look broken rather than empty. */
  /* Two breaks of different lengths, which is what a real factory has and
     what the old whole-hour model could not express. */
  const breaks = [
    { name: 'Tea', startMinute: 10 * 60, endMinute: 10 * 60 + 15, paid: true },
    { name: 'Lunch', startMinute: 12 * 60 + 30, endMinute: 13 * 60 + 30, paid: false },
  ];

  factories.forEach((f) => {
    batch.set(doc(db!, 'shifts', id('shift', f.key)), {
      tenantId,
      factoryId: id('factory', f.key),
      name: 'Shift A',
      startMinute: 8 * 60,
      endMinute: 17 * 60,
      crossesMidnight: false,
      breaks,
      slots: buildSlotsWithBreaks(8 * 60, 17 * 60, 60, breaks),
      active: true,
      ...SEED_FLAG,
    });
  });

  /* A module-level WIP override, so the inheritance indicators on the
     configuration screens have something real to show. */
  batch.set(doc(db!, 'configOverrides', `module_${id('module', 'nf-m02')}`), {
    tenantId,
    scope: 'MODULE',
    scopeId: id('module', 'nf-m02'),
    values: { 'wip.max': 200, 'wip.reorder': 80 },
  });

  /* Factories and modules are counted against the licence, so the seeder
     has to move the counter like any other create. Without this the rules
     refuse the whole batch and demo data silently fails to load. */
  const usageSnap = await getDoc(doc(db, 'tenantUsage', tenantId));
  const current = usageSnap.exists() ? usageSnap.data() : {};
  batch.set(
    doc(db, 'tenantUsage', tenantId),
    {
      tenantId,
      factories: (current.factories ?? 0) + factories.length,
      modules: (current.modules ?? 0) + modules.length,
    },
    { merge: true },
  );

  await batch.commit();

  return {
    factories: factories.length,
    departments: departments.length,
    sections: sections.length,
    modules: modules.length,
    styles: styles.length,
  };
}

/** Removes only records the seeder created. Real data is never touched. */
export async function clearDemoData(tenantId: string): Promise<number> {
  if (!db) throw new Error('Connect a Firebase project first.');

  const names = ['factories', 'departments', 'sections', 'modules', 'styles', 'shifts'];
  let removed = 0;

  for (const name of names) {
    const snap = await getDocs(
      query(
        collection(db, name),
        where('tenantId', '==', tenantId),
        where('seeded', '==', true),
      ),
    );
    if (snap.empty) continue;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));

    // Counted collections must give their allowance back on removal.
    if (name === 'factories' || name === 'modules') {
      const usageSnap = await getDoc(doc(db!, 'tenantUsage', tenantId));
      const current = (usageSnap.exists() ? usageSnap.data() : {})[name] ?? 0;
      batch.set(
        doc(db!, 'tenantUsage', tenantId),
        { tenantId, [name]: Math.max(0, current - snap.size) },
        { merge: true },
      );
    }

    await batch.commit();
    removed += snap.size;
  }

  return removed;
}
