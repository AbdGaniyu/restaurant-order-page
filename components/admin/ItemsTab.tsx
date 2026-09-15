"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  createItem,
  deleteItem,
  reorderItems,
  setItemAvailable,
  setItemPhoto,
  setItemPrice,
  setOptionAvailable,
  setOptionPrice,
  updateItem,
} from "@/app/admin/actions";
import type { Tables } from "@/lib/database.types";
import { ErrorText, inputClass, PriceInput, primaryButton, SavingSwitch, Section, secondaryButton, useSave } from "./controls";
import { PhotoUpload } from "./PhotoUpload";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";

type Item = Tables<"items">;

export interface AdminCategory {
  id: string;
  name: string;
  is_active: boolean;
  items: Item[];
}

export interface AdminOptionGroup {
  id: string;
  name: string;
  usedBy: string[];
  options: Tables<"options">[];
}

export function ItemsTab({
  restaurantId,
  slug,
  welcome,
  categories,
  optionGroups,
}: {
  restaurantId: string;
  slug: string;
  welcome: boolean;
  categories: AdminCategory[];
  optionGroups: AdminOptionGroup[];
}) {
  const [editing, setEditing] = useState<Item | null>(null);

  return (
    <>
      {welcome && (
        <div role="status" className="mt-6 rounded-2xl bg-ewedu/10 p-4">
          <p className="font-bold">Your menu is live.</p>
          <p className="mt-1 text-sm">
            Share{" "}
            <a href={`/r/${slug}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">
              your menu link
            </a>{" "}
            with customers. Add photos and more items below, and set your hours in Settings.
          </p>
        </div>
      )}

      {categories.length === 0 && (
        <p className="mt-8 text-muted">
          Items live in categories.{" "}
          <Link href="/admin?tab=categories" className="font-bold text-ink underline">
            Add a category
          </Link>{" "}
          first.
        </p>
      )}

      {categories.map((category) => (
        <Section
          key={category.id}
          title={category.name}
          action={!category.is_active && <span className="text-sm text-muted">Hidden on the menu</span>}
        >
          {category.items.length > 0 && (
            <SortableList
              items={category.items}
              onReorder={reorderItems}
              className="divide-y divide-line"
              renderItem={(item, handle) => (
                <ItemRow item={item} restaurantId={restaurantId} handle={handle} onEdit={() => setEditing(item)} />
              )}
            />
          )}
          <AddItem categoryId={category.id} categoryName={category.name} />
        </Section>
      ))}

      {optionGroups.length > 0 && (
        <Section title="Options & add-ons">
          <p className="text-sm text-muted">
            Sizes, choices and extras customers pick in the item sheet. Prices are added to the item’s price.
          </p>
          <ul className="mt-2 divide-y divide-line">
            {optionGroups.map((group) => (
              <OptionGroupRow key={group.id} group={group} />
            ))}
          </ul>
        </Section>
      )}

      {editing && (
        <ItemEditor
          key={editing.id}
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ItemRow({
  item,
  restaurantId,
  handle,
  onEdit,
}: {
  item: Item;
  restaurantId: string;
  handle: Omit<DragHandleProps, "label">;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-3">
      <DragHandle label={`Move ${item.name}`} {...handle} />
      <PhotoUpload
        restaurantId={restaurantId}
        name={item.id}
        currentUrl={item.photo_url}
        label={`${item.photo_url ? "Change" : "Add"} photo of ${item.name}`}
        onUploaded={(url) => setItemPhoto(item.id, url)}
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onEdit}
          className={`block w-full truncate py-1 text-left font-bold underline-offset-2 hover:underline ${item.is_available ? "" : "text-muted"}`}
        >
          {item.name}
          <span className="sr-only">: edit name, description or category</span>
        </button>
        <PriceInput
          kobo={item.price_kobo}
          label={`Price of ${item.name} in naira`}
          onSave={(price) => setItemPrice(item.id, price)}
          className="w-32"
        />
      </div>
      <SavingSwitch
        checked={item.is_available}
        label={`${item.name} available`}
        caption={["Available", "Sold out"]}
        onToggle={(available) => setItemAvailable(item.id, available)}
      />
    </div>
  );
}

function AddItem({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const { save, pending, error } = useSave();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 h-11 font-bold underline underline-offset-2">
        + Add item to {categoryName}
      </button>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(
      () => createItem(categoryId, name, price),
      () => {
        setName("");
        setPrice("");
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-2 rounded-2xl bg-line/30 p-3">
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <input
          autoFocus
          aria-label="New item name"
          placeholder="Item name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
        <label className="flex h-12 items-center rounded-xl border border-line bg-page px-3 focus-within:border-ink">
          <span aria-hidden className="text-muted">
            ₦
          </span>
          <input
            aria-label="New item price in naira"
            inputMode="numeric"
            placeholder="Price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full min-w-0 bg-transparent pl-1 outline-none"
          />
        </label>
      </div>
      <ErrorText error={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${primaryButton} flex-1`}>
          {pending ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
          Done
        </button>
      </div>
    </form>
  );
}

/** Name, description, category, photo removal and delete, in the same bottom sheet customers see. */
function ItemEditor({ item, categories, onClose }: { item: Item; categories: AdminCategory[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [categoryId, setCategoryId] = useState(item.category_id);
  const { save, pending, error } = useSave();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(() => updateItem(item.id, { name, description, categoryId }), close);
  };

  const remove = () => {
    if (!window.confirm(`Delete ${item.name}? This can’t be undone. To hide it for now, mark it sold out instead.`)) return;
    save(() => deleteItem(item.id), close);
  };

  return (
    <dialog ref={dialogRef} className="sheet" aria-labelledby={titleId} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl">
            Edit item
          </h2>
          <button type="button" onClick={close} aria-label="Close" className="grid size-11 place-items-center text-2xl">
            ×
          </button>
        </div>
        <label className="block">
          <span className="font-bold">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} mt-2`} />
        </label>
        <label className="block">
          <span className="font-bold">Description</span>
          <span className="ml-2 text-sm text-muted">Optional</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            className="mt-2 w-full rounded-xl border border-line p-3 text-base outline-none focus:border-ink"
          />
        </label>
        <label className="block">
          <span className="font-bold">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={`${inputClass} mt-2`}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <ErrorText error={error} />
        <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
          {pending ? "Saving…" : "Save"}
        </button>
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          {item.photo_url && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save(() => setItemPhoto(item.id, null), close)}
              className="h-11 text-sm font-bold underline underline-offset-2"
            >
              Remove photo
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="ml-auto h-11 text-sm font-bold text-alert underline underline-offset-2"
          >
            Delete item
          </button>
        </div>
      </form>
    </dialog>
  );
}

function OptionGroupRow({ group }: { group: AdminOptionGroup }) {
  const shown = group.usedBy.slice(0, 3).join(", ");
  const more = group.usedBy.length - 3;
  return (
    <li className="py-4">
      <p className="font-bold">{group.name}</p>
      <p className="text-sm text-muted">
        {group.usedBy.length === 0 ? "Not used by any item" : `On ${shown}${more > 0 ? ` and ${more} more` : ""}`}
      </p>
      <ul className="mt-2">
        {group.options.map((option) => (
          <li key={option.id} className="flex items-center gap-3 py-1">
            <span className={`min-w-0 flex-1 ${option.is_available ? "" : "text-muted"}`}>{option.name}</span>
            <PriceInput
              kobo={option.price_delta_kobo}
              label={`Extra charge for ${option.name} in naira`}
              onSave={(price) => setOptionPrice(option.id, price)}
              className="w-28"
            />
            <SavingSwitch
              checked={option.is_available}
              label={`${option.name} available`}
              onToggle={(available) => setOptionAvailable(option.id, available)}
            />
          </li>
        ))}
      </ul>
    </li>
  );
}
