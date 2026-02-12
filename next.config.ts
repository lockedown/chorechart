import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1"],
    },
  },
};

export default nextConfig;
