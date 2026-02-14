import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // was causing ProtectedLayout to mount/unmount in a loop in dev → visible flash
  // Ensure static files in /public are served correctly
  // This prevents Next.js from trying to process them as routes
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

