import { describe, expect, it } from 'vitest';
import { formatNaira, formatNairaRange } from './format';

describe('formatNaira', () => {
  it('formats whole naira with a thousands separator', () => {
    expect(formatNaira(3000)).toBe('₦3,000');
    expect(formatNaira(300)).toBe('₦300');
    expect(formatNaira(0)).toBe('₦0');
    expect(formatNaira(1_250_000)).toBe('₦1,250,000');
  });
});

describe('formatNairaRange', () => {
  it('shows the lowest and highest amount', () => {
    expect(formatNairaRange([800, 200, 2500])).toBe('₦200–₦2,500');
  });

  it('collapses to one amount when they are all the same', () => {
    expect(formatNairaRange([300, 300])).toBe('₦300');
  });
});
