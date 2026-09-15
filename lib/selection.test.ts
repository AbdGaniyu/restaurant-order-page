import { describe, expect, it } from 'vitest';
import { buildMenuView, type OptionGroupView } from './menu';
import { groupHint, isGroupFull, selectedOptions, selectionErrors, toggleOption } from './selection';
import { sampleMenu } from './test-fixtures';

const items = buildMenuView(sampleMenu).flatMap((category) => category.items);
const item = (id: string) => items.find((i) => i.id === id)!;
const group = (itemId: string, groupId: string) => item(itemId).option_groups.find((g) => g.id === groupId)!;

const amala = item('item-amala');
const soup = group('item-amala', 'grp-soup');
const addons = group('item-amala', 'grp-protein-addons');

describe('toggleOption', () => {
  it('replaces the choice in a single-select group', () => {
    const first = toggleOption({}, soup, 'opt-soup-abula');
    expect(toggleOption(first, soup, 'opt-soup-ewedu')).toEqual({ 'grp-soup': ['opt-soup-ewedu'] });
  });

  it('ticks and unticks in a multi-select group', () => {
    const ticked = toggleOption({}, addons, 'opt-addon-goat');
    expect(ticked['grp-protein-addons']).toEqual(['opt-addon-goat']);
    expect(toggleOption(ticked, addons, 'opt-addon-goat')['grp-protein-addons']).toEqual([]);
  });

  it('stops at max_select', () => {
    const twoMax: OptionGroupView = { ...addons, max_select: 2 };
    let selection = toggleOption({}, twoMax, 'opt-addon-goat');
    selection = toggleOption(selection, twoMax, 'opt-addon-beef');
    expect(isGroupFull(selection, twoMax)).toBe(true);
    expect(toggleOption(selection, twoMax, 'opt-addon-ponmo')).toBe(selection);
  });
});

describe('selectionErrors', () => {
  it('flags required groups with nothing chosen', () => {
    expect(selectionErrors(amala, {})).toEqual({ 'grp-soup': 'Choose one' });
  });

  it('passes once required groups are filled; optional ones can stay empty', () => {
    expect(selectionErrors(amala, { 'grp-soup': ['opt-soup-abula'] })).toEqual({});
  });

  it('enforces min_select on multi-select groups', () => {
    const needsTwo = { ...amala, option_groups: [{ ...addons, is_required: true, min_select: 2 }] };
    expect(selectionErrors(needsTwo, { 'grp-protein-addons': ['opt-addon-goat'] })).toEqual({
      'grp-protein-addons': 'Choose at least 2',
    });
  });
});

describe('groupHint', () => {
  it('describes each kind of group', () => {
    expect(groupHint(soup)).toBe('Required');
    expect(groupHint({ ...soup, is_required: false, min_select: 0 })).toBe('Optional');
    expect(groupHint(addons)).toBe('Optional · up to 5');
    expect(groupHint({ ...addons, max_select: null })).toBe('Optional');
    expect(groupHint({ ...addons, is_required: true, min_select: 1, max_select: 3 })).toBe('Choose 1–3');
    expect(groupHint({ ...addons, is_required: true, min_select: 2, max_select: 2 })).toBe('Choose 2');
  });
});

describe('selectedOptions', () => {
  it('returns choices in menu order with their prices', () => {
    const selection = {
      'grp-protein-addons': ['opt-addon-ponmo', 'opt-addon-goat'],
      'grp-soup': ['opt-soup-abula'],
    };
    expect(selectedOptions(amala, selection)).toEqual([
      { option_id: 'opt-soup-abula', name: 'Ewedu & Gbegiri (Abula)', price_delta: 0 },
      { option_id: 'opt-addon-goat', name: 'Goat meat', price_delta: 1500 },
      { option_id: 'opt-addon-ponmo', name: 'Ponmo', price_delta: 500 },
    ]);
  });

  it('skips options that are sold out', () => {
    expect(selectedOptions(item('item-fresh-fish'), { 'grp-fresh-fish-size': ['opt-fish-7k'] })).toEqual([]);
  });
});
