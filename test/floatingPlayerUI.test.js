const test = require("node:test");
const assert = require("node:assert/strict");
const floatingPlayerUI = require("../src/floatingPlayerUI");

test("floating player styles include responsive center controls and bottom bar", () => {
  assert.match(floatingPlayerUI.STYLES, /--ytwindow-control-size: clamp/);
  assert.match(floatingPlayerUI.STYLES, /ytwindow-bottom-bar/);
  assert.match(floatingPlayerUI.STYLES, /grid-template-columns/);
});
