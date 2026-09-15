import { ImageResponse } from "next/og";
import { BrandMark, brandFonts } from "@/lib/brand-images";
import { getMenu } from "@/lib/menu";

/** Home-screen icon on iPhone; iOS rounds the corners itself. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const { business_settings: settings } = await getMenu();
  return new ImageResponse(<BrandMark size={size.width} color={settings.brand_color} />, {
    ...size,
    fonts: await brandFonts(),
  });
}
