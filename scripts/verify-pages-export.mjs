import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// This is the only directory that may be uploaded to GitHub Pages.
export const pagesDirectory = fileURLToPath(new URL("../artifacts/jonas-website/out/", import.meta.url));
const publicRoots = new Set([
  ".nojekyll", "_next", "404", "404.html", "index.html", "index.txt",
  "projects", "blog", "kontakt", "login", "impressum", "datenschutz",
  "brand", "icon.svg", "robots.txt", "sitemap.xml", "feed.xml",
]);
const forbiddenContent = /DATABASE_URL|SESSION_SECRET|PRIVATE_APP_ORIGIN|PREVIEW_AUTH_ORIGIN|private_area\.|@simplewebauthn|artifacts\/private-dashboard|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;

export function verifyPagesExport(directory = pagesDirectory) {
  if (!fs.existsSync(path.join(directory, "index.html"))) throw new Error("Public index.html missing");
  const files = [];
  function walk(folder, parts = []) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const nextParts = [...parts, entry.name];
      const relative = nextParts.join("/");
      const absolute = path.join(folder, entry.name);
      if (!publicRoots.has(nextParts[0])) throw new Error(`Unexpected public root: ${relative}`);
      if (entry.isSymbolicLink()) throw new Error(`Symlinks cannot be published: ${relative}`);
      if (nextParts.some((part) => /^(?:\.env(?:\..*)?|\.git|node_modules|src|server|migrations)$/.test(part))) {
        throw new Error(`Private/source path in public export: ${relative}`);
      }
      if (entry.isDirectory()) {
        walk(absolute, nextParts);
      } else if (entry.isFile()) {
        if (/\.(?:tsx?|sql|map|ya?ml|mjs|cjs)$/.test(entry.name) || entry.name === "package.json") {
          throw new Error(`Source/config file in public export: ${relative}`);
        }
        if (/\.(?:html|txt|js|json|xml|css|md|svg)$/.test(entry.name) &&
            forbiddenContent.test(fs.readFileSync(absolute, "utf8"))) {
          throw new Error(`Private implementation/configuration in public export: ${relative}`);
        }
        files.push(relative);
      } else {
        throw new Error(`Unsupported export entry: ${relative}`);
      }
    }
  }
  walk(directory);
  if (!files.includes(".nojekyll")) throw new Error("Missing GitHub Pages .nojekyll marker");
  return files.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const files = verifyPagesExport();
  console.log(`Verified public-only Pages export: ${files.length} files`);
  if (process.argv.includes("--manifest")) console.log(files.join("\n"));
}
