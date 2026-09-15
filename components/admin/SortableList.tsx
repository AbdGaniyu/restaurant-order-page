"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type ReactNode } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { ErrorText, useSave } from "./controls";

export interface DragHandleProps {
  label: string;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  setActivatorNodeRef: (element: HTMLElement | null) => void;
}

/** The grip a row is dragged by. Only the handle starts a drag, so the rest of the row scrolls normally. */
export function DragHandle({ label, attributes, listeners, setActivatorNodeRef }: DragHandleProps) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={label}
      className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center text-xl text-muted active:cursor-grabbing"
    >
      <span aria-hidden>⠿</span>
    </button>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: Omit<DragHandleProps, "label">) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative bg-page ${isDragging ? "z-10 rounded-xl shadow-lg shadow-ink/20" : ""}`}
    >
      {children({ attributes, listeners, setActivatorNodeRef })}
    </li>
  );
}

/**
 * A list reordered by dragging a row's handle (touch, mouse, or keyboard: focus the handle, Space,
 * arrows, Space). The new order shows at once and is saved in the background; if the save fails,
 * the list snaps back and says so.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className = "",
}: {
  items: T[];
  onReorder: (ids: string[]) => Promise<ActionResult>;
  renderItem: (item: T, handle: Omit<DragHandleProps, "label">) => ReactNode;
  className?: string;
}) {
  // While a save is in flight, show the dragged order; afterwards the server's order (now the same).
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const { save, error } = useSave();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(items.map((item) => [item.id, item]));
  const order = (pendingOrder ?? items.map((item) => item.id)).filter((id) => byId.has(id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setPendingOrder(next);
    save(
      () => onReorder(next),
      () => setPendingOrder(null),
      () => setPendingOrder(null),
    );
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className={className}>
            {order.map((id) => (
              <SortableRow key={id} id={id}>
                {(handle) => renderItem(byId.get(id)!, handle)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <ErrorText error={error} className="mt-2" />
    </>
  );
}
