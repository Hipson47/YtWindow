(async function toggleNativePictureInPicture() {
  const TOAST_ID = "__native_picture_in_picture_toggle_toast__";

  function showToast(message) {
    const existingToast = document.getElementById(TOAST_ID);
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
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

    document.documentElement.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      window.setTimeout(() => toast.remove(), 180);
    }, 2200);
  }

  function isPictureInPictureSupported() {
    return Boolean(
      document.pictureInPictureEnabled &&
        typeof HTMLVideoElement !== "undefined" &&
        HTMLVideoElement.prototype.requestPictureInPicture &&
        document.exitPictureInPicture
    );
  }

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }

    if (!isPictureInPictureSupported()) {
      showToast("Picture-in-Picture is not supported on this page.");
      return;
    }

    const selectedVideo = globalThis.NativePiPVideoSelector.selectBestVideo(
      document.querySelectorAll("video"),
      {
        getComputedStyle: window.getComputedStyle.bind(window),
        readyStateHaveNothing: HTMLMediaElement.HAVE_NOTHING,
        readyStateHaveCurrentData: HTMLMediaElement.HAVE_CURRENT_DATA,
        viewport: {
          width: window.innerWidth || document.documentElement.clientWidth,
          height: window.innerHeight || document.documentElement.clientHeight
        }
      }
    );

    if (!selectedVideo) {
      showToast("No video found.");
      return;
    }

    await selectedVideo.requestPictureInPicture();
  } catch (error) {
    console.warn("Native Picture-in-Picture Toggle failed.", error);
    showToast("Picture-in-Picture is not supported on this page.");
  }
})();
