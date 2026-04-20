/** @type {import('next').NextConfig} */
const backendBase = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.realmatka.in"
).replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: "/api/charts/:path*",
        destination: `${backendBase}/api/charts/:path*`
      }
    ];
  }
};

export default nextConfig;
