import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.LECTOR_AI_URL || "http://127.0.0.1:6969"}/:path*`
      }
    ];
  }
};

export default nextConfig;
