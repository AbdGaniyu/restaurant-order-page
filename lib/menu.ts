import menuJson from '@/data/menu.json';
import { formatNaira } from './format';
import type { Category, MenuData, MenuItem, Option, OptionGroup } from './types';

/** Week 1 reads the bundled JSON. Week 2 replaces this body with Supabase queries returning the same rows. */
export async function getMenu(): Promise<MenuData> {
  return menuJson as MenuData;
}

export type OptionGroupView = OptionGroup & { options: Option[] };
export type MenuItemView = MenuItem & { option_groups: OptionGroupView[] };
export type CategoryView = Category & { items: MenuItemView[] };

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

/**
 * Joins the flat tables into the nested shape the menu page renders.
 * Inactive categories drop out; sold-out items and options stay in so the page can grey them.
 */
export function buildMenuView(menu: MenuData): CategoryView[] {
  const optionsByGroup = groupBy(menu.options, (option) => option.option_group_id);
  const groupsById = new Map(
    menu.option_groups.map((group) => [
      group.id,
      { ...group, options: (optionsByGroup.get(group.id) ?? []).sort(bySortOrder) },
    ]),
  );
  const linksByItem = groupBy(menu.menu_item_option_groups, (link) => link.menu_item_id);
  const itemsByCategory = groupBy(menu.menu_items, (item) => item.category_id);

  return menu.categories
    .filter((category) => category.is_active)
    .sort(bySortOrder)
    .map((category) => ({
      ...category,
      items: (itemsByCategory.get(category.id) ?? []).sort(bySortOrder).map((item) => ({
        ...item,
        option_groups: (linksByItem.get(item.id) ?? [])
          .flatMap((link) => groupsById.get(link.option_group_id) ?? [])
          .sort(bySortOrder),
      })),
    }));
}

/**
 * The lowest price a customer can actually pay for the item. Required single-select
 * groups with non-zero deltas (sizes, portions) mean the base alone isn't orderable,
 * so the card reads "from ₦X".
 */
export function startingPrice(item: MenuItemView): { amount: number; isFrom: boolean } {
  let amount = item.price;
  let isFrom = false;
  for (const group of item.option_groups) {
    if (group.selection_type !== 'single' || !group.is_required) continue;
    if (!group.options.some((option) => option.price_delta !== 0)) continue;
    const available = group.options.filter((option) => option.is_available);
    amount += Math.min(...(available.length > 0 ? available : group.options).map((o) => o.price_delta));
    isFrom = true;
  }
  return { amount, isFrom };
}

/** "₦500" or "from ₦3,000" */
export function cardPriceLabel(item: MenuItemView): string {
  const { amount, isFrom } = startingPrice(item);
  return isFrom ? `from ${formatNaira(amount)}` : formatNaira(amount);
}
