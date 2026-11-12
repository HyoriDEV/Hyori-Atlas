import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
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
