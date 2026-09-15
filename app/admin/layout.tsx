import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

/** The admin is set in Archivo (the design system's face); the public menu keeps its own fonts. */
const archivo = Archivo({
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Menu admin",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#faf7f4" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={`${archivo.variable} admin min-h-dvh bg-admin-bg font-admin text-[15px] leading-[1.55] text-admin-text`}>
      {children}
    </div>
  );
}
