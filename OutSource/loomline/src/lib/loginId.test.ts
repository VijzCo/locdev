import { describe, expect, it } from 'vitest';
import {
  buildLoginEmail,
  displayLogin,
  isUsernameLogin,
  normaliseUsername,
  resolveLoginIdentifier,
  validateUsername,
} from './loginId';

describe('buildLoginEmail', () => {
  it('turns a username into an address', () => {
    expect(buildLoginEmail('m01')).toBe('m01@loomline.login');
  });

  it('is case-insensitive, so M01 and m01 are the same person', () => {
    expect(buildLoginEmail('M01')).toBe(buildLoginEmail('m01'));
  });

  it('ignores stray spaces from a paste or a scanner', () => {
    expect(buildLoginEmail(' m01 ')).toBe('m01@loomline.login');
  });
});

describe('resolveLoginIdentifier', () => {
  it('treats a plain name as a username', () => {
    expect(resolveLoginIdentifier('m01')).toBe('m01@loomline.login');
  });

  it('passes a real email straight through', () => {
    // Vendor staff and administrators sign up with real addresses so they
    // can reset their own passwords. One field has to serve both.
    expect(resolveLoginIdentifier('director@acme.com')).toBe('director@acme.com');
  });

  it('lowercases either kind', () => {
    expect(resolveLoginIdentifier('Director@Acme.com')).toBe('director@acme.com');
    expect(resolveLoginIdentifier('M01')).toBe('m01@loomline.login');
  });
});

describe('displayLogin', () => {
  it('shows the username for a synthetic login', () => {
    expect(displayLogin('m01@loomline.login')).toBe('m01');
  });

  it('shows a real address unchanged', () => {
    expect(displayLogin('director@acme.com')).toBe('director@acme.com');
  });
});

describe('isUsernameLogin', () => {
  it('distinguishes the two kinds of account', () => {
    expect(isUsernameLogin('m01@loomline.login')).toBe(true);
    expect(isUsernameLogin('director@acme.com')).toBe(false);
  });
});

describe('validateUsername', () => {
  it('accepts the names a factory would use', () => {
    expect(validateUsername('m01')).toBeNull();
    expect(validateUsername('a.supervisor')).toBeNull();
    expect(validateUsername('cutting_01')).toBeNull();
  });

  it('rejects spaces and suggests what to use instead', () => {
    expect(validateUsername('john smith')).toContain('a.smith');
  });

  it('rejects an email, since this field is not for one', () => {
    expect(validateUsername('a@b.com')).toContain('not an email');
  });

  it('rejects a name starting with punctuation', () => {
    expect(validateUsername('.m01')).not.toBeNull();
  });

  it('rejects an empty value', () => {
    expect(validateUsername('  ')).toContain('required');
  });
});

describe('normaliseUsername', () => {
  it('trims and lowercases but keeps inner spaces for validation to catch', () => {
    expect(normaliseUsername(' John Smith ')).toBe('john smith');
  });
});
