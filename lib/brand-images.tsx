import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Shared pieces for the generated share preview and icons (rendered at build time with next/og). */

// The image renderer can't read CSS variables, so the abula colours are repeated from globals.css.
const ABULA_COLORS = ["#5a4636", "#e9a423", "#3d6b2c"];
export const INK = "#1d1a17";

// .woff, not .woff2: the renderer doesn't support woff2.
const fontFile = (pkg: string, file: string) =>
  readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

export async function brandFonts() {
  const [bungee, regular, bold] = await Promise.all([
    fontFile("bungee", "bungee-latin-400-normal.woff"),
    fontFile("atkinson-hyperlegible", "atkinson-hyperlegible-latin-400-normal.woff"),
    fontFile("atkinson-hyperlegible", "atkinson-hyperlegible-latin-700-normal.woff"),
  ]);
  return [
    { name: "Bungee", data: bungee, weight: 400 as const, style: "normal" as const },
    { name: "Atkinson", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Atkinson", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** The logo as a data URL, which is how the image renderer takes pictures. */
export async function logoDataUrl(): Promise<string> {
  const png = await readFile(join(process.cwd(), "public/brand/logo.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function AbulaStripeImage({ height }: { height: number }) {
  return (
    <div style={{ display: "flex", width: "100%", height }}>
      {ABULA_COLORS.map((color) => (
        <div key={color} style={{ flex: 1, background: color }} />
      ))}
    </div>
  );
}

/** A "Y" on the brand orange over the abula stripe: the signboard, shrunk to an icon. */
export function BrandMark({ size, color }: { size: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: color }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Bungee",
          fontSize: size * 0.62,
          lineHeight: 1,
          color: INK,
        }}
      >
        Y
      </div>
      <AbulaStripeImage height={Math.max(3, Math.round(size * 0.14))} />
    </div>
  );
}
