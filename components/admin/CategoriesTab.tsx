"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
  setCategoryActive,
} from "@/app/admin/actions";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";
import {
  cx,
  AppBar,
  btnGhost,
  btnPrimary,
  ErrorText,
  inputClass,
  PageHeading,
  Switch,
  useOptimisticToggle,
  useSave,
} from "./ui";

export interface AdminCategoryRow {
  id: string;
  name: string;
  is_active: boolean;
  itemCount: number;
}

/**
 * Categories: drag to set the menu's section order, add, rename and delete. Renaming is a field on
 * desktop and a Rename button on the phone. Each also has a switch to hide it from the menu.
 */
export function CategoriesTab({ categories }: { categories: AdminCategoryRow[] }) {
  return (
    <div className="lg:max-w-[760px] lg:px-10 lg:py-8">
      <AppBar
        title="Categories"
        action={
          <Link href="/admin?tab=items" className={cx(`${btnGhost} px-3`)}>
            Done
          </Link>
        }
      />
      <PageHeading title="Categories" subtitle="Order here is the order customers see." />
      <SortableList
        items={categories}
        onReorder={reorderCategories}
        renderItem={(category, handle) => <CategoryRow category={category} handle={handle} />}
      />
      <AddCategory />
      <p className="px-5 text-xs text-admin-muted lg:hidden">Category order is the order customers see on the menu.</p>
    </div>
  );
}

function CategoryRow({ category, handle }: { category: AdminCategoryRow; handle: Omit<DragHandleProps, "label"> }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const rename = useSave();
  const remove = useSave();
  const { shown, toggle, error: toggleError } = useOptimisticToggle(category.is_active, (next) =>
    setCategoryActive(category.id, next),
  );
  const count = `${category.itemCount} ${category.itemCount === 1 ? "item" : "items"}`;

  const saveName = () => {
    if (name.trim() === category.name) return setRenaming(false);
    rename.save(
      () => renameCategory(category.id, name),
      () => setRenaming(false),
    );
  };

  const onDelete = () => {
    if (category.itemCount > 0) {
      window.alert(`Move or delete the ${count} in ${category.name} first.`);
      return;
    }
    if (window.confirm(`Delete the ${category.name} category?`)) remove.save(() => deleteCategory(category.id));
  };

  return (
    <div className="border-b border-admin-divider">
      <div className="grid min-h-[60px] grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 pr-5 pl-2 lg:grid-cols-[24px_minmax(0,1fr)_100px_auto_auto] lg:gap-4 lg:px-0">
        <DragHandle label={`Move ${category.name}`} {...handle} />

        {/* Phone: name and count, with an inline field while renaming. */}
        <div className="min-w-0 lg:hidden">
          {renaming ? (
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                saveName();
              }}
              className="flex gap-2 py-2"
            >
              <input
                aria-label={`New name for ${category.name}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={cx(`${inputClass} min-h-11`)}
              />
              <button type="submit" disabled={rename.pending} className={btnGhost}>
                Save
              </button>
            </form>
          ) : (
            <div className="flex flex-col">
              <span className={`truncate text-base font-extrabold ${shown ? "" : "text-admin-muted"}`}>{category.name}</span>
              <span className="text-xs text-admin-muted">
                {count}
                {!shown && " · hidden from the menu"}
              </span>
            </div>
          )}
        </div>

        {/* Desktop: the name is the field. */}
        <div className="hidden lg:block">
          <InlineName value={category.name} label={`Name of the ${category.name} category`} onSave={(value) => renameCategory(category.id, value)} />
        </div>
        <span className="hidden text-[13px] text-admin-muted lg:block">{count}</span>

        <button
          type="button"
          onClick={() => {
            setName(category.name);
            setRenaming(!renaming);
          }}
          className={cx(`${btnGhost} lg:hidden`)}
        >
          {renaming ? "Cancel" : "Rename"}
        </button>
        <span className="hidden lg:block">
          <Switch checked={shown} onChange={toggle} label={`Show ${category.name} on the menu`} />
        </span>
        <button type="button" disabled={remove.pending} onClick={onDelete} className={cx(`${btnGhost} hidden lg:inline-flex`)}>
          Delete
        </button>
      </div>

      {renaming && (
        <div className="flex items-center justify-between gap-3 pr-5 pb-3 pl-9 lg:hidden">
          <span className="flex items-center gap-1 text-sm">
            Shown on the menu
            <Switch checked={shown} onChange={toggle} label={`Show ${category.name} on the menu`} />
          </span>
          <button type="button" disabled={remove.pending} onClick={onDelete} className={btnGhost}>
            Delete
          </button>
        </div>
      )}
      <ErrorText error={rename.error ?? remove.error ?? toggleError} className="px-5 pb-2 lg:px-0" />
    </div>
  );
}

/** Desktop inline rename: saves when the field loses focus or on Enter, only if it changed. */
function InlineName({
  value: saved,
  label,
  onSave,
}: {
  value: string;
  label: string;
  onSave: (value: string) => ReturnType<typeof renameCategory>;
}) {
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const { save, pending } = useSave();

  if (saved !== lastSaved && value === lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }

  return (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (value.trim() === lastSaved) return;
        save(
          () => onSave(value),
          () => setLastSaved(value.trim()),
        );
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={`min-h-11 w-full rounded-lg border border-transparent bg-transparent px-2 text-base font-extrabold outline-none hover:border-admin-divider focus-visible:border-accent ${
        pending ? "opacity-60" : ""
      }`}
    />
  );
}

function AddCategory() {
  const [name, setName] = useState("");
  const { save, pending, error } = useSave();
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save(
          () => createCategory(name),
          () => setName(""),
        );
      }}
      noValidate
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-5 py-4 lg:px-0 lg:pt-2"
    >
      <input
        aria-label="New category name"
        placeholder="New category"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={cx(`${inputClass} lg:min-h-11`)}
      />
      <button type="submit" disabled={pending} className={cx(`${btnPrimary} lg:min-h-11`)}>
        <span className="lg:hidden">Add</span>
        <span className="hidden lg:inline">Add category</span>
      </button>
      <ErrorText error={error} className="col-span-2" />
    </form>
  );
}
