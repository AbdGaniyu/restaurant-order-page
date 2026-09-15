import type { NextConfig } from "next";

/** The pilot restaurant: where the menu lived before it moved under /r/<slug>. */
const pilotSlug = process.env.DEFAULT_RESTAURANT_SLUG ?? "yakoyo";

const nextConfig: NextConfig = {
  // Links shared before multi-tenancy (/ and /cart) keep working.
  async redirects() {
    return [
      { source: "/", destination: `/r/${pilotSlug}`, permanent: false },
      { source: "/cart", destination: `/r/${pilotSlug}/cart`, permanent: false },
    ];
  },
};

export default nextConfig;
