import type { MenuItemView, OptionGroupView } from './menu';
import type { SelectedOption } from './types';

/** Chosen option ids, keyed by option group id. */
export type Selection = Record<string, string[]>;

const minSelect = (group: OptionGroupView) =>
  group.is_required ? Math.max(1, group.min_select) : group.min_select;

export function toggleOption(selection: Selection, group: OptionGroupView, optionId: string): Selection {
  const current = selection[group.id] ?? [];
  if (group.selection_type === 'single') return { ...selection, [group.id]: [optionId] };
  if (current.includes(optionId)) {
    return { ...selection, [group.id]: current.filter((id) => id !== optionId) };
  }
  if (isGroupFull(selection, group)) return selection;
  return { ...selection, [group.id]: [...current, optionId] };
}

/** A multi-select group at its max_select: remaining options can't be ticked. */
export function isGroupFull(selection: Selection, group: OptionGroupView): boolean {
  return (
    group.selection_type === 'multi' &&
    group.max_select !== null &&
    (selection[group.id] ?? []).length >= group.max_select
  );
}

/** Why each group isn't complete yet, keyed by group id. Empty when the item can go in the cart. */
export function selectionErrors(item: MenuItemView, selection: Selection): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const group of item.option_groups) {
    const count = (selection[group.id] ?? []).length;
    const min = minSelect(group);
    if (count < min) {
      errors[group.id] = group.selection_type === 'single' ? 'Choose one' : `Choose at least ${min}`;
    } else if (group.max_select !== null && count > group.max_select) {
      errors[group.id] = `Choose up to ${group.max_select}`;
    }
  }
  return errors;
}

/** Shown beside the group name: "Required", "Optional · up to 5", "Choose 1–3". */
export function groupHint(group: OptionGroupView): string {
  if (group.selection_type === 'single') return group.is_required ? 'Required' : 'Optional';
  const min = minSelect(group);
  const max = group.max_select;
  if (min > 0) {
    if (max === null) return `Choose at least ${min}`;
    return min === max ? `Choose ${min}` : `Choose ${min}–${max}`;
  }
  return max === null ? 'Optional' : `Optional · up to ${max}`;
}

/** The chosen options in menu order, as stored on a cart line. Skips anything no longer available. */
export function selectedOptions(item: MenuItemView, selection: Selection): SelectedOption[] {
  return item.option_groups.flatMap((group) =>
    group.options
      .filter((option) => option.is_available && (selection[group.id] ?? []).includes(option.id))
      .map((option) => ({ option_id: option.id, name: option.name, price_delta: option.price_delta })),
  );
}
