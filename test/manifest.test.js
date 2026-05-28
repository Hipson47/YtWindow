const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const manifest = JSON.parse(readFileSync(join(__dirname, "..", "manifest.json"), "utf8"));
const backgroundSource = readFileSync(join(__dirname, "..", "background.js"), "utf8");

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

test("manifest scopes content scripts to YouTube only", () => {
  assert.equal(manifest.content_scripts.length, 1);

  const [contentScript] = manifest.content_scripts;
  assert.deepEqual(contentScript.matches, [
    "https://www.youtube.com/*",
    "https://music.youtube.com/*"
  ]);
  assert.deepEqual(contentScript.js, [
    "src/videoSelector.js",
    "src/pipRuntime.js",
    "src/nativePipRuntime.js",
    "src/pipWindowSizing.js",
    "dist/floatingPlayerUI.global.js",
    "src/documentPipRuntime.js",
    "src/youtubeToolbar.js"
  ]);
  assert.deepEqual(contentScript.css, ["src/youtubeToolbar.css"]);
  assert.equal(contentScript.run_at, "document_idle");
});

test("extension action fallback injects the shared PiP runtime and explicit runner", () => {
  assert.match(backgroundSource, /src\/videoSelector\.js/);
  assert.match(backgroundSource, /src\/pipRuntime\.js/);
  assert.match(backgroundSource, /src\/nativePipRuntime\.js/);
  assert.match(backgroundSource, /src\/runTogglePiP\.js/);
  assert.doesNotMatch(backgroundSource, /src\/youtubeToolbar\.js/);
  assert.doesNotMatch(backgroundSource, /src\/documentPipRuntime\.js/);
});
