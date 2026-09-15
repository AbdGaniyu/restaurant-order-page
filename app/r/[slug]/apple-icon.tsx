import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { BrandMark, brandFonts } from "@/lib/brand-images";
import { getMenu } from "@/lib/menu";

/** Home-screen icon on iPhone; iOS rounds the corners itself. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const revalidate = 60;

export default async function AppleIcon({ params }: { params: Promise<{ slug: string }> }) {
  const menu = await getMenu((await params).slug);
  if (!menu) notFound();
  const { name, brand_color } = menu.business_settings;
  return new ImageResponse(<BrandMark size={size.width} color={brand_color} name={name} />, {
    ...size,
    fonts: await brandFonts(),
  });
}
