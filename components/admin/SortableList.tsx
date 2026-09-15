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
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { IconGrip } from "./icons";
import { ErrorText } from "./ui";

export interface DragHandleProps {
  label: string;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  setActivatorNodeRef: (element: HTMLElement | null) => void;
}

/** The six-dot grip a row is dragged by. Only the grip starts a drag, so the rest of the row scrolls. */
export function DragHandle({ label, attributes, listeners, setActivatorNodeRef }: DragHandleProps) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={label}
      className="grid h-11 w-6 shrink-0 cursor-grab touch-none place-items-center rounded text-admin-neutral-500 active:cursor-grabbing"
    >
      <IconGrip />
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
      className={`relative bg-admin-bg ${isDragging ? "z-10 rounded-xl shadow-[0_12px_32px_rgb(45_43_43/0.22)]" : ""}`}
    >
      {children({ attributes, listeners, setActivatorNodeRef })}
    </li>
  );
}

/**
 * A list reordered by dragging a row's grip (touch, mouse, or keyboard: focus the grip, Space,
 * arrows, Space). The new order shows at once and saves in the background; if the save fails,
 * the list goes back to the saved order and says so.
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
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
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
    startTransition(async () => {
      setError(null);
      const result = await onReorder(next);
      if ("error" in result) setError(result.error);
      setPendingOrder(null);
    });
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
      <ErrorText error={error} className="px-5 pt-2 lg:px-0" />
    </>
  );
}
