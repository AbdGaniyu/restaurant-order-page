"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { displayUrl } from "@/lib/admin/format";
import { copyText } from "@/lib/whatsapp";
import { cx, btnGhost, btnPrimary, btnSecondary } from "./ui";

const QR_OPTIONS = { margin: 1, color: { dark: "#201e1dff", light: "#ffffffff" } };

/** Saves the menu link's QR code as a PNG (1024px, for print) or SVG. */
export async function downloadQr(url: string, slug: string, format: "png" | "svg") {
  const href =
    format === "png"
      ? await QRCode.toDataURL(url, { ...QR_OPTIONS, width: 1024 })
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await QRCode.toString(url, { ...QR_OPTIONS, type: "svg" }))}`;
  const link = document.createElement("a");
  link.href = href;
  link.download = `${slug}-menu-qr.${format}`;
  link.click();
}

/** Copies text and reports "copied" for two seconds. */
export function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(text, null))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

export function QrImage({ url, size }: { url: string; size: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { ...QR_OPTIONS, width: size * 3 }).then((data) => {
      if (live) setSrc(data);
    });
    return () => {
      live = false;
    };
  }, [url, size]);

  return (
    <span
      style={{ width: size, height: size }}
      className="block shrink-0 overflow-hidden rounded-lg border-4 border-white bg-white outline outline-admin-divider"
    >
      {src && <Image src={src} alt={`QR code for ${displayUrl(url)}`} width={size - 8} height={size - 8} unoptimized />}
    </span>
  );
}

/** The public menu link with Copy, and its QR code for tables and flyers. Copy is primary on the phone. */
export function PublicLinkCard({ url, slug, variant }: { url: string; slug: string; variant: "mobile" | "desktop" }) {
  const { copied, copy } = useCopy(url);
  const live = (
    <span aria-live="polite" className="sr-only">
      {copied ? "Link copied" : ""}
    </span>
  );

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex">
          <span className="flex min-h-12 min-w-0 flex-1 items-center rounded-l-lg border border-r-0 border-admin-divider bg-white px-3 text-[15px] font-semibold">
            <span className="truncate">{displayUrl(url)}</span>
          </span>
          <button type="button" onClick={copy} className={cx(`${btnPrimary} rounded-l-none`)}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
          <QrImage url={url} size={72} />
          <div className="flex flex-col gap-1">
            <span className="text-[13px]">QR for tables and flyers</span>
            <button type="button" onClick={() => downloadQr(url, slug, "png")} className={cx(`${btnGhost} self-start px-0`)}>
              Download PNG
            </button>
          </div>
        </div>
        {live}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
      <QrImage url={url} size={96} />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex">
          <span className="flex min-h-10 min-w-0 flex-1 items-center rounded-l-lg border border-r-0 border-admin-divider bg-white px-3 text-sm font-semibold">
            <span className="truncate">{displayUrl(url)}</span>
          </span>
          <button type="button" onClick={copy} className={cx(`${btnSecondary} min-h-10 rounded-l-none text-sm`)}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => downloadQr(url, slug, "png")} className={cx(`${btnGhost} min-h-10 px-0`)}>
            Download QR (PNG)
          </button>
          <button type="button" onClick={() => downloadQr(url, slug, "svg")} className={cx(`${btnGhost} min-h-10 px-0`)}>
            SVG
          </button>
        </div>
      </div>
      {live}
    </div>
  );
}
