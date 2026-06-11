import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },

    allowedDevOrigins: [
        'yer-undeleterious-jeanelle.ngrok-free.dev'
    ],

    async rewrites() {
        return {
            // "beforeFiles" checks rules BEFORE checking Next.js pages/files.
            // This ensures /api requests go straight to port 3001 without hitting Next.js routing.
            beforeFiles: [
                {
                    source: '/api/:path*',
                    destination: 'http://127.0.0.1:3001/:path*',
                },
            ],
        };
    },
};

export default nextConfig;