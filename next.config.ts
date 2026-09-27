import type { NextConfig } from "next";

const isPlaywrightProductionServer = process.env.PLAYWRIGHT_PRODUCTION_SERVER === "true";

const nextConfig: NextConfig = {
  ...(isPlaywrightProductionServer ? {} : { output: "standalone" }),
  reactStrictMode: true,
  serverExternalPackages: ["pino", "thread-stream"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
