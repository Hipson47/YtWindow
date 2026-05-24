const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const floatingPlayerUI = require("../src/floatingPlayerUI");

const source = readFileSync(join(__dirname, "..", "src", "floatingPlayerUI.js"), "utf8");

test("floating player styles include responsive center controls and bottom bar", () => {
  assert.match(floatingPlayerUI.STYLES, /--ytwindow-control-size: clamp/);
  assert.match(floatingPlayerUI.STYLES, /ytwindow-bottom-overlay/);
  assert.match(floatingPlayerUI.STYLES, /grid-template-columns/);
  assert.match(floatingPlayerUI.STYLES, /linear-gradient\(to top/);
  assert.match(floatingPlayerUI.STYLES, /--ytwindow-accent: #ff0033/);
  assert.match(floatingPlayerUI.STYLES, /ytwindow-speed-menu/);
  assert.doesNotMatch(source, /createElement\("select"\)/);
});

test("floating player exposes stable progress and speed helpers", () => {
  assert.equal(floatingPlayerUI.progressRatio(50, 100), 0.5);
  assert.equal(floatingPlayerUI.progressRatio(150, 100), 1);
  assert.equal(floatingPlayerUI.progressRatio(-10, 100), 0);
  assert.equal(floatingPlayerUI.progressRatio(10, 0), 0);
  assert.equal(floatingPlayerUI.speedLabel(1), "1x");
  assert.equal(floatingPlayerUI.speedLabel(1.25), "1.25x");
  assert.deepEqual(floatingPlayerUI.SPEED_OPTIONS, [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
});
