const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 3000 → "₦3,000" */
export function formatNaira(amount: number): string {
  return naira.format(amount);
}

/** [200, 800, 2500] → "₦200–₦2,500"; all the same → "₦300". Expects a non-empty list. */
export function formatNairaRange(amounts: number[]): string {
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max ? formatNaira(min) : `${formatNaira(min)}–${formatNaira(max)}`;
}
