const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const manifest = JSON.parse(readFileSync(join(__dirname, "..", "manifest.json"), "utf8"));

test("manifest is a minimal Manifest V3 extension", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.action.default_title, "Toggle Picture-in-Picture");
});

test("manifest keeps permissions narrow", () => {
  assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "scripting"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.permissions.includes("<all_urls>"), false);
  assert.equal(manifest.permissions.some((permission) => permission.includes("://")), false);
});
