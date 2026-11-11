import type { NextConfig } from "next";

// A API é servida pelo mesmo domínio do site via rewrite: o navegador só fala com o Next,
// então os cookies httpOnly funcionam sem CORS. API_URL é lida no BUILD (ver Dockerfile).
const apiUrl = process.env.API_URL ?? "http://localhost:8000";

const config: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
};

export default config;
