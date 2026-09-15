import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Menu admin",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1d1a17" };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-page">{children}</div>;
}
