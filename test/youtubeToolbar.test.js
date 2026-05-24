const test = require("node:test");
const assert = require("node:assert/strict");

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentElement = null;
    this.attributes = {};
    this.eventListeners = {};
    this.style = {};
    this.className = "";
    this.innerHTML = "";
    this.textContent = "";
    this.type = "";
  }

  set id(value) {
    this._id = value;
    this.ownerDocument.elementsById.set(value, this);
  }

  get id() {
    return this._id;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, listener) {
    this.eventListeners[type] = listener;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  remove() {
    if (!this.parentElement) {
      return;
    }

    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
    this.ownerDocument.elementsById.delete(this.id);
  }
}

class FakeDocument {
  constructor() {
    this.elementsById = new Map();
    this.rightControls = new FakeElement("div", this);
    this.rightControls.className = "ytp-right-controls";
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  getElementById(id) {
    return this.elementsById.get(id) || null;
  }

  querySelector(selector) {
    return selector === ".ytp-right-controls" ? this.rightControls : null;
  }
}

test("YouTube toolbar injection is idempotent", () => {
  const modulePath = require.resolve("../src/youtubeToolbar");
  delete require.cache[modulePath];

  globalThis.NativePiPDocumentRuntime = {
    openPremiumPlayer: async () => ({ ok: true, action: "enter-document" })
  };
  globalThis.NativePiPNativeRuntime = {
    toggleNativePictureInPicture: async () => ({ ok: true, action: "enter" })
  };

  const toolbar = require("../src/youtubeToolbar");
  const documentObject = new FakeDocument();

  assert.equal(toolbar.ensureButton(documentObject), true);
  assert.equal(toolbar.ensureButton(documentObject), true);
  assert.equal(documentObject.rightControls.children.length, 1);

  const [button] = documentObject.rightControls.children;
  assert.equal(button.id, "ytwindow-pip-button");
  assert.equal(button.className, "ytp-button ytwindow-pip-button");
  assert.equal(button.title, "Open floating player");
  assert.equal(button.getAttribute("aria-label"), "Open floating player");

  delete globalThis.NativePiPYouTubeToolbar;
  delete globalThis.NativePiPDocumentRuntime;
  delete globalThis.NativePiPNativeRuntime;
});

test("YouTube toolbar button click calls the premium Document PiP runtime", async () => {
  const modulePath = require.resolve("../src/youtubeToolbar");
  delete require.cache[modulePath];

  let toggleCalls = 0;
  globalThis.NativePiPDocumentRuntime = {
    openPremiumPlayer: async () => {
      toggleCalls += 1;
      return { ok: true, action: "enter-document" };
    }
  };
  globalThis.NativePiPNativeRuntime = {
    toggleNativePictureInPicture: async () => ({ ok: true, action: "enter-native" })
  };

  const toolbar = require("../src/youtubeToolbar");
  const documentObject = new FakeDocument();
  toolbar.ensureButton(documentObject);

  const [button] = documentObject.rightControls.children;
  let prevented = false;
  let stopped = false;
  await button.eventListeners.click({
    preventDefault: () => {
      prevented = true;
    },
    stopPropagation: () => {
      stopped = true;
    }
  });

  assert.equal(toggleCalls, 1);
  assert.equal(prevented, true);
  assert.equal(stopped, true);

  delete globalThis.NativePiPYouTubeToolbar;
  delete globalThis.NativePiPDocumentRuntime;
  delete globalThis.NativePiPNativeRuntime;
});
