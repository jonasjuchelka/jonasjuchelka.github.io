/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: "",
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@workspace/site-ui", "@workspace/design-tokens"],
  // Next's "*" matches one hostname label, not nested Replit preview hosts.
  // Allow this workspace explicitly; this affects development assets only.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ...(process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : []),
  ],
};
export default nextConfig;
