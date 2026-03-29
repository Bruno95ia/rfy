import { describe, it, expect } from 'vitest';
import { extractRtfPlainText } from '@/lib/org/knowledge-extract';

describe('extractRtfPlainText', () => {
  it('extrai texto legível de RTF mínimo', () => {
    const rtf = String.raw`{\rtf1\ansi\deff0 {\fonttbl {\f0 Times;}} \f0\fs24 Ol\'e1 mundo}`;
    const t = extractRtfPlainText(rtf);
    expect(t).toMatch(/Ol/);
    expect(t).toMatch(/mundo/);
  });

  it('retorna vazio se não for RTF', () => {
    expect(extractRtfPlainText('plain text')).toBe('');
  });
});
