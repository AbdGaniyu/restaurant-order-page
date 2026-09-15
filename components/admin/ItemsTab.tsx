"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
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
  type ActionResult,
} from "@/app/admin/actions";
import { uploadPhoto } from "@/lib/admin/upload-photo";
import type { Tables } from "@/lib/database.types";
import { formatNaira } from "@/lib/format";
import { IconCamera, IconImage } from "./icons";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";
import {
  cx,
  AppBar,
  BottomSheet,
  btnGhost,
  btnPrimary,
  btnSecondary,
  ErrorText,
  Field,
  inputClass,
  PageHeading,
  PrefixedInput,
  sectionLabel,
  Switch,
  useIsDesktop,
  useOptimisticToggle,
  useSave,
} from "./ui";

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

type Editing = { mode: "edit"; item: Item } | { mode: "create" } | null;

const naira = (kobo: number) => formatNaira(kobo / 100);

/**
 * Items grouped by category: thumbnail, name, price and an availability switch on each row, drag
 * to reorder. Tapping a row edits it in a bottom sheet on the phone and in a panel beside the list
 * on desktop (same fields, same order). Options and add-ons follow, with their prices and switches.
 */
export function ItemsTab({
  restaurantId,
  welcome,
  startAdding,
  categories,
  optionGroups,
}: {
  restaurantId: string;
  welcome: boolean;
  startAdding: boolean;
  categories: AdminCategory[];
  optionGroups: AdminOptionGroup[];
}) {
  const isDesktop = useIsDesktop();
  const [editing, setEditing] = useState<Editing>(startAdding && categories.length > 0 ? { mode: "create" } : null);
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const editingId = editing?.mode === "edit" ? editing.item.id : null;

  const addButton = (
    <button
      type="button"
      disabled={categories.length === 0}
      onClick={() => setEditing({ mode: "create" })}
      className={cx(`${btnPrimary} min-h-10`)}
    >
      + Add item
    </button>
  );

  return (
    <div className={editing && isDesktop ? "grid grid-cols-[minmax(0,1fr)_400px]" : ""}>
      <div className="min-w-0 lg:px-10 lg:py-8">
        <AppBar title="Items" action={addButton} />
        <PageHeading
          title="Items"
          action={
            <div className="flex gap-2">
              <input
                type="search"
                aria-label="Search items"
                placeholder="Search items"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={cx(`${inputClass} min-h-10 w-[220px] text-sm`)}
              />
              {addButton}
            </div>
          }
        />

        {welcome && (
          <div role="status" className="mx-5 mt-4 rounded-xl border border-admin-divider bg-white p-4 lg:mx-0">
            <p className="font-extrabold">Your menu is live.</p>
            <p className="mt-1 text-sm text-admin-muted">
              Add photos and more items here. Share your link from Settings.
            </p>
          </div>
        )}

        {categories.length === 0 && (
          <p className="px-5 pt-6 text-admin-muted lg:px-0">
            Items live in categories.{" "}
            <Link href="/admin?tab=categories" className="font-extrabold text-accent">
              Add a category
            </Link>{" "}
            first.
          </p>
        )}

        {categories.map((category) => {
          const items = search ? category.items.filter((item) => item.name.toLowerCase().includes(search)) : category.items;
          if (search && items.length === 0) return null;
          const row = (item: Item, handle: Omit<DragHandleProps, "label"> | null) => (
            <ItemRow
              item={item}
              handle={handle}
              selected={item.id === editingId}
              onEdit={() => setEditing({ mode: "edit", item })}
            />
          );
          return (
            <section key={category.id} aria-labelledby={`category-${category.id}`}>
              <div className={cx(`flex items-center justify-between px-5 pt-3.5 pb-1.5 lg:px-0 lg:pt-4 ${sectionLabel}`)}>
                <h2 id={`category-${category.id}`} className="font-normal">
                  {category.name}
                  {!category.is_active && " · hidden"}
                </h2>
                <span>
                  {category.items.length}
                  <span className="hidden lg:inline"> items</span>
                </span>
              </div>
              {items.length === 0 ? (
                <p className="border-t border-admin-divider px-5 py-4 text-sm text-admin-muted lg:px-0">No items yet.</p>
              ) : search ? (
                // Reordering a filtered list would scramble the hidden rows, so search shows a plain list.
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>{row(item, null)}</li>
                  ))}
                </ul>
              ) : (
                <SortableList items={items} onReorder={reorderItems} renderItem={row} />
              )}
            </section>
          );
        })}

        {optionGroups.length > 0 && !search && <OptionsSection groups={optionGroups} />}
      </div>

      {editing && (
        <ItemEditor
          key={editing.mode === "edit" ? editing.item.id : "new"}
          item={editing.mode === "edit" ? editing.item : null}
          restaurantId={restaurantId}
          categories={categories}
          layout={isDesktop ? "panel" : "sheet"}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Thumb({ url, className, sizes = "56px" }: { url: string | null; className: string; sizes?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] bg-admin-neutral-200 text-admin-neutral-500 ${className}`}
    >
      {url ? (
        <Image src={url} alt="" fill sizes={sizes} unoptimized={url.startsWith("blob:")} className="object-cover" />
      ) : (
        <IconImage size={18} />
      )}
    </span>
  );
}

const SoldOutTag = () => (
  <span className="rounded-full bg-admin-neutral-200 px-2.5 py-0.5 text-[11px] font-normal tracking-[0.02em] text-admin-muted">
    Sold out
  </span>
);

/** 72px on the phone (64 on desktop). Switching an item off fades its row to 45% and tags it sold out. */
function ItemRow({
  item,
  handle,
  selected,
  onEdit,
}: {
  item: Item;
  handle: Omit<DragHandleProps, "label"> | null;
  selected: boolean;
  onEdit: () => void;
}) {
  const { shown, toggle, error } = useOptimisticToggle(item.is_available, (next) => setItemAvailable(item.id, next));
  return (
    <div
      className={`grid min-h-[72px] grid-cols-[24px_56px_minmax(0,1fr)_auto] items-center gap-3 border-t border-admin-divider py-2 pr-5 pl-2 transition-opacity duration-200 lg:min-h-16 lg:grid-cols-[24px_48px_minmax(0,1fr)_120px_auto] lg:gap-4 lg:px-0 ${
        shown ? "" : "opacity-45"
      } ${selected ? "bg-accent-100/60" : ""}`}
    >
      {handle ? <DragHandle label={`Move ${item.name}`} {...handle} /> : <span />}
      <Thumb url={item.photo_url} className="size-14 lg:size-12" />
      <button type="button" onClick={onEdit} className="flex min-h-11 min-w-0 flex-col justify-center gap-0.5 text-left">
        <span className="truncate text-[15px] font-extrabold">{item.name}</span>
        <span className="flex items-center gap-2 text-[13px] lg:hidden">
          <span className="tabular-nums">{naira(item.price_kobo)}</span>
          {!shown && <SoldOutTag />}
        </span>
        {item.description && <span className="hidden truncate text-[13px] text-admin-muted lg:block">{item.description}</span>}
      </button>
      <span className="hidden items-center gap-2 text-sm font-extrabold tabular-nums lg:flex">
        {naira(item.price_kobo)}
        {!shown && <SoldOutTag />}
      </span>
      <div className="flex flex-col items-end">
        <Switch checked={shown} onChange={toggle} label={`${item.name} available`} />
        <ErrorText error={error} className="max-w-32 text-right text-xs" />
      </div>
    </div>
  );
}

/** A photo button: a label around a hidden file input, so it opens the camera or gallery natively. */
function FileButton({
  label,
  icon,
  camera = false,
  onPick,
  className = "",
}: {
  label: string;
  icon?: ReactNode;
  camera?: boolean;
  onPick: (file: File) => void;
  className?: string;
}) {
  return (
    <label
      className={cx(`${btnSecondary} min-h-11 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${className}`)}
    >
      {icon}
      {label}
      <input
        type="file"
        accept="image/*"
        capture={camera ? "environment" : undefined}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

/**
 * Edit (or add) an item: photo, name, description, price, category. A new photo is resized and
 * uploaded when the form is saved; for a new item, right after the item is created.
 */
function ItemEditor({
  item,
  restaurantId,
  categories,
  layout,
  onClose,
}: {
  item: Item | null;
  restaurantId: string;
  categories: AdminCategory[];
  layout: "sheet" | "panel";
  onClose: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? (item.price_kobo / 100).toLocaleString("en-NG") : "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? "");
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  // Set once a new item is created, so a retry after a failed photo upload doesn't create it twice.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview);
  }, [photo]);

  const preview = photo?.preview ?? (removePhoto ? null : (item?.photo_url ?? null));
  const pick = (file: File) => {
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setRemovePhoto(false);
  };
  const clearPhoto = () => {
    setPhoto(null);
    setRemovePhoto(true);
  };

  const save = (close: () => void) =>
    startTransition(async () => {
      setError(null);
      const failed = (result: ActionResult) => ("error" in result ? (setError(result.error), true) : false);
      let id = item?.id ?? createdId;

      if (id) {
        if (failed(await updateItem(id, { name, description, categoryId }))) return;
        const unchangedPrice = item && price.replace(/[₦,\s]/g, "") === String(item.price_kobo / 100);
        if (!unchangedPrice && failed(await setItemPrice(id, price))) return;
      } else {
        const created = await createItem({ categoryId, name, description, price });
        if (failed(created) || !("id" in created) || !created.id) return;
        id = created.id;
        setCreatedId(id);
      }

      if (photo) {
        try {
          if (failed(await setItemPhoto(id, await uploadPhoto(restaurantId, id, photo.file)))) return;
        } catch (caught) {
          console.error(caught);
          setError("Saved, but the photo didn’t upload. Try adding it again.");
          return;
        }
      } else if (removePhoto && item?.photo_url && failed(await setItemPhoto(id, null))) {
        return;
      }
      close();
    });

  const remove = (close: () => void) => {
    if (!item || !window.confirm(`Delete ${item.name}? To hide it for now, switch it off instead.`)) return;
    startTransition(async () => {
      const result = await deleteItem(item.id);
      if ("error" in result) setError(result.error);
      else close();
    });
  };

  const panel = layout === "panel";
  const field = panel ? cx(inputClass, "min-h-11 bg-admin-bg") : inputClass;
  const deleteButton = (close: () => void) =>
    item && (
      <button type="button" disabled={pending} onClick={() => remove(close)} className={btnGhost}>
        Delete
      </button>
    );

  const fields = (close: () => void) => (
    <form
      id={formId}
      noValidate
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save(close);
      }}
      className="flex flex-col gap-4"
    >
      {panel ? (
        <>
          <Thumb url={preview} className="h-[180px] w-full rounded-xl" sizes="400px" />
          <div className="flex items-center gap-2">
            <FileButton label="Upload photo" onPick={pick} className="min-h-10 flex-1" />
            {preview && (
              <button type="button" onClick={clearPhoto} className={btnGhost}>
                Remove
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4">
          <Thumb url={preview} className="size-24 rounded-xl" sizes="96px" />
          <div className="flex flex-col gap-2">
            <FileButton label="Take photo" icon={<IconCamera size={18} />} camera onPick={pick} />
            <FileButton label="Choose from gallery" icon={<IconImage size={18} />} onPick={pick} />
            {preview && (
              <button type="button" onClick={clearPhoto} className={cx(`${btnGhost} min-h-9 self-start text-sm`)}>
                Remove photo
              </button>
            )}
          </div>
        </div>
      )}
      <Field label="Name">
        <input value={name} onChange={(event) => setName(event.target.value)} className={field} />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={500}
          className={cx(`${field} min-h-[72px] py-2 text-[15px]`)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={panel ? "Price (₦)" : "Price"}>
          {panel ? (
            <input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} className={field} />
          ) : (
            <PrefixedInput prefix="₦" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} />
          )}
        </Field>
        <Field label="Category">
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={cx(`${field} text-[15px]`)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ErrorText error={error} />
    </form>
  );

  const actions = (close: () => void) => (
    <>
      <button type="button" onClick={close} className={cx(`${btnSecondary} ${panel ? "min-h-11" : "w-24"}`)}>
        Cancel
      </button>
      <button type="submit" form={formId} disabled={pending} className={cx(`${btnPrimary} flex-1 ${panel ? "min-h-11" : ""}`)}>
        {pending ? "Saving…" : panel ? "Save changes" : "Save"}
      </button>
    </>
  );

  if (panel) {
    return (
      <aside
        aria-label={item ? `Edit ${item.name}` : "New item"}
        className="sticky top-0 flex h-dvh flex-col overflow-hidden border-l border-admin-divider bg-white"
      >
        <div className="flex items-center justify-between border-b border-admin-divider px-6 pt-5 pb-3">
          <h2 className="text-lg font-extrabold">{item ? "Edit item" : "New item"}</h2>
          {deleteButton(onClose)}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{fields(onClose)}</div>
        <div className="flex gap-2 border-t border-admin-divider px-6 pt-4 pb-6">{actions(onClose)}</div>
      </aside>
    );
  }

  return (
    <BottomSheet title={item?.name ?? "New item"} headerAction={deleteButton} onClose={onClose} footer={actions}>
      {fields}
    </BottomSheet>
  );
}

function OptionsSection({ groups }: { groups: AdminOptionGroup[] }) {
  return (
    <section aria-labelledby="options-heading" className="mt-8">
      <div className={cx(`px-5 pb-1.5 lg:px-0 ${sectionLabel}`)}>
        <h2 id="options-heading" className="font-normal">
          Options &amp; add-ons
        </h2>
      </div>
      <p className="px-5 pb-2 text-[13px] text-admin-muted lg:px-0">
        Sizes, choices and extras customers pick after tapping an item. Their prices are added to the item’s.
      </p>
      <ul>
        {groups.map((group) => {
          const shown = group.usedBy.slice(0, 3).join(", ");
          const more = group.usedBy.length - 3;
          return (
            <li key={group.id} className="border-t border-admin-divider px-5 py-3 lg:px-0">
              <p className="text-[15px] font-extrabold">{group.name}</p>
              <p className="text-[13px] text-admin-muted">
                {group.usedBy.length === 0 ? "Not on any item" : `On ${shown}${more > 0 ? ` and ${more} more` : ""}`}
              </p>
              <ul className="mt-1">
                {group.options.map((option) => (
                  <OptionRow key={option.id} option={option} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OptionRow({ option }: { option: Tables<"options"> }) {
  const { shown, toggle, error } = useOptimisticToggle(option.is_available, (next) => setOptionAvailable(option.id, next));
  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-3 py-1 transition-opacity duration-200 ${
        shown ? "" : "opacity-45"
      }`}
    >
      <span className="truncate text-sm">{option.name}</span>
      <InlinePrice
        kobo={option.price_delta_kobo}
        label={`Extra charge for ${option.name}, in naira`}
        onSave={(price) => setOptionPrice(option.id, price)}
      />
      <Switch checked={shown} onChange={toggle} label={`${option.name} available`} />
      <ErrorText error={error} className="col-span-3 text-xs" />
    </li>
  );
}

/** A naira amount that saves when the field loses focus or on Enter, only if it changed. */
function InlinePrice({ kobo, label, onSave }: { kobo: number; label: string; onSave: (price: string) => Promise<ActionResult> }) {
  const saved = String(kobo / 100);
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const { save, pending, error } = useSave();

  // A new amount from the server replaces the field unless it's being edited.
  if (saved !== lastSaved && value === lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }

  const commit = () => {
    const typed = value.replace(/[₦,\s]/g, "");
    if (typed === lastSaved) return;
    save(
      () => onSave(value),
      () => setLastSaved(typed),
    );
  };

  return (
    <div>
      <label className="flex h-11 items-center rounded-lg border border-admin-divider bg-white px-2 focus-within:border-accent">
        <span aria-hidden className="text-admin-muted">
          ₦
        </span>
        <input
          inputMode="numeric"
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={`w-full min-w-0 bg-transparent pl-1 text-sm font-semibold tabular-nums outline-none ${pending ? "opacity-60" : ""}`}
        />
      </label>
      <ErrorText error={error} className="mt-1 text-xs" />
    </div>
  );
}
