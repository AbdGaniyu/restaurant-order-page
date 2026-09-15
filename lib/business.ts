import type { BusinessSettings } from './types';

/**
 * The per-order takeaway packs Yakoyo adds (small and big). The two-litre pack is left out:
 * it's the soup-pack container, and including it would make "₦100–₦300 each" read "₦100–₦2,000".
 */
export function takeawayPackPrices(settings: BusinessSettings): number[] {
  const { small_pack, big_pack } = settings.packaging;
  return [small_pack, big_pack].filter((price): price is number => price !== null);
}

/** The first word of the name, for short mentions in copy: "added by Yàkoyó". */
export function businessShortName(settings: BusinessSettings): string {
  return settings.name.split(' ')[0];
}
