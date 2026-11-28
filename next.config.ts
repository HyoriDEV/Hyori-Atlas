import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  async headers() {
    return [
      {
        source: "/trame/:token",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/staff/writing",
        destination: "/staff/rp-tracking",
        permanent: false,
      },
      {
        source: "/staff/writing/:playerId",
        destination: "/staff/rp-tracking/:playerId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
