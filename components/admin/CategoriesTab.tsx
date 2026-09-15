"use client";

import { useState, type FormEvent } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
  setCategoryActive,
} from "@/app/admin/actions";
import { ErrorText, InlineTextInput, inputClass, primaryButton, SavingSwitch, Section, useSave } from "./controls";
import { DragHandle, SortableList } from "./SortableList";

export interface AdminCategoryRow {
  id: string;
  name: string;
  is_active: boolean;
  itemCount: number;
}

export function CategoriesTab({ categories }: { categories: AdminCategoryRow[] }) {
  return (
    <Section title="Categories">
      <p className="text-sm text-muted">
        Drag to set the order on the menu. Hidden categories keep their items but don’t show to customers.
      </p>
      <SortableList
        items={categories}
        onReorder={reorderCategories}
        className="mt-3 divide-y divide-line"
        renderItem={(category, handle) => (
          <div className="flex items-center gap-2 py-2">
            <DragHandle label={`Move ${category.name}`} {...handle} />
            <div className="min-w-0 flex-1">
              <InlineTextInput
                value={category.name}
                label={`Name of the ${category.name} category`}
                onSave={(name) => renameCategory(category.id, name)}
              />
              <p className="px-2 text-sm text-muted">
                {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
            <SavingSwitch
              checked={category.is_active}
              label={`Show ${category.name} on the menu`}
              caption={["Shown", "Hidden"]}
              onToggle={(active) => setCategoryActive(category.id, active)}
            />
            <DeleteCategory id={category.id} name={category.name} itemCount={category.itemCount} />
          </div>
        )}
      />
      <AddCategory />
    </Section>
  );
}

function DeleteCategory({ id, name, itemCount }: { id: string; name: string; itemCount: number }) {
  const { save, pending, error } = useSave();
  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={pending}
        aria-label={`Delete ${name}`}
        onClick={() => {
          if (itemCount > 0) {
            window.alert(`Move or delete the ${itemCount} ${itemCount === 1 ? "item" : "items"} in ${name} first.`);
            return;
          }
          if (window.confirm(`Delete the ${name} category?`)) save(() => deleteCategory(id));
        }}
        className="grid size-11 place-items-center text-xl text-muted"
      >
        ×
      </button>
      <ErrorText error={error} className="max-w-32 text-xs" />
    </div>
  );
}

function AddCategory() {
  const [name, setName] = useState("");
  const { save, pending, error } = useSave();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(
      () => createCategory(name),
      () => setName(""),
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-2">
      <div className="flex gap-2">
        <input
          aria-label="New category name"
          placeholder="New category, e.g. Drinks"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={primaryButton}>
          Add
        </button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}
