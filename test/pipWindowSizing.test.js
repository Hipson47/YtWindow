const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computePipWindowSize,
  waitForVideoMetadata
} = require("../src/pipWindowSizing");

function assertNear(actual, expected, tolerance = 0.02) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test("computes 16:9 PiP window size from video metadata", () => {
  const size = computePipWindowSize({
    availableHeight: 1080,
    availableWidth: 1920,
    videoHeight: 1080,
    videoWidth: 1920
  });

  assert.equal(size.source, "video-metadata");
  assert.equal(size.width, 760);
  assert.equal(size.height, 428);
  assertNear(size.width / size.height, 16 / 9);
});

test("computes 4:3 PiP window size without forcing widescreen", () => {
  const size = computePipWindowSize({
    availableHeight: 1080,
    availableWidth: 1920,
    videoHeight: 480,
    videoWidth: 640
  });

  assert.equal(size.source, "video-metadata");
  assert.equal(size.width, 760);
  assert.equal(size.height, 570);
  assertNear(size.width / size.height, 4 / 3);
});

test("computes portrait PiP window size within available screen height", () => {
  const size = computePipWindowSize({
    availableHeight: 1080,
    availableWidth: 1920,
    videoHeight: 1920,
    videoWidth: 1080
  });

  assert.equal(size.source, "video-metadata");
  assert.ok(size.height <= Math.round(1080 * 0.65));
  assertNear(size.width / size.height, 1080 / 1920);
});

test("falls back to 16:9 when metadata is invalid", () => {
  const size = computePipWindowSize({
    availableHeight: 900,
    availableWidth: 1440,
    videoHeight: 0,
    videoWidth: 0
  });

  assert.equal(size.source, "fallback");
  assertNear(size.aspectRatio, 16 / 9);
  assertNear(size.width / size.height, 16 / 9);
});

test("keeps positive dimensions on small available screens", () => {
  const size = computePipWindowSize({
    availableHeight: 360,
    availableWidth: 640,
    videoHeight: 720,
    videoWidth: 1280
  });

  assert.ok(size.width > 0);
  assert.ok(size.height > 0);
  assert.ok(size.width >= 420);
  assert.ok(size.height >= 236);
  assertNear(size.width / size.height, 16 / 9);
});

test("does not grow large-screen windows beyond the preferred landscape width", () => {
  const size = computePipWindowSize({
    availableHeight: 2880,
    availableWidth: 5120,
    videoHeight: 2160,
    videoWidth: 3840
  });

  assert.equal(size.width, 760);
  assert.equal(size.height, 428);
});

test("waitForVideoMetadata resolves immediately when metadata exists", async () => {
  const loaded = await waitForVideoMetadata({
    videoHeight: 1080,
    videoWidth: 1920
  });

  assert.equal(loaded, false);
});
