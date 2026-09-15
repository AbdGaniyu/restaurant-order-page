import { describe, expect, it } from 'vitest';
import { fitWithin } from './resize-image';
import {
  cleanText,
  isHexColor,
  isUuid,
  normalizeWhatsAppNumber,
  orderPrefixFor,
  parseNairaToKobo,
  parseWeeklyHours,
  slugify,
  WEEKDAY_ORDER,
} from './validation';

describe('parseNairaToKobo', () => {
  it.each([
    ['1500', 150000],
    ['1,500', 150000],
    ['₦1,500', 150000],
    [' 300 ', 30000],
    ['0', 0],
  ])('%s → %i kobo', (input, kobo) => {
    expect(parseNairaToKobo(input)).toBe(kobo);
  });

  it.each(['', 'abc', '15.50', '-200', '20000000'])('rejects %j', (input) => {
    expect(parseNairaToKobo(input)).toBeNull();
  });
});

describe('normalizeWhatsAppNumber', () => {
  it.each([
    ['0803 123 4567', '+2348031234567'],
    ['+234 803 123 4567', '+2348031234567'],
    ['2348031234567', '+2348031234567'],
    ['+44 7700 900123', '+447700900123'],
  ])('%s → %s', (input, e164) => {
    expect(normalizeWhatsAppNumber(input)).toBe(e164);
  });

  it.each(['', '12345', '+0803', 'call me'])('rejects %j', (input) => {
    expect(normalizeWhatsAppNumber(input)).toBeNull();
  });
});

describe('slugify', () => {
  it('strips accents and punctuation', () => {
    expect(slugify('Yàkoyó Abula Joint')).toBe('yakoyo-abula-joint');
    expect(slugify("  Mama's Kitchen & Grill! ")).toBe('mama-s-kitchen-grill');
  });

  it('falls back when nothing usable is left', () => {
    expect(slugify('***')).toBe('restaurant');
  });

  it('matches the slug check in the schema', () => {
    expect(slugify('x'.repeat(80) + ' y')).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('orderPrefixFor', () => {
  it.each([
    ['Sample Kitchen', 'SK'],
    ['Yàkoyó Abula Joint', 'YAJ'],
    ['Chicken Republic Lekki Phase One', 'CRL'],
    ['Suya', 'SU'],
    ['9ja', 'JA'],
    ['7', 'OR'],
  ])('%s → %s', (name, prefix) => {
    expect(orderPrefixFor(name)).toBe(prefix);
  });
});

describe('parseWeeklyHours', () => {
  const allDays = (entry: { closed: boolean; open: string; close: string }) =>
    Object.fromEntries(WEEKDAY_ORDER.map((day) => [day, entry]));

  it('builds one range per open day and none for closed days', () => {
    const hours = parseWeeklyHours({ ...allDays({ closed: false, open: '07:30', close: '23:30' }), sun: { closed: true, open: '', close: '' } });
    expect(hours?.mon).toEqual([['07:30', '23:30']]);
    expect(hours?.sun).toEqual([]);
  });

  it('allows closing past midnight', () => {
    expect(parseWeeklyHours(allDays({ closed: false, open: '18:00', close: '02:00' }))?.fri).toEqual([['18:00', '02:00']]);
  });

  it('rejects bad times, equal times and missing days', () => {
    expect(parseWeeklyHours(allDays({ closed: false, open: '25:00', close: '23:00' }))).toBeNull();
    expect(parseWeeklyHours(allDays({ closed: false, open: '09:00', close: '09:00' }))).toBeNull();
    expect(parseWeeklyHours({ mon: { closed: true, open: '', close: '' } })).toBeNull();
  });
});

describe('small checks', () => {
  it('cleanText trims, collapses spaces and enforces length', () => {
    expect(cleanText('  Jollof   rice ', 20)).toBe('Jollof rice');
    expect(cleanText('   ', 20)).toBeNull();
    expect(cleanText('x'.repeat(21), 20)).toBeNull();
    expect(cleanText(42, 20)).toBeNull();
  });

  it('isHexColor and isUuid', () => {
    expect(isHexColor('#F96406')).toBe(true);
    expect(isHexColor('orange')).toBe(false);
    expect(isUuid('912f9ba9-591f-5611-a022-93310e6ed4dc')).toBe(true);
    expect(isUuid('item-amala')).toBe(false);
  });

  it('fitWithin shrinks the longer side to 1200 and never enlarges', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 900, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
