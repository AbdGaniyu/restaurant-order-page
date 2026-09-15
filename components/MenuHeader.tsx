import Image from "next/image";
import { AbulaStripe } from "@/components/AbulaStripe";
import { OpenPill } from "@/components/BusinessStatus";
import { formatDailyHours } from "@/lib/hours";
import type { BusinessSettings } from "@/lib/types";

/** The signboard: name on brand orange, trimmed with the abula stripe. */
export function MenuHeader({ settings }: { settings: BusinessSettings }) {
  const walkInHours = formatDailyHours(settings.opening_hours);
  const deliveryHours = settings.accepts_delivery ? formatDailyHours(settings.delivery_hours) : null;

  return (
    <header className="bg-brand text-ink">
      <div className="mx-auto max-w-2xl px-4 pt-7 pb-5">
        <div className="flex items-center gap-4">
          {/* Logos sit on a white field so transparent ones stay legible on the accent colour. */}
          {settings.logo_url && (
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-page">
              <Image
                src={settings.logo_url}
                alt=""
                width={96}
                height={96}
                loading="eager"
                className="size-full scale-125 object-contain"
              />
            </span>
          )}
          <h1 className="min-w-0 font-display text-[2.25rem] leading-[0.95]">{settings.name}</h1>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <OpenPill settings={settings} />
          {walkInHours && <p className="text-sm">Open daily {walkInHours}</p>}
        </div>

        <div className="mt-2 space-y-0.5 text-sm">
          {deliveryHours && <p>Delivery {deliveryHours}</p>}
          {(settings.address || settings.maps_url) && (
            <p>
              {settings.address}
              {settings.address && settings.maps_url && " · "}
              {settings.maps_url && (
                <a
                  href={settings.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline underline-offset-2"
                >
                  Directions
                </a>
              )}
            </p>
          )}
        </div>
      </div>

      <AbulaStripe />
    </header>
  );
}
