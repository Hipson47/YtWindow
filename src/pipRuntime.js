(function attachSharedPiPRuntime(globalObject) {
  const TOAST_ID = "__native_picture_in_picture_toggle_toast__";

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${remainingSeconds}`;
    }

    return `${minutes}:${remainingSeconds}`;
  }

  function showToast(message) {
    const existingToast = globalObject.document?.getElementById(TOAST_ID);
    if (existingToast) {
      existingToast.remove();
    }

    const toast = globalObject.document.createElement("div");
    toast.id = TOAST_ID;
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      maxWidth: "min(320px, calc(100vw - 32px))",
      padding: "10px 12px",
      borderRadius: "8px",
      background: "rgba(20, 20, 20, 0.92)",
      color: "#fff",
      font: "13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
      pointerEvents: "none",
      opacity: "1",
      transition: "opacity 160ms ease"
    });

    globalObject.document.documentElement.appendChild(toast);

    globalObject.setTimeout(() => {
      toast.style.opacity = "0";
      globalObject.setTimeout(() => toast.remove(), 180);
    }, 2200);
  }

  function selectBestVideo() {
    return globalObject.NativePiPVideoSelector.selectBestVideo(
      globalObject.document.querySelectorAll("video"),
      {
        getComputedStyle: globalObject.getComputedStyle.bind(globalObject),
        readyStateHaveNothing: globalObject.HTMLMediaElement.HAVE_NOTHING,
        readyStateHaveCurrentData: globalObject.HTMLMediaElement.HAVE_CURRENT_DATA,
        viewport: {
          width: globalObject.innerWidth || globalObject.document.documentElement.clientWidth,
          height: globalObject.innerHeight || globalObject.document.documentElement.clientHeight
        }
      }
    );
  }

  const sharedApi = {
    clamp,
    formatTime,
    selectBestVideo,
    showToast
  };

  const compatibilityApi = {
    clamp,
    formatTime,
    selectBestVideo,
    showToast,
    async toggleNativePictureInPicture() {
      return globalObject.NativePiPNativeRuntime.toggleNativePictureInPicture();
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = sharedApi;
  }

  globalObject.NativePiPSharedRuntime = sharedApi;
  globalObject.NativePiPRuntime = compatibilityApi;
})(typeof globalThis !== "undefined" ? globalThis : window);
