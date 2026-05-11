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
    const lectorAiUrl = process.env.LECTOR_AI_URL || "http://127.0.0.1:6969";
    return [
      {
        source: "/api/:path*",
        destination: `${lectorAiUrl}/:path*`
      },
      {
        source: "/uploads/:path*",
        destination: `${lectorAiUrl}/uploads/:path*`
      }
    ];
  }
};

export default nextConfig;
