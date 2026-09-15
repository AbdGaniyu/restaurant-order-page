import Image from "next/image";
import { AddButton } from "@/components/AddButton";
import { formatNaira } from "@/lib/format";
import { startingPrice, type MenuItemView } from "@/lib/menu";

/** Sold-out items stay on the menu, greyed out, so customers see everything Yakoyo makes. */
export function MenuItemCard({ item }: { item: MenuItemView }) {
  const soldOut = !item.is_available;
  const { amount, isFrom } = startingPrice(item);

  return (
    <li className="flex items-start gap-4 border-b border-line py-4 last:border-b-0">
      {/* Sold out greys the text with the muted colour rather than opacity, so it stays readable (4.5:1). */}
      <div className={`min-w-0 flex-1 ${soldOut ? "text-muted" : ""}`}>
        <h3 className="text-[1.0625rem] leading-snug font-bold">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
        )}
        <p className="mt-2 font-bold tabular-nums">
          {isFrom && <span className="font-normal text-muted">from </span>}
          {formatNaira(amount)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-3">
        {item.image_url && (
          <Image
            src={item.image_url}
            alt=""
            width={88}
            height={88}
            sizes="88px"
            className={`size-22 rounded-xl object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        )}
        {soldOut ? (
          <span className="rounded-full bg-line px-3 py-1.5 text-xs font-bold tracking-wide uppercase">
            Sold out
          </span>
        ) : (
          <AddButton item={item} />
        )}
      </div>
    </li>
  );
}
