import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/apple-touch-icon.png', destination: '/logo/revenue-engine-symbol-favicon.svg' },
      { source: '/apple-touch-icon-precomposed.png', destination: '/logo/revenue-engine-symbol-favicon.svg' },
      // App Router não serve .html em /public; redireciona para a rota que lê o ficheiro
      { source: '/mockup-rfy-ui-v2.html', destination: '/mockup-rfy-ui-v2' },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
