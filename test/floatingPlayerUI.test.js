const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("React floating player CSS includes YouTube-like responsive controls", () => {
  const styles = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayer.css"), "utf8");

  assert.match(styles, /--yt-center-button-size: clamp/);
  assert.match(styles, /ytp-clone__toolbar/);
  assert.match(styles, /linear-gradient\(to top/);
  assert.match(styles, /--yt-red: #ff0033/);
  assert.match(styles, /ytp-speed__menu/);
  assert.match(styles, /@keyframes ytp-seek-pop/);
});

test("React floating player source avoids native select controls", () => {
  const source = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayerEntry.jsx"), "utf8");

  assert.doesNotMatch(source, /createElement\("select"\)/);
  assert.doesNotMatch(source, /<select/);
});

test("floating player helper functions are stable", async () => {
  const floatingPlayerUtils = await import("../src/react/playerUtils.mjs");

  assert.equal(floatingPlayerUtils.progressRatio(50, 100), 0.5);
  assert.equal(floatingPlayerUtils.progressRatio(150, 100), 1);
  assert.equal(floatingPlayerUtils.progressRatio(-10, 100), 0);
  assert.equal(floatingPlayerUtils.progressRatio(10, 0), 0);
  assert.equal(floatingPlayerUtils.boundedSeekTime(5, -10, 100), 0);
  assert.equal(floatingPlayerUtils.boundedSeekTime(95, 10, 100), 100);
  assert.equal(floatingPlayerUtils.speedLabel(1), "1x");
  assert.equal(floatingPlayerUtils.speedLabel(1.25), "1.25x");
  assert.deepEqual(floatingPlayerUtils.SPEED_OPTIONS, [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
});
