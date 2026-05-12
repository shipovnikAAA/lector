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
      // Только прокси на Rust: у Next свои обработчики под /api/ai/*, /api/formulas и т.д.
      // Широкий `/api/:path*` ломал бы их при смене приоритета rewrites в Next.
      {
        source: "/api/upload/:path*",
        destination: `${lectorAiUrl}/upload/:path*`
      },
      {
        source: "/uploads/:path*",
        destination: `${lectorAiUrl}/uploads/:path*`
      }
    ];
  }
};

export default nextConfig;
