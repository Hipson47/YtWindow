const { existsSync, readdirSync, readFileSync, statSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const manifestPath = join(root, "manifest.json");
const floatingPlayerBundlePath = join(root, "dist", "floatingPlayerUI.global.js");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectJavaScriptFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === ".brave-dev-profile") {
        return [];
      }

      return collectJavaScriptFiles(fullPath);
    }

    return entry.endsWith(".js") ? [fullPath] : [];
  });
}

assert(manifest.manifest_version === 3, "manifest_version must be 3.");
assert(manifest.background?.service_worker === "background.js", "Manifest must use background.js as the service worker.");
assert(Array.isArray(manifest.permissions), "Manifest permissions must be an array.");
assert(manifest.permissions.includes("activeTab"), "Manifest must include activeTab.");
assert(manifest.permissions.includes("scripting"), "Manifest must include scripting.");
assert(!manifest.host_permissions, "Manifest must not request host_permissions in v1.");
assert(!manifest.permissions.some((permission) => permission.includes("://") || permission === "<all_urls>"), "Manifest must not request broad host access.");
assert(Array.isArray(manifest.content_scripts), "Manifest must define content_scripts for YouTube toolbar integration.");

const [youtubeContentScript] = manifest.content_scripts;
assert(youtubeContentScript.matches.length === 2, "YouTube content script must have exactly two matches.");
assert(youtubeContentScript.matches.includes("https://www.youtube.com/*"), "YouTube content script must target www.youtube.com.");
assert(youtubeContentScript.matches.includes("https://music.youtube.com/*"), "YouTube content script must target music.youtube.com.");
assert(!youtubeContentScript.matches.some((match) => match === "<all_urls>" || match === "https://*/*" || match === "http://*/*"), "Content script must not use broad matches.");

for (const asset of [
  ...youtubeContentScript.js,
  ...(youtubeContentScript.css || [])
]) {
  assert(existsSync(join(root, asset)), `Manifest asset does not exist: ${asset}`);
}

assert(existsSync(floatingPlayerBundlePath), "Built floating player bundle is missing. Run npm run build.");

const floatingPlayerBundle = readFileSync(floatingPlayerBundlePath, "utf8");
assert(floatingPlayerBundle.includes("NativePiPFloatingPlayerUI"), "Floating player bundle must expose NativePiPFloatingPlayerUI.");
assert(floatingPlayerBundle.includes("mount"), "Floating player bundle must expose a mount contract.");
assert(!floatingPlayerBundle.includes("process.env"), "Floating player bundle must not contain process.env.");
assert(!/\bprocess\.(cwd|version|versions|platform|browser)\b/.test(floatingPlayerBundle), "Floating player bundle contains Node-only process globals.");
assert(!/\brequire\s*\(/.test(floatingPlayerBundle), "Floating player bundle must not contain CommonJS require calls.");
assert(!/\bmodule\.exports\b/.test(floatingPlayerBundle), "Floating player bundle must not contain module.exports.");

for (const file of collectJavaScriptFiles(root)) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log("Extension checks passed.");
