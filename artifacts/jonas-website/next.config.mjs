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
  allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.riker.replit.dev", "*.pike.replit.dev"],
};
export default nextConfig;
