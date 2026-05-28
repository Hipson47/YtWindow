const test = require("node:test");
const assert = require("node:assert/strict");

test("Document PiP runtime does not auto-open on load and reports support", () => {
  const modulePath = require.resolve("../src/documentPipRuntime");
  delete require.cache[modulePath];

  let requestWindowCalls = 0;
  const originalDocumentPictureInPicture = globalThis.documentPictureInPicture;
  globalThis.documentPictureInPicture = {
    requestWindow: async () => {
      requestWindowCalls += 1;
      return {};
    }
  };

  const runtime = require("../src/documentPipRuntime");

  assert.equal(runtime.isSupported(), true);
  assert.equal(requestWindowCalls, 0);

  globalThis.documentPictureInPicture = originalDocumentPictureInPicture;
  delete globalThis.NativePiPDocumentRuntime;
});

test("Document PiP runtime falls back to native PiP when unsupported", async () => {
  const modulePath = require.resolve("../src/documentPipRuntime");
  delete require.cache[modulePath];

  let nativeCalls = 0;
  const originalDocumentPictureInPicture = globalThis.documentPictureInPicture;
  const originalNativeRuntime = globalThis.NativePiPNativeRuntime;

  delete globalThis.documentPictureInPicture;
  globalThis.NativePiPNativeRuntime = {
    toggleNativePictureInPicture: async () => {
      nativeCalls += 1;
      return { ok: true, action: "enter-native" };
    }
  };

  const runtime = require("../src/documentPipRuntime");
  const result = await runtime.openPremiumPlayer();

  assert.deepEqual(result, { ok: true, action: "enter-native" });
  assert.equal(nativeCalls, 1);

  globalThis.documentPictureInPicture = originalDocumentPictureInPicture;
  globalThis.NativePiPNativeRuntime = originalNativeRuntime;
  delete globalThis.NativePiPDocumentRuntime;
});

test("Document PiP runtime requests an aspect-ratio-aware initial window size", async () => {
  const sizingModulePath = require.resolve("../src/pipWindowSizing");
  const runtimeModulePath = require.resolve("../src/documentPipRuntime");
  delete require.cache[sizingModulePath];
  delete require.cache[runtimeModulePath];

  const originalScreen = globalThis.screen;
  const originalInnerWidth = globalThis.innerWidth;
  const originalInnerHeight = globalThis.innerHeight;

  globalThis.screen = {
    availHeight: 1080,
    availWidth: 1920
  };
  globalThis.innerHeight = 800;
  globalThis.innerWidth = 1200;

  require("../src/pipWindowSizing");
  const runtime = require("../src/documentPipRuntime");
  const options = await runtime.computeRequestWindowOptions({
    videoHeight: 1080,
    videoWidth: 1920
  });

  assert.equal(options.requestOptions.width, 760);
  assert.equal(options.requestOptions.height, 428);
  assert.equal(options.requestOptions.preferInitialWindowPlacement, true);
  assert.equal(options.source, "video-metadata");

  globalThis.screen = originalScreen;
  globalThis.innerWidth = originalInnerWidth;
  globalThis.innerHeight = originalInnerHeight;
  delete globalThis.NativePiPWindowSizing;
  delete globalThis.NativePiPDocumentRuntime;
});

test("Document PiP runtime sets the moved video to cover by default", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "src", "documentPipRuntime.js"), "utf8");

  assert.match(source, /video\.style\.objectFit = "cover"/);
  assert.doesNotMatch(source, /video\.style\.objectFit = "contain"/);
});

test("Document PiP runtime keeps the session open on YouTube navigation start", () => {
  const modulePath = require.resolve("../src/documentPipRuntime");
  delete require.cache[modulePath];
  const runtime = require("../src/documentPipRuntime");

  const session = runtime.createDocumentSession({
    initialRestoreContext: {},
    initialVideo: {},
    mountedUi: { destroy() {} },
    pipWindow: { closed: false }
  });

  session.handleYouTubeNavigateStart = () => {
    session.navigationInProgress = true;
  };
  session.handleYouTubeNavigateStart();

  assert.equal(session.isOpen, true);
  assert.equal(session.navigationInProgress, true);
  delete globalThis.NativePiPDocumentRuntime;
});

