import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1:3001', 'localhost:3001', '127.0.0.1:3000', 'localhost:3000']
} as any;

export default nextConfig;
