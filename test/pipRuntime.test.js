const test = require("node:test");
const assert = require("node:assert/strict");

test("shared PiP runtime defines helpers without auto-running Picture-in-Picture", () => {
  const modulePath = require.resolve("../src/pipRuntime");
  delete require.cache[modulePath];

  let nativeCalls = 0;
  const originalNativeRuntime = globalThis.NativePiPNativeRuntime;
  globalThis.NativePiPNativeRuntime = {
    toggleNativePictureInPicture: async () => {
      nativeCalls += 1;
      return { ok: true, action: "enter-native" };
    }
  };

  const shared = require("../src/pipRuntime");

  assert.equal(typeof shared.formatTime, "function");
  assert.equal(shared.formatTime(65), "1:05");
  assert.equal(shared.clamp(12, 0, 10), 10);
  assert.equal(nativeCalls, 0);

  globalThis.NativePiPNativeRuntime = originalNativeRuntime;
  delete globalThis.NativePiPSharedRuntime;
  delete globalThis.NativePiPRuntime;
});

test("compatibility PiP runtime delegates only when explicitly called", async () => {
  const modulePath = require.resolve("../src/pipRuntime");
  delete require.cache[modulePath];

  let nativeCalls = 0;
  const originalNativeRuntime = globalThis.NativePiPNativeRuntime;
  globalThis.NativePiPNativeRuntime = {
    toggleNativePictureInPicture: async () => {
      nativeCalls += 1;
      return { ok: true, action: "enter-native" };
    }
  };

  require("../src/pipRuntime");
  const result = await globalThis.NativePiPRuntime.toggleNativePictureInPicture();

  assert.deepEqual(result, { ok: true, action: "enter-native" });
  assert.equal(nativeCalls, 1);

  globalThis.NativePiPNativeRuntime = originalNativeRuntime;
  delete globalThis.NativePiPSharedRuntime;
  delete globalThis.NativePiPRuntime;
});
