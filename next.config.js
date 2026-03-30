/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { missingSuspenseWithCSRBailout: false },
  images: { unoptimized: true },
};

module.exports = nextConfig;
