import { businessShortName, takeawayPackPrices } from "@/lib/business";
import { formatNairaRange } from "@/lib/format";
import type { BusinessSettings } from "@/lib/types";

/** The extras that aren't on the item prices, stated up front so the WhatsApp total holds no surprises. */
export function MenuNotes({ settings }: { settings: BusinessSettings }) {
  const fees = settings.delivery_fee_tiers;
  const packs = takeawayPackPrices(settings);

  return (
    <footer className="mt-10 space-y-1 rounded-2xl bg-line/50 p-4 text-sm text-muted">
      <p>All prices are in naira.</p>
      {settings.accepts_delivery && fees.length > 0 && (
        <p>Delivery costs {formatNairaRange(fees)} depending on your area, confirmed on WhatsApp.</p>
      )}
      {packs.length > 0 && (
        <p>
          Takeaway packs are {formatNairaRange(packs)} each, added by {businessShortName(settings)}.
        </p>
      )}
    </footer>
  );
}
