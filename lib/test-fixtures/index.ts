import type { MenuData } from '../types';
import sampleMenuJson from './sample-menu.json';

/**
 * A small, stable menu for logic tests (selection, cart, pricing), so they don't break
 * when Yakoyo's real menu changes. The real data/menu.json is checked by menu.test.ts.
 */
export const sampleMenu = sampleMenuJson as MenuData;
