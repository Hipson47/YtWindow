(function attachNativePiPRuntime(globalObject) {
  function isSupported() {
    return Boolean(
      globalObject.document?.pictureInPictureEnabled &&
        typeof globalObject.HTMLVideoElement !== "undefined" &&
        globalObject.HTMLVideoElement.prototype.requestPictureInPicture &&
        globalObject.document.exitPictureInPicture
    );
  }

  async function toggleNativePictureInPicture() {
    const shared = globalObject.NativePiPSharedRuntime;

    try {
      if (globalObject.document.pictureInPictureElement) {
        await globalObject.document.exitPictureInPicture();
        return { ok: true, action: "exit-native" };
      }

      if (!isSupported()) {
        shared.showToast("Picture-in-Picture is not supported on this page.");
        return { ok: false, reason: "unsupported" };
      }

      const selectedVideo = shared.selectBestVideo();
      if (!selectedVideo) {
        shared.showToast("No video found.");
        return { ok: false, reason: "no-video" };
      }

      await selectedVideo.requestPictureInPicture();
      return { ok: true, action: "enter-native" };
    } catch (error) {
      console.warn("Native Picture-in-Picture Toggle failed.", error);
      shared.showToast("Picture-in-Picture is not supported on this page.");
      return { ok: false, reason: "error" };
    }
  }

  const api = {
    isSupported,
    toggleNativePictureInPicture
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPNativeRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
