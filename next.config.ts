import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { root: process.cwd() },
  devIndicators: false,
  allowedDevOrigins: process.env.VERIFY_EXTERNAL_HOST ? [process.env.VERIFY_EXTERNAL_HOST] : [],
};

export default nextConfig;
