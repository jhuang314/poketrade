import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        port: "",
        pathname:
          "/flibustier/pokemon-tcg-exchange/refs/heads/main/public/images/cards/**",
      },
    ],
  },
};

export default nextConfig;
