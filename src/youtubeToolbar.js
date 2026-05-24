(function attachYouTubeToolbarButton(globalObject) {
  const BUTTON_ID = "ytwindow-pip-button";
  const BUTTON_TITLE = "Open floating player";
  const RIGHT_CONTROLS_SELECTOR = ".ytp-right-controls";
  const REINJECT_DELAY_MS = 150;
  let reinjectTimer = 0;
  let observer = null;

  function createButton(documentObject) {
    const button = documentObject.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "ytp-button ytwindow-pip-button";
    button.title = BUTTON_TITLE;
    button.setAttribute("aria-label", BUTTON_TITLE);
    button.innerHTML = [
      "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\" focusable=\"false\">",
      "<path class=\"ytwindow-pip-icon-frame\" d=\"M9 10.5h18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Zm0 2v11h18v-11H9Z\"/>",
      "<path class=\"ytwindow-pip-icon-window\" d=\"M18.5 17.5H25v4.75h-6.5z\"/>",
      "</svg>"
    ].join("");

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (globalObject.NativePiPDocumentRuntime) {
        await globalObject.NativePiPDocumentRuntime.openPremiumPlayer();
        return;
      }

      await globalObject.NativePiPNativeRuntime.toggleNativePictureInPicture();
    });

    return button;
  }

  function findRightControls(documentObject) {
    return documentObject.querySelector(RIGHT_CONTROLS_SELECTOR);
  }

  function ensureButton(documentObject = globalObject.document) {
    if (!documentObject || (!globalObject.NativePiPDocumentRuntime && !globalObject.NativePiPNativeRuntime)) {
      return false;
    }

    const rightControls = findRightControls(documentObject);
    if (!rightControls) {
      return false;
    }

    const existingButton = documentObject.getElementById(BUTTON_ID);
    if (existingButton) {
      if (existingButton.parentElement !== rightControls) {
        existingButton.remove();
      } else {
        return true;
      }
    }

    rightControls.appendChild(createButton(documentObject));
    return true;
  }

  function scheduleEnsureButton() {
    globalObject.clearTimeout(reinjectTimer);
    reinjectTimer = globalObject.setTimeout(() => ensureButton(), REINJECT_DELAY_MS);
  }

  function start() {
    if (globalObject.__NativePiPYouTubeToolbarStarted) {
      ensureButton();
      return;
    }

    globalObject.__NativePiPYouTubeToolbarStarted = true;
    ensureButton();
    globalObject.document.addEventListener("yt-navigate-finish", scheduleEnsureButton);
    globalObject.document.addEventListener("fullscreenchange", scheduleEnsureButton);

    observer = new globalObject.MutationObserver(scheduleEnsureButton);
    observer.observe(globalObject.document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  const api = {
    BUTTON_ID,
    BUTTON_TITLE,
    createButton,
    ensureButton,
    findRightControls,
    start
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPYouTubeToolbar = api;

  if (globalObject.document?.documentElement && typeof globalObject.MutationObserver === "function") {
    start();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
