const test = require("node:test");
const assert = require("node:assert/strict");
const { selectBestVideo, scoreVideo } = require("../src/videoSelector");

const viewport = { width: 1280, height: 720 };
const visibleStyle = { display: "block", visibility: "visible", opacity: "1" };

function makeVideo(overrides = {}) {
  const rect = overrides.rect || {
    left: 0,
    top: 0,
    right: 640,
    bottom: 360,
    width: 640,
    height: 360
  };

  return {
    isConnected: true,
    ended: false,
    disablePictureInPicture: false,
    readyState: 2,
    paused: false,
    currentTime: 12,
    muted: false,
    volume: 1,
    mockStyle: visibleStyle,
    getBoundingClientRect: () => rect,
    ...overrides
  };
}

function options() {
  return {
    viewport,
    getComputedStyle: (video) => video.mockStyle || visibleStyle
  };
}

test("returns null when there are no videos", () => {
  assert.equal(selectBestVideo([], options()), null);
});

test("ignores videos hidden by style", () => {
  const hidden = makeVideo({
    mockStyle: { display: "none", visibility: "visible", opacity: "1" }
  });

  assert.equal(selectBestVideo([hidden], options()), null);
});

test("ignores ended videos", () => {
  const ended = makeVideo({ ended: true });

  assert.equal(selectBestVideo([ended], options()), null);
});

test("ignores tiny videos", () => {
  const tiny = makeVideo({
    rect: { left: 0, top: 0, right: 20, bottom: 20, width: 20, height: 20 }
  });

  assert.equal(selectBestVideo([tiny], options()), null);
});

test("ignores videos that disable Picture-in-Picture", () => {
  const disabled = makeVideo({ disablePictureInPicture: true });

  assert.equal(selectBestVideo([disabled], options()), null);
});

test("prefers the largest visible active video when videos are otherwise similar", () => {
  const small = makeVideo({
    rect: { left: 0, top: 0, right: 320, bottom: 180, width: 320, height: 180 }
  });
  const large = makeVideo({
    rect: { left: 0, top: 0, right: 960, bottom: 540, width: 960, height: 540 }
  });

  assert.equal(selectBestVideo([small, large], options()), large);
});

test("prefers playing media over a larger paused candidate", () => {
  const pausedLarge = makeVideo({
    paused: true,
    rect: { left: 0, top: 0, right: 1200, bottom: 675, width: 1200, height: 675 }
  });
  const playingSmall = makeVideo({
    paused: false,
    rect: { left: 0, top: 0, right: 640, bottom: 360, width: 640, height: 360 }
  });

  assert.equal(selectBestVideo([pausedLarge, playingSmall], options()), playingSmall);
});

test("uses visible viewport area when a video is partially off screen", () => {
  const mostlyOffscreen = makeVideo({
    rect: { left: 1200, top: 650, right: 1800, bottom: 1000, width: 600, height: 350 }
  });
  const onscreen = makeVideo({
    rect: { left: 0, top: 0, right: 400, bottom: 225, width: 400, height: 225 }
  });

  assert.equal(selectBestVideo([mostlyOffscreen, onscreen], options()), onscreen);
});

test("returns null score for media with no ready data", () => {
  const empty = makeVideo({ readyState: 0 });

  assert.equal(scoreVideo(empty, options()), null);
});
