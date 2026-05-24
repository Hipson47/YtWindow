const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const bundlePath = join(__dirname, "..", "dist", "floatingPlayerUI.global.js");

test("built floating player bundle is browser-compatible", () => {
  assert.equal(existsSync(bundlePath), true, "Run npm run build before npm test.");

  const bundle = readFileSync(bundlePath, "utf8");

  assert.match(bundle, /NativePiPFloatingPlayerUI/);
  assert.match(bundle, /mount/);
  assert.doesNotMatch(bundle, /process\.env/);
  assert.doesNotMatch(bundle, /\bprocess\.(cwd|version|versions|platform|browser)\b/);
  assert.doesNotMatch(bundle, /\brequire\s*\(/);
  assert.doesNotMatch(bundle, /\bmodule\.exports\b/);
});