test("Document PiP runtime exposes YouTube navigation rebind hooks", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "src", "documentPipRuntime.js"), "utf8");

  assert.doesNotMatch(source, /addEventListener\("yt-navigate-start", restoreAndClose\)/);
  assert.match(source, /addEventListener\("yt-navigate-start", handleYouTubeNavigateStart\)/);
  assert.match(source, /addEventListener\("yt-navigate-finish", handleYouTubeNavigateFinish\)/);
  assert.match(source, /session\.mountedUi\?\.updateVideo\?\.\(nextVideo\)/);
});

test("Document PiP runtime reports a missing floating player UI bundle", async () => {
  const modulePath = require.resolve("../src/documentPipRuntime");
  delete require.cache[modulePath];

  const originalDocumentPictureInPicture = globalThis.documentPictureInPicture;
  const originalSharedRuntime = globalThis.NativePiPSharedRuntime;
  const originalNativeRuntime = globalThis.NativePiPNativeRuntime;
  const originalFloatingPlayerUI = globalThis.NativePiPFloatingPlayerUI;
  const originalConsoleError = console.error;

  let toastMessage = "";
  let nativeCalls = 0;
  let selectCalls = 0;

  globalThis.documentPictureInPicture = {
    requestWindow: async () => {
      throw new Error("requestWindow should not be called without UI bundle");
    }
  };
  globalThis.NativePiPSharedRuntime = {
    selectBestVideo: () => {
      selectCalls += 1;
      return null;
    },
    showToast: (message) => {
      toastMessage = message;
    }
  };
  globalThis.NativePiPNativeRuntime = {
    toggleNativePictureInPicture: async () => {
      nativeCalls += 1;
      return { ok: true, action: "enter-native" };
    }
  };
  delete globalThis.NativePiPFloatingPlayerUI;
  console.error = () => {};

  const runtime = require("../src/documentPipRuntime");
  const result = await runtime.openPremiumPlayer();

  assert.deepEqual(result, { ok: false, reason: "missing-ui" });
  assert.match(toastMessage, /Floating player UI failed to load/);
  assert.equal(nativeCalls, 0);
  assert.equal(selectCalls, 0);

  globalThis.documentPictureInPicture = originalDocumentPictureInPicture;
  globalThis.NativePiPSharedRuntime = originalSharedRuntime;
  globalThis.NativePiPNativeRuntime = originalNativeRuntime;
  globalThis.NativePiPFloatingPlayerUI = originalFloatingPlayerUI;
  console.error = originalConsoleError;
  delete globalThis.NativePiPDocumentRuntime;
});

test("Document PiP restore context returns video to its anchor", () => {
  const modulePath = require.resolve("../src/documentPipRuntime");
  delete require.cache[modulePath];

  const originalDocument = globalThis.document;

  class FakeNode {
    constructor(name) {
      this.name = name;
      this.children = [];
      this.parentNode = null;
      this.isConnected = true;
      this.attributes = new Map();
      this.controls = false;
    }

    appendChild(child) {
      child.remove();
      child.parentNode = this;
      this.children.push(child);
      return child;
    }

    insertBefore(child, reference) {
      child.remove();
      child.parentNode = this;
      const index = this.children.indexOf(reference);
      if (index === -1) {
        this.children.push(child);
      } else {
        this.children.splice(index, 0, child);
      }
      return child;
    }

    remove() {
      if (!this.parentNode) {
        return;
      }
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    }

    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }

    setAttribute(name, value) {
      this.attributes.set(name, value);
    }

    removeAttribute(name) {
      this.attributes.delete(name);
    }
  }

  globalThis.document = {
    createComment: (text) => new FakeNode(text)
  };

  const parent = new FakeNode("parent");
  const video = new FakeNode("video");
  const next = new FakeNode("next");
  video.controls = true;
  video.setAttribute("style", "width: 10px");
  parent.appendChild(video);
  parent.appendChild(next);

  const runtime = require("../src/documentPipRuntime");
  const context = runtime.createRestoreContext(video);
  const floatingRoot = new FakeNode("floating-root");
  floatingRoot.appendChild(video);

  runtime.restoreVideo(video, context);

  assert.equal(parent.children[0], video);
  assert.equal(parent.children[1], next);
  assert.equal(video.controls, true);
  assert.equal(video.getAttribute("style"), "width: 10px");

  globalThis.document = originalDocument;
  delete globalThis.NativePiPDocumentRuntime;
});
