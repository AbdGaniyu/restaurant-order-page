"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { resizeImage } from "@/lib/admin/resize-image";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Tap to take or choose a photo. It's resized to 1200px and compressed on the phone, uploaded
 * straight to Storage under item-photos/<restaurant_id>/, then handed to `onUploaded` (a server
 * action that saves the URL). Storage policies only accept uploads into the owner's own folder.
 */
export function PhotoUpload({
  restaurantId,
  name,
  currentUrl,
  label,
  onUploaded,
  size = 56,
}: {
  restaurantId: string;
  /** File name stem, e.g. the item id or "logo". */
  name: string;
  currentUrl: string | null;
  label: string;
  onUploaded: (url: string) => Promise<ActionResult>;
  size?: number;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setStatus("uploading");
    setError(null);
    try {
      const photo = await resizeImage(file);
      const path = `${restaurantId}/${name}-${Date.now()}.jpg`;
      const storage = createBrowserSupabase().storage.from("item-photos");
      const { error: uploadError } = await storage.upload(path, photo, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const result = await onUploaded(storage.getPublicUrl(path).data.publicUrl);
      if ("error" in result) throw new Error(result.error);
      setStatus("idle");
    } catch (caught) {
      console.error(caught);
      setError("Couldn’t upload that photo. Try again.");
      setStatus("error");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="shrink-0">
      <label
        htmlFor={inputId}
        style={{ width: size, height: size }}
        className={`relative grid cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-line/30 text-center text-xs font-bold text-muted ${status === "uploading" ? "opacity-60" : ""}`}
      >
        {currentUrl ? (
          <Image src={currentUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span className="px-1 leading-tight">{status === "uploading" ? "…" : "+ Photo"}</span>
        )}
        <span className="sr-only">{label}</span>
        {status === "uploading" && currentUrl && (
          <span className="absolute inset-0 grid place-items-center bg-page/70">…</span>
        )}
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={status === "uploading"}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {error && (
        <p role="alert" className="mt-1 max-w-40 text-xs font-bold text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
