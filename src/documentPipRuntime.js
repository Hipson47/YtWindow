(function attachDocumentPiPRuntime(globalObject) {
  function isSupported() {
    return Boolean(globalObject.documentPictureInPicture?.requestWindow);
  }

  function createRestoreContext(video) {
    const parent = video.parentNode;
    if (!parent) {
      return null;
    }

    const placeholder = globalObject.document.createComment("Native PiP restore anchor");
    parent.insertBefore(placeholder, video);

    return {
      parent,
      placeholder,
      originalControls: video.controls,
      originalInlineStyle: video.getAttribute("style")
    };
  }

  function restoreVideo(video, restoreContext) {
    if (!restoreContext) {
      return;
    }

    if (restoreContext.placeholder.parentNode) {
      restoreContext.placeholder.parentNode.insertBefore(video, restoreContext.placeholder);
      restoreContext.placeholder.remove();
    } else if (restoreContext.parent.isConnected) {
      restoreContext.parent.appendChild(video);
    }

    video.controls = restoreContext.originalControls;
    if (restoreContext.originalInlineStyle == null) {
      video.removeAttribute("style");
    } else {
      video.setAttribute("style", restoreContext.originalInlineStyle);
    }
  }

  async function openPremiumPlayer() {
    const shared = globalObject.NativePiPSharedRuntime;

    if (globalObject.__NativePiPDocumentSession?.isOpen) {
      globalObject.__NativePiPDocumentSession.restoreAndClose();
      return { ok: true, action: "exit-document" };
    }

    if (!isSupported()) {
      return globalObject.NativePiPNativeRuntime.toggleNativePictureInPicture();
    }

    const video = shared.selectBestVideo();
    if (!video) {
      shared.showToast("No video found.");
      return { ok: false, reason: "no-video" };
    }

    const restoreContext = createRestoreContext(video);
    if (!restoreContext) {
      return globalObject.NativePiPNativeRuntime.toggleNativePictureInPicture();
    }

    let pipWindow;
    let mountedUi;
    let restored = false;

    function restoreAndClose() {
      if (restored) {
        return;
      }

      restored = true;
      if (mountedUi) {
        mountedUi.destroy();
      }
      restoreVideo(video, restoreContext);
      globalObject.removeEventListener("pagehide", restoreAndClose);
      globalObject.document.removeEventListener("yt-navigate-start", restoreAndClose);

      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
      }

      if (globalObject.__NativePiPDocumentSession?.restoreAndClose === restoreAndClose) {
        globalObject.__NativePiPDocumentSession = null;
      }
    }

    try {
      pipWindow = await globalObject.documentPictureInPicture.requestWindow({
        width: Math.min(Math.max(Math.round(globalObject.innerWidth * 0.34), 420), 760),
        height: Math.min(Math.max(Math.round(globalObject.innerHeight * 0.34), 260), 520)
      });

      video.controls = false;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "contain";

      globalObject.__NativePiPDocumentSession = {
        get isOpen() {
          return Boolean(pipWindow && !pipWindow.closed && !restored);
        },
        restoreAndClose
      };

      mountedUi = globalObject.NativePiPFloatingPlayerUI.mount({
        pipWindow,
        video,
        title: globalObject.document.title || "Floating video",
        onRestore: restoreAndClose
      });

      pipWindow.addEventListener("pagehide", restoreAndClose, { once: true });
      globalObject.addEventListener("pagehide", restoreAndClose);
      globalObject.document.addEventListener("yt-navigate-start", restoreAndClose);

      if (video.paused) {
        await video.play().catch(() => {});
      }

      return { ok: true, action: "enter-document" };
    } catch (error) {
      console.warn("Document Picture-in-Picture failed.", error);
      restoreAndClose();
      return globalObject.NativePiPNativeRuntime.toggleNativePictureInPicture();
    }
  }

  const api = {
    createRestoreContext,
    isSupported,
    openPremiumPlayer,
    restoreVideo
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPDocumentRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
