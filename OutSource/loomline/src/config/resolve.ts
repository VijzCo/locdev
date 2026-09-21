import { DEFAULTS, type ConfigKey, type ConfigValues, type ScopeLevel } from './schema';

export interface ConfigLayer {
  level: ScopeLevel;
  /** Document id backing this layer, e.g. `module_M01`. */
  ref: string | null;
  /** Shown in the interface: "Inherited from Factory". */
  label: string;
  values: Partial<ConfigValues>;
}

export interface Resolution<K extends ConfigKey> {
  value: ConfigValues[K];
  level: ScopeLevel;
  label: string;
  /** True when no layer defines the key and the built-in default is used. */
  isDefault: boolean;
}

/**
 * Precedence, most specific first:
 *
 *   module + style → module → style → section → department → factory
 *   → tenant → system defaults
 *
 * Module beats style because a module's physical constraints — how many
 * pieces will actually fit on the rack beside it — do not change when the
 * line switches style. Style still beats section, because the thing a
 * style-level override usually expresses is a property of the garment.
 *
 * The first layer that defines a key wins. Layers are sparse: a factory
 * override of one WIP threshold does not shadow the others.
 */
export const PRECEDENCE: ScopeLevel[] = [
  'MODULE_STYLE',
  'MODULE',
  'STYLE',
  'SECTION',
  'DEPARTMENT',
  'FACTORY',
  'TENANT',
  'SYSTEM',
];

export function resolveConfig<K extends ConfigKey>(
  key: K,
  layers: ConfigLayer[],
): Resolution<K> {
  for (const level of PRECEDENCE) {
    const layer = layers.find((l) => l.level === level);
    if (!layer) continue;
    const value = layer.values[key];
    if (value !== undefined && value !== null) {
      return { value: value as ConfigValues[K], level, label: layer.label, isDefault: false };
    }
  }
  return {
    value: DEFAULTS[key],
    level: 'SYSTEM',
    label: 'Built-in default',
    isDefault: true,
  };
}

/** Convenience for call sites that do not care where the value came from. */
export function readConfig<K extends ConfigKey>(key: K, layers: ConfigLayer[]): ConfigValues[K] {
  return resolveConfig(key, layers).value;
}

/**
 * Validates values that must hold a relationship to each other. Returns a
 * message per invalid key, so the settings screen can flag the field rather
 * than refusing the whole save.
 */
export function validateConfig(values: Partial<ConfigValues>, resolved: ConfigValues) {
  const errors: Partial<Record<ConfigKey, string>> = {};
  const merged = { ...resolved, ...values };

  if (merged['wip.min'] > merged['wip.reorder']) {
    errors['wip.min'] = 'Minimum cannot be above the reorder level.';
  }
  if (merged['wip.reorder'] > merged['wip.max']) {
    errors['wip.reorder'] = 'Reorder level cannot be above the maximum.';
  }
  if (merged['achievement.amberPct'] > merged['achievement.greenPct']) {
    errors['achievement.amberPct'] = 'Amber threshold must be below green.';
  }
  if (merged['efficiency.amberPct'] > merged['efficiency.greenPct']) {
    errors['efficiency.amberPct'] = 'Amber threshold must be below green.';
  }
  if (!merged['routing.stages'].includes(merged['routing.finalStage'])) {
    errors['routing.finalStage'] = 'Tracking must end at one of the tracked stages.';
  }
  if (merged['routing.stages'].length === 0) {
    errors['routing.stages'] = 'At least one stage must be tracked.';
  }

  return errors;
}
