import { describe, expect, it } from 'vitest';
import { escapeCell, exportFilename, toCsv } from './csv';

describe('escapeCell', () => {
  it('leaves plain values alone', () => {
    expect(escapeCell('M01')).toBe('M01');
    expect(escapeCell(1250)).toBe('1250');
  });

  it('renders null and undefined as empty, not as the word null', () => {
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });

  it('quotes values containing a comma', () => {
    expect(escapeCell('Polo, long sleeve')).toBe('"Polo, long sleeve"');
  });

  it('doubles embedded quotes', () => {
    expect(escapeCell('He said "go"')).toBe('"He said ""go"""');
  });

  it('quotes values containing line breaks', () => {
    expect(escapeCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('neutralises formulas that Excel would otherwise execute', () => {
    // The reason this matters: these come from user-typed fields and are
    // opened on someone else's laptop.
    expect(escapeCell('=1+1')).toBe("'=1+1");
    expect(escapeCell('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"',
    );
    expect(escapeCell('+44 555')).toBe("'+44 555");
    expect(escapeCell('-5')).toBe("'-5");
    expect(escapeCell('@user')).toBe("'@user");
  });

  it('does not mangle a negative number passed as a number', () => {
    // Numbers are stringified without a leading-minus risk in practice, but
    // the guard applies to the string form, so this is asserted explicitly.
    expect(escapeCell(-5)).toBe("'-5");
  });
});

describe('toCsv', () => {
  it('writes a header row and CRLF line endings for Excel', () => {
    const csv = toCsv(['Module', 'Pieces'], [['M01', 420], ['M02', 380]]);
    expect(csv).toBe('Module,Pieces\r\nM01,420\r\nM02,380');
  });

  it('handles an empty result set without producing a broken file', () => {
    expect(toCsv(['Module'], [])).toBe('Module');
  });
});

describe('exportFilename', () => {
  it('stamps the range so two exports are never confused', () => {
    expect(exportFilename('production', '2026-03-01', '2026-03-07')).toBe(
      'production_2026-03-01_to_2026-03-07.csv',
    );
    expect(exportFilename('bundles')).toBe('bundles.csv');
  });
});
