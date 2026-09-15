import { ImageResponse } from "next/og";
import { AbulaStripeImage, brandFonts, INK, logoDataUrl } from "@/lib/brand-images";
import { formatDailyHours } from "@/lib/hours";
import { getMenu } from "@/lib/menu";

export const alt = "Yàkoyó Abula Joint: see the menu and order on WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview on WhatsApp and Instagram: the signboard header at poster size. */
export default async function OpenGraphImage() {
  const { business_settings: settings } = await getMenu();
  const hours = formatDailyHours(settings.opening_hours);
  const logo = await logoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: settings.brand_color,
          color: INK,
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 56, padding: "0 80px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Bungee", fontSize: 96, lineHeight: 1 }}>
              {settings.name}
            </div>
            <div style={{ display: "flex", fontFamily: "Atkinson", fontWeight: 700, fontSize: 42, marginTop: 40 }}>
              See the menu and order on WhatsApp
            </div>
            {hours && (
              <div style={{ display: "flex", fontFamily: "Atkinson", fontSize: 32, marginTop: 14 }}>
                Open daily {hours}
              </div>
            )}
          </div>
          {/* The logo is orange and black on transparent, so it sits on a white field (brand guidelines). */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 340,
              height: 340,
              borderRadius: 170,
              background: "#ffffff",
              overflow: "hidden",
            }}
          >
            <img src={logo} alt="" width={425} height={425} />
          </div>
        </div>
        <AbulaStripeImage height={28} />
      </div>
    ),
    { ...size, fonts: await brandFonts() },
  );
}
