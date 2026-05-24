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
  assert.match(styles, /\.ytp-volume:hover \.ytp-volume__slider/);
  assert.match(styles, /\.ytp-volume\.is-active \.ytp-volume__slider/);
  assert.doesNotMatch(styles, /\.ytp-volume__slider[\s\S]{0,120}display:\s*none/);
});

test("React floating player source avoids native select controls", () => {
  const source = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayerEntry.jsx"), "utf8");

  assert.doesNotMatch(source, /createElement\("select"\)/);
  assert.doesNotMatch(source, /<select/);
});

test("React floating player source uses cohesive inline media icons", () => {
  const source = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayerEntry.jsx"), "utf8");

  assert.match(source, /volumeHigh/);
  assert.match(source, /volumeLow/);
  assert.match(source, /speed:/);
  assert.match(source, /viewBox="0 0 36 36"/);
  assert.doesNotMatch(source, /<text/);
});

test("seek icons do not render visible numeric labels", () => {
  const source = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayerEntry.jsx"), "utf8");
  const iconBlock = source.slice(source.indexOf("const ICONS = {"), source.indexOf("};", source.indexOf("const ICONS = {")));
  const seekIconMarkup = [iconBlock.match(/rewind:\s*(<svg[\s\S]*?<\/svg>),/)?.[1], iconBlock.match(/forward:\s*(<svg[\s\S]*?<\/svg>),/)?.[1]].join("\n");

  assert.doesNotMatch(seekIconMarkup, /<text\b/);
  assert.doesNotMatch(seekIconMarkup, />\s*10\s*</);
  assert.doesNotMatch(seekIconMarkup, /\bfont(Size|Family)?=/);
});

test("floating player helper functions are stable", async () => {
  const floatingPlayerUtils = await import("../src/react/playerUtils.mjs");

  assert.equal(floatingPlayerUtils.progressRatio(50, 100), 0.5);
  assert.equal(floatingPlayerUtils.progressRatio(150, 100), 1);
  assert.equal(floatingPlayerUtils.progressRatio(-10, 100), 0);
  assert.equal(floatingPlayerUtils.progressRatio(10, 0), 0);
  assert.equal(floatingPlayerUtils.boundedSeekTime(5, -10, 100), 0);
  assert.equal(floatingPlayerUtils.boundedSeekTime(95, 10, 100), 100);
  assert.equal(floatingPlayerUtils.boundedSeekTime(50, -10, 100), 40);
  assert.equal(floatingPlayerUtils.boundedSeekTime(50, 10, 100), 60);
  assert.equal(floatingPlayerUtils.clampVolume(2), 1);
  assert.equal(floatingPlayerUtils.clampVolume(-1), 0);
  assert.equal(floatingPlayerUtils.steppedVolume(0.98, 1), 1);
  assert.equal(floatingPlayerUtils.steppedVolume(0.02, -1), 0);
  assert.equal(floatingPlayerUtils.speedLabel(1), "1x");
  assert.equal(floatingPlayerUtils.speedLabel(1.25), "1.25x");
  assert.deepEqual(floatingPlayerUtils.SPEED_OPTIONS, [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
});

test("floating player volume helper mutes and unmutes safely", async () => {
  const floatingPlayerUtils = await import("../src/react/playerUtils.mjs");
  const video = {
    muted: true,
    volume: 0
  };

  assert.deepEqual(floatingPlayerUtils.applyVolumeChange(video, 0.4), {
    muted: false,
    volume: 0.4
  });
  assert.deepEqual(floatingPlayerUtils.applyVolumeChange(video, 0), {
    muted: true,
    volume: 0
  });
});
