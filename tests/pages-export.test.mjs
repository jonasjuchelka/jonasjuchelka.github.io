import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verifyPagesExport } from "../scripts/verify-pages-export.mjs";

function fixture(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pages-export-"));
  fs.writeFileSync(path.join(directory, "index.html"), "<h1>Public website</h1>");
  fs.writeFileSync(path.join(directory, ".nojekyll"), "");
  const write = (name, content = "") => {
    const filename = path.join(directory, name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  };
  try { run(directory, write); } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}

test("public pages, gateway, local fonts and licenses may be exported", () => fixture((directory, write) => {
  write("login/index.html", "<a href='https://private.example.com/login'>Privater Bereich</a>");
  write("_next/static/media/brand.ttf", "fixture-font");
  write("brand/licenses/OFL.txt", "Font license");
  assert.equal(verifyPagesExport(directory).length, 5);
}));

for (const name of ["private/index.html", "artifacts/private-dashboard/page.js", ".env",
  "brand/.env.local", "brand/schema.sql", "brand/server/auth.js", "_next/static/source.map"]) {
  test(`reject unexpected/private/source file: ${name}`, () => fixture((directory, write) => {
    write(name);
    assert.throws(() => verifyPagesExport(directory));
  }));
}
for (const content of ["DATABASE_URL", "private_area.users", "@simplewebauthn/server", "SESSION_SECRET"]) {
  test(`reject private code/config marker: ${content}`, () => fixture((directory, write) => {
    write("_next/static/app.js", content);
    assert.throws(() => verifyPagesExport(directory));
  }));
}
test("reject symlink outside export directory", () => fixture((directory) => {
  fs.symlinkSync("/tmp", path.join(directory, "brand"));
  assert.throws(() => verifyPagesExport(directory));
}));
