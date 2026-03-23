import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      allowedOrigins: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://localhost:4001",
        "http://127.0.0.1:4001",
      ],
    },
  },
};

export default nextConfig;
