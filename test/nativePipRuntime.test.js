const test = require("node:test");
const assert = require("node:assert/strict");

test("native PiP runtime exits existing native Picture-in-Picture", async () => {
  const modulePath = require.resolve("../src/nativePipRuntime");
  delete require.cache[modulePath];

  let exitCalls = 0;
  const originalDocument = globalThis.document;
  const originalHTMLVideoElement = globalThis.HTMLVideoElement;
  const originalSharedRuntime = globalThis.NativePiPSharedRuntime;

  globalThis.document = {
    pictureInPictureEnabled: true,
    pictureInPictureElement: true,
    exitPictureInPicture: async () => {
      exitCalls += 1;
    }
  };
  globalThis.HTMLVideoElement = function HTMLVideoElement() {};
  globalThis.HTMLVideoElement.prototype.requestPictureInPicture = async () => {};
  globalThis.NativePiPSharedRuntime = {
    showToast: () => {},
    selectBestVideo: () => null
  };

  const runtime = require("../src/nativePipRuntime");
  const result = await runtime.toggleNativePictureInPicture();

  assert.deepEqual(result, { ok: true, action: "exit-native" });
  assert.equal(exitCalls, 1);

  globalThis.document = originalDocument;
  globalThis.HTMLVideoElement = originalHTMLVideoElement;
  globalThis.NativePiPSharedRuntime = originalSharedRuntime;
  delete globalThis.NativePiPNativeRuntime;
});
