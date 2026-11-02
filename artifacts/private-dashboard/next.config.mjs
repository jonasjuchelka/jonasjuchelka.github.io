const basePath = (process.env.BASE_PATH || "").replace(/\/+$/, "");

// Content Security Policy: scripts, styles, fonts and API calls only from this site; no framing, no plugins.
// Next.js inlines small hydration scripts, hence 'unsafe-inline'; dev mode additionally needs 'unsafe-eval'.
// img-src allows https: for tool logos an admin may set as an external address.
const dev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@workspace/site-ui", "@workspace/design-tokens"],
  allowedDevOrigins: ["*.replit.dev", "*.repl.co", "*.riker.replit.dev", "*.pike.replit.dev"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: csp },
      ],
    }];
  },
};
export default nextConfig;
