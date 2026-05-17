import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /yolo/* → YOLO API to avoid CORS and keep the API URL server-side.
  async rewrites() {
    return [
      {
        source: "/yolo/:path*",
        destination: `${process.env.YOLO_API_URL ?? "http://localhost:8080"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
