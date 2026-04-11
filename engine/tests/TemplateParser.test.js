import { describe, expect, it } from 'vitest';
import { getAvailableConditions, parseTemplate } from '../TemplateParser.js';

describe('TemplateParser smoke baseline', () => {
  it('replaces core case tags with provided case data', () => {
    const template = 'القضية رقم {{رقم_القضية}} لسنة {{سنة_القضية}}';
    const result = parseTemplate(template, {
      caseNumber: '80594',
      caseYear: '61',
    });

    expect(result).toContain('80594');
    expect(result).toContain('61');
    expect(result).not.toContain('{{رقم_القضية}}');
    expect(result).not.toContain('{{سنة_القضية}}');
  });

  it('exposes the documented conditional blocks list', () => {
    const conditions = getAvailableConditions();

    expect(Array.isArray(conditions)).toBe(true);
    expect(conditions).toHaveLength(8);
    expect(conditions.some((condition) => condition.tag === 'لو_حكم')).toBe(true);
  });
});
