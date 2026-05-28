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

test("React floating player defaults video rendering to Fill/Cover", () => {
  const styles = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayer.css"), "utf8");
  const source = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayerEntry.jsx"), "utf8");
  const utilsSource = readFileSync(join(__dirname, "..", "src", "react", "playerUtils.mjs"), "utf8");
  const videoRule = styles.match(/\.ytp-clone__video video\s*{[\s\S]*?}/)?.[0] || "";

  assert.match(videoRule, /object-fit:\s*cover/);
  assert.doesNotMatch(videoRule, /object-fit:\s*contain/);
  assert.match(source, /video\.style\.objectFit = objectFitForMode\(DEFAULT_FIT_MODE\)/);
  assert.doesNotMatch(source, /readStoredFitMode/);
  assert.doesNotMatch(source, /toggleFitMode/);
  assert.match(utilsSource, /PREVIOUS_FIT_MODE_STORAGE_KEY = "native-pip-fit-mode-v2"/);
  assert.match(utilsSource, /FIT_MODE_STORAGE_KEY = "native-pip-fit-mode-v3"/);
  assert.match(utilsSource, /FIT_MODE_MIGRATION_KEY = "native-pip-fit-mode-migration-v3"/);
});

test("React floating player layout keeps controls overlayed over the video", () => {
  const styles = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayer.css"), "utf8");

  assert.match(styles, /\.ytp-clone\s*{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;/);
  assert.match(styles, /\.ytp-clone__video\s*{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;/);
  assert.match(styles, /\.ytp-clone__overlay\s*{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;/);
  assert.match(styles, /\.ytp-clone__toolbar\s*{[\s\S]*position:\s*absolute;[\s\S]*bottom:\s*0;/);
  assert.match(styles, /\.ytp-clone__row\s*{[\s\S]*display:\s*flex;/);
  assert.doesNotMatch(styles, /\.ytp-clone__row\s*{[\s\S]*grid-template-columns/);
  assert.doesNotMatch(styles, /\.ytp-clone__row \.ytp-secondary[\s\S]{0,120}display:\s*none/);
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

test("React floating player preserves the old bottom toolbar control layout", () => {
  const source = readFileSync(join(__dirname, "..", "src", "react", "floatingPlayerEntry.jsx"), "utf8");
  const toolbarBlock = source.slice(source.indexOf("<div className=\"ytp-clone__row\">"), source.indexOf("</div>\n        </div>\n      </div>\n    </main>", source.indexOf("<div className=\"ytp-clone__row\">")));

  assert.match(toolbarBlock, /VolumeControl/);
  assert.match(toolbarBlock, /SpeedMenu/);
  assert.match(toolbarBlock, /Close floating player/);
  assert.doesNotMatch(toolbarBlock, /FitModeButton/);
  assert.doesNotMatch(toolbarBlock, /ytp-fit__button/);
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
  assert.equal(floatingPlayerUtils.DEFAULT_FIT_MODE, "fill");
  assert.equal(floatingPlayerUtils.normalizeFitMode(undefined), "fill");
  assert.equal(floatingPlayerUtils.normalizeFitMode("fit"), "fit");
  assert.equal(floatingPlayerUtils.objectFitForMode("fit"), "cover");
  assert.equal(floatingPlayerUtils.objectFitForMode("fill"), "cover");
  assert.equal(floatingPlayerUtils.objectFitForMode("unexpected"), "cover");
  assert.equal(floatingPlayerUtils.nextFitMode("fit"), "fill");
  assert.equal(floatingPlayerUtils.nextFitMode("fill"), "fill");
  assert.equal(floatingPlayerUtils.speedLabel(1), "1x");
  assert.equal(floatingPlayerUtils.speedLabel(1.25), "1.25x");
  assert.deepEqual(floatingPlayerUtils.SPEED_OPTIONS, [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
});

test("floating player fit-mode storage migration defaults old state to Fill", async () => {
  const floatingPlayerUtils = await import("../src/react/playerUtils.mjs");

  assert.equal(floatingPlayerUtils.resolveStoredFitMode(), "fill");
  assert.equal(floatingPlayerUtils.resolveStoredFitMode({ legacyMode: "fit" }), "fill");
  assert.equal(floatingPlayerUtils.resolveStoredFitMode({ previousMode: "fit" }), "fill");
  assert.equal(floatingPlayerUtils.resolveStoredFitMode({ storedMode: "fit" }), "fill");
  assert.equal(floatingPlayerUtils.resolveStoredFitMode({ storedMode: "fill" }), "fill");
  assert.equal(floatingPlayerUtils.resolveStoredFitMode({ storedMode: "contain" }), "fill");
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
