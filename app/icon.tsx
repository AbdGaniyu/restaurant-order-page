import { ImageResponse } from "next/og";
import { BrandMark, brandFonts } from "@/lib/brand-images";
import { getMenu } from "@/lib/menu";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  const { business_settings: settings } = await getMenu();
  return new ImageResponse(<BrandMark size={size.width} color={settings.brand_color} />, {
    ...size,
    fonts: await brandFonts(),
  });
}
