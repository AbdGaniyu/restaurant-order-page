import { describe, expect, it } from 'vitest';
import posPricesJson from '@/data/pos-prices.json';
import { formatNaira } from './format';
import { WEEKDAYS } from './hours';
import { buildMenuView, cardPriceLabel, getMenu, type MenuItemView } from './menu';
import { sampleMenu } from './test-fixtures';

const menu = await getMenu();
const view = buildMenuView(menu);
const items = view.flatMap((category) => category.items);

/** POS SKU → till price, from Yakoyo's POS export (Item List, 11 Sep 2026). The oracle every menu price is checked against. */
const posPrices: Record<string, number> = posPricesJson;

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

/** For items without their own pos_name: the required single-select group whose options are the SKUs. */
const sizingGroup = (item: MenuItemView) =>
  item.option_groups.find(
    (group) =>
      group.selection_type === 'single' &&
      group.is_required &&
      group.options.some((option) => option.pos_name !== null),
  );

describe('menu.json integrity', () => {
  it('has unique ids in every table', () => {
    for (const rows of [menu.categories, menu.menu_items, menu.option_groups, menu.options]) {
      expect(new Set(ids(rows)).size).toBe(rows.length);
    }
  });

  it('only references rows that exist', () => {
    const categoryIds = new Set(ids(menu.categories));
    const itemIds = new Set(ids(menu.menu_items));
    const groupIds = new Set(ids(menu.option_groups));
    for (const item of menu.menu_items) expect(categoryIds, item.id).toContain(item.category_id);
    for (const option of menu.options) expect(groupIds, option.id).toContain(option.option_group_id);
    for (const link of menu.menu_item_option_groups) {
      expect(itemIds).toContain(link.menu_item_id);
      expect(groupIds).toContain(link.option_group_id);
    }
  });

  it('stores prices as whole naira', () => {
    for (const { id, price } of menu.menu_items) {
      expect(Number.isInteger(price) && price >= 0, id).toBe(true);
    }
    for (const { id, price_delta } of menu.options) {
      expect(Number.isInteger(price_delta) && price_delta >= 0, id).toBe(true);
    }
  });

  it('has consistent selection rules on every option group', () => {
    for (const group of menu.option_groups) {
      const optionCount = menu.options.filter((o) => o.option_group_id === group.id).length;
      expect(['single', 'multi'], group.id).toContain(group.selection_type);
      expect(optionCount, group.id).toBeGreaterThan(0);
      expect(group.min_select, group.id).toBe(group.is_required ? Math.max(1, group.min_select) : 0);
      if (group.selection_type === 'single') expect(group.max_select, group.id).toBe(1);
      if (group.max_select !== null) {
        expect(group.max_select, group.id).toBeGreaterThanOrEqual(group.min_select);
        expect(group.max_select, group.id).toBeLessThanOrEqual(optionCount);
      }
    }
  });

  it('lists opening and delivery hours for every weekday as HH:MM ranges', () => {
    const { opening_hours, delivery_hours } = menu.business_settings;
    for (const hours of [opening_hours, delivery_hours]) {
      expect(Object.keys(hours).sort()).toEqual([...WEEKDAYS].sort());
      for (const range of Object.values(hours).flat()) {
        expect(range).toEqual([expect.stringMatching(/^\d{2}:\d{2}$/), expect.stringMatching(/^\d{2}:\d{2}$/)]);
      }
    }
  });
});

describe('menu view', () => {
  it('includes every item in an active category', () => {
    const activeCategoryIds = new Set(menu.categories.filter((c) => c.is_active).map((c) => c.id));
    expect(items).toHaveLength(menu.menu_items.filter((i) => activeCategoryIds.has(i.category_id)).length);
  });

  it('drops inactive categories', () => {
    const hidden = menu.categories[0].id;
    const categories = menu.categories.map((c) => (c.id === hidden ? { ...c, is_active: false } : c));
    expect(buildMenuView({ ...menu, categories }).map((c) => c.id)).not.toContain(hidden);
  });

  // The rules below are exercised on the small sample menu, which has a sold-out item and a shared add-on group.
  const sampleItems = buildMenuView(sampleMenu).flatMap((category) => category.items);

  it('keeps sold-out items on the menu', () => {
    expect(sampleItems.find((item) => item.id === 'item-beef-shawarma')?.is_available).toBe(false);
  });

  it('attaches shared option groups to every item that uses them, in sort order', () => {
    const eba = sampleItems.find((item) => item.id === 'item-eba-semo')!;
    expect(eba.option_groups.map((g) => g.name)).toEqual(['Eba or Semo', 'Choose soup', 'Protein add-ons']);
    const withAddons = sampleItems.filter((item) => item.option_groups.some((g) => g.id === 'grp-protein-addons'));
    expect(withAddons.map((item) => item.id)).toEqual(['item-amala', 'item-eba-semo', 'item-pounded-yam']);
  });
});

describe('every item renders with the correct price', () => {
  it.each(items)('$name', (item) => {
    // The cheapest orderable SKU, read from the POS rather than recomputed from menu.json.
    const expected =
      item.pos_name !== null
        ? formatNaira(posPrices[item.pos_name])
        : `from ${formatNaira(
            Math.min(
              ...sizingGroup(item)!
                .options.filter((option) => option.is_available)
                .map((option) => posPrices[option.pos_name!]),
            ),
          )}`;
    expect(cardPriceLabel(item)).toBe(expected);
  });
});

describe('every item and option resolves to a POS price', () => {
  it.each(items)('$name', (item) => {
    const sizing = item.pos_name === null ? sizingGroup(item) : undefined;

    if (item.pos_name !== null) {
      expect(posPrices[item.pos_name], `POS SKU "${item.pos_name}"`).toBe(item.price);
    } else {
      expect(sizing, 'no pos_name, so it needs a required size/portion group of POS SKUs').toBeDefined();
    }

    for (const group of item.option_groups) {
      for (const option of group.options) {
        const label = `${group.name} → ${option.name}`;
        if (group === sizing) {
          // A size/portion option is the whole SKU: base + delta must equal its till price.
          expect(option.pos_name, `${label} needs a pos_name`).not.toBeNull();
          expect(posPrices[option.pos_name!], `${label} (${option.pos_name})`).toBe(item.price + option.price_delta);
        } else if (option.pos_name !== null) {
          // An add-on is its own SKU rung up alongside the item.
          expect(posPrices[option.pos_name], `${label} (${option.pos_name})`).toBe(option.price_delta);
        } else {
          expect(option.price_delta, `${label} has a price but no POS SKU`).toBe(0);
        }
      }
    }
  });
});
