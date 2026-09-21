import { MasterScreen } from '@/components/master/MasterScreen';
import { useTenantCollection } from '@/hooks/useTenantCollection';
import type { Department, Factory, Section } from '@/types/domain';

/**
 * The hierarchy is Factory → Department → Section → Module. Each level picks
 * its parent from the level above, so identical module codes in different
 * factories stay distinct — §32's requirement.
 */

export function Factories() {
  return (
    <MasterScreen
      title="Factories"
      description="Each factory has its own timezone, shifts and configuration."
      collectionName="factories"
      emptyMessage="No factories yet — add the first one"
      subtitle={(r) => String(r.name ?? '')}
      fields={[
        { name: 'code', label: 'Code', control: 'text', required: true, placeholder: 'NF' },
        {
          name: 'name',
          label: 'Name',
          control: 'text',
          required: true,
          placeholder: 'Northfield Mill',
        },
        {
          name: 'timezone',
          label: 'Timezone',
          control: 'text',
          placeholder: 'Africa/Maseru',
          help: 'IANA name. Drives shifts, slots and production dates.',
          defaultValue: 'Africa/Maseru',
        },
        { name: 'active', label: 'Status', control: 'toggle', defaultValue: true },
      ]}
    />
  );
}

export function Departments() {
  const { items: factories } = useTenantCollection<Factory>('factories');

  return (
    <MasterScreen
      title="Departments"
      description="Cutting, sewing, finishing. Each maps to a production stage."
      collectionName="departments"
      emptyMessage="No departments yet — add the first one"
      subtitle={(r) => String(r.name ?? '')}
      fields={[
        { name: 'code', label: 'Code', control: 'text', required: true, placeholder: 'SEW' },
        { name: 'name', label: 'Name', control: 'text', required: true, placeholder: 'Sewing' },
        {
          name: 'factoryId',
          label: 'Factory',
          control: 'select',
          required: true,
          options: (factories ?? []).map((f) => ({ value: f.id, label: f.name })),
        },
        {
          name: 'stage',
          label: 'Production stage',
          control: 'select',
          required: true,
          help: 'Which stage of the route this department represents.',
          options: [
            { value: 'RM_IN', label: 'Raw material in' },
            { value: 'CUTTING', label: 'Cutting' },
            { value: 'SEWING', label: 'Sewing' },
            { value: 'FINISHING', label: 'Finishing' },
            { value: 'PACKING', label: 'Packing' },
          ],
        },
        { name: 'active', label: 'Status', control: 'toggle', defaultValue: true },
      ]}
    />
  );
}

export function Sections() {
  const { items: departments } = useTenantCollection<Department>('departments');
  const { items: factories } = useTenantCollection<Factory>('factories');

  const factoryName = (id: unknown) =>
    factories?.find((f) => f.id === id)?.name ?? '';

  return (
    <MasterScreen
      title="Sections"
      description="Groups of modules within a department."
      collectionName="sections"
      emptyMessage="No sections yet — add the first one"
      subtitle={(r) => String(r.name ?? '')}
      fields={[
        { name: 'code', label: 'Code', control: 'text', required: true, placeholder: 'S01' },
        { name: 'name', label: 'Name', control: 'text', required: true, placeholder: 'Section A' },
        {
          name: 'departmentId',
          label: 'Department',
          control: 'select',
          required: true,
          options: (departments ?? []).map((d) => ({ value: d.id, label: d.name })),
          derive: (id) => {
            const dept = departments?.find((d) => d.id === id);
            return dept ? { factoryId: dept.factoryId } : {};
          },
        },
        {
          // Filled in from the department. A section cannot belong to a
          // different factory than its department, so asking is an
          // invitation to contradict yourself.
          name: 'factoryId',
          label: 'Factory',
          control: 'derived',
          help: 'Taken from the department.',
          displayValue: (r) => factoryName(r.factoryId),
        },
        { name: 'active', label: 'Status', control: 'toggle', defaultValue: true },
      ]}
    />
  );
}

export function Modules() {
  const { items: sections } = useTenantCollection<Section>('sections');
  const { items: departments } = useTenantCollection<Department>('departments');
  const { items: factories } = useTenantCollection<Factory>('factories');

  const departmentName = (id: unknown) =>
    departments?.find((d) => d.id === id)?.name ?? '';
  const factoryName = (id: unknown) =>
    factories?.find((f) => f.id === id)?.name ?? '';

  return (
    <MasterScreen
      title="Modules"
      description="Production lines. WIP, targets and hourly output are all measured here."
      collectionName="modules"
      emptyMessage="No modules yet — add the first one"
      subtitle={(r) => `${r.name ?? ''} · ${r.operatorCount ?? 0} operators`}
      fields={[
        { name: 'code', label: 'Code', control: 'text', required: true, placeholder: 'M01' },
        { name: 'name', label: 'Name', control: 'text', required: true, placeholder: 'Module 01' },
        {
          name: 'sectionId',
          label: 'Section',
          control: 'select',
          required: true,
          // Choosing the section settles the department and the factory.
          options: (sections ?? []).map((sec) => ({
            value: sec.id,
            label: `${sec.name} — ${departmentName(sec.departmentId)}`,
          })),
          derive: (id) => {
            const sec = sections?.find((x) => x.id === id);
            return sec ? { departmentId: sec.departmentId, factoryId: sec.factoryId } : {};
          },
        },
        {
          name: 'departmentId',
          label: 'Department',
          control: 'derived',
          help: 'Taken from the section.',
          displayValue: (r) => departmentName(r.departmentId),
        },
        {
          name: 'factoryId',
          label: 'Factory',
          control: 'derived',
          help: 'Taken from the section.',
          displayValue: (r) => factoryName(r.factoryId),
        },
        {
          name: 'operatorCount',
          label: 'Operators',
          control: 'number',
          help: 'Default headcount. A daily plan can override it.',
          defaultValue: 20,
        },
        { name: 'active', label: 'Status', control: 'toggle', defaultValue: true },
      ]}
    />
  );
}
