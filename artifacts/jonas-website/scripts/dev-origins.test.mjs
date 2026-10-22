import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isCsrfOriginAllowed } = require("next/dist/server/app-render/csrf-protection.js");

test("development assets accept the exact nested preview hostname, not foreign origins", async () => {
  const previous = process.env.REPLIT_DEV_DOMAIN;
  const hostname = "workspace-id.reed.replit.dev";
  try {
    process.env.REPLIT_DEV_DOMAIN = hostname;
    const { default: config } = await import("../next.config.mjs?preview-origin-test");
    assert.equal(isCsrfOriginAllowed(hostname, ["*.replit.dev"]), false);
    for (const origin of [hostname, "localhost", "127.0.0.1"]) {
      assert.equal(isCsrfOriginAllowed(origin, config.allowedDevOrigins), true);
    }
    for (const origin of ["other.reed.replit.dev", `${hostname}.evil.example`, "evil.example"]) {
      assert.equal(isCsrfOriginAllowed(origin, config.allowedDevOrigins), false);
    }
    assert.equal(config.output, "export");
  } finally {
    if (previous === undefined) delete process.env.REPLIT_DEV_DOMAIN;
    else process.env.REPLIT_DEV_DOMAIN = previous;
  }
});
