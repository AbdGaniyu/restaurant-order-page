import type { NextConfig } from "next";

/** The pilot restaurant: where the menu lived before it moved under /r/<slug>. */
const pilotSlug = process.env.DEFAULT_RESTAURANT_SLUG ?? "yakoyo";

/** Item photos and logos are served from Supabase Storage's public bucket. */
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: storage
      ? [
          {
            protocol: storage.protocol.replace(":", "") as "http" | "https",
            hostname: storage.hostname,
            port: storage.port,
            pathname: "/storage/v1/object/public/item-photos/**",
          },
        ]
      : [],
    // The local Supabase stack runs on 127.0.0.1, which the optimizer refuses by default (SSRF guard).
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production" || storage?.hostname === "127.0.0.1",
  },
  // Links shared before multi-tenancy (/ and /cart) keep working.
  async redirects() {
    return [
      { source: "/", destination: `/r/${pilotSlug}`, permanent: false },
      { source: "/cart", destination: `/r/${pilotSlug}/cart`, permanent: false },
    ];
  },
};

export default nextConfig;
