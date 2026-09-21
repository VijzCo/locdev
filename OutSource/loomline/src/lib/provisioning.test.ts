import { describe, expect, it } from 'vitest';
import { validateEmail } from './provisioning';

describe('validateEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(validateEmail('a.smith@acme.com')).toBeNull();
    expect(validateEmail('admin+test@sub.domain.co.uk')).toBeNull();
  });

  it('accepts the synthetic domains operators use', () => {
    // Operators often have no real email, so a made-up login must pass.
    expect(validateEmail('m01.operator@northfield.local')).toBeNull();
  });

  it('trims surrounding whitespace rather than rejecting it', () => {
    expect(validateEmail('  a@b.com  ')).toBeNull();
  });

  it('rejects a bare name, which is the commonest mistake', () => {
    // "John Smith" trips the space check first, which is the more useful
    // message of the two.
    expect(validateEmail('John Smith')).toContain('spaces');
    expect(validateEmail('johnsmith')).toContain('@');
  });

  it('rejects an address with no domain', () => {
    expect(validateEmail('admin@')).not.toBeNull();
    expect(validateEmail('admin@acme')).not.toBeNull();
  });

  it('rejects internal spaces', () => {
    expect(validateEmail('a smith@acme.com')).toContain('spaces');
  });

  it('rejects an empty value', () => {
    expect(validateEmail('')).toContain('required');
    expect(validateEmail('   ')).toContain('required');
  });
});
