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

  function discardRestoreContext(restoreContext) {
    restoreContext?.placeholder?.remove?.();
  }

  function prepareVideoForDocumentPiP(video) {
    video.controls = false;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
  }

  function formatRuntimeError(error) {
    if (!error) {
      return "Unknown error";
    }

    const name = error.name || "Error";
    const message = error.message || String(error);
    return `${name}: ${message}`;
  }

  function getFloatingPlayerUI() {
    const floatingPlayerUI = globalObject.NativePiPFloatingPlayerUI;
    if (floatingPlayerUI && typeof floatingPlayerUI.mount === "function") {
      return floatingPlayerUI;
    }

    return null;
  }

  function getDebugEnabled() {
    try {
      return Boolean(globalObject.__NativePiPDebug || globalObject.localStorage?.getItem("native-pip-debug") === "1");
    } catch {
      return Boolean(globalObject.__NativePiPDebug);
    }
  }

  function getWindowSizingRuntime() {
    return globalObject.NativePiPWindowSizing;
  }

  async function computeRequestWindowOptions(video) {
    const sizing = getWindowSizingRuntime();
    if (sizing?.waitForVideoMetadata) {
      await sizing.waitForVideoMetadata(video);
    }

    const availableScreen = sizing?.getAvailableScreenSize?.(globalObject) || {
      availableHeight: globalObject.screen?.availHeight || globalObject.innerHeight,
      availableWidth: globalObject.screen?.availWidth || globalObject.innerWidth
    };
    const size = sizing?.computePipWindowSize?.({
      ...availableScreen,
      videoHeight: video.videoHeight,
      videoWidth: video.videoWidth
    }) || {
      aspectRatio: 16 / 9,
      height: Math.min(Math.max(Math.round(globalObject.innerHeight * 0.34), 260), 520),
      source: "fallback",
      width: Math.min(Math.max(Math.round(globalObject.innerWidth * 0.34), 420), 760)
    };

    return {
      ...size,
      requestOptions: {
        height: size.height,
        preferInitialWindowPlacement: true,
        width: size.width
      }
    };
  }

  function createDocumentSession({ initialRestoreContext, initialVideo, mountedUi, pipWindow }) {
    const session = {
      currentRestoreContext: initialRestoreContext,
      currentVideo: initialVideo,
      isClosing: false,
      isRestoring: false,
      mountedUi,
      navigationInProgress: false,
      pipWindow,
      rebindTimer: 0,
      rebindAttempts: 0,
      currentVideoCleanup: null,
      locationPollTimer: 0,
      lastUrl: globalObject.location?.href || "",
      mutationObserver: null,
      get isOpen() {
        return Boolean(session.pipWindow && !session.pipWindow.closed && !session.isClosing);
      }
    };

    return session;
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

    const floatingPlayerUI = getFloatingPlayerUI();
    if (!floatingPlayerUI) {
      const message = "Floating player UI failed to load. Run npm run build, reload the extension, and try again.";
      console.error("Document Picture-in-Picture failed: missing NativePiPFloatingPlayerUI.mount.");
      shared.showToast(message);
      return { ok: false, reason: "missing-ui" };
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
    let session;

    function restoreAndClose() {
      if (!session || session.isClosing) {
        return;
      }

      session.isClosing = true;
      session.isRestoring = true;
      if (session.rebindTimer) {
        globalObject.clearTimeout(session.rebindTimer);
        session.rebindTimer = 0;
      }
      if (session.locationPollTimer) {
        globalObject.clearInterval(session.locationPollTimer);
        session.locationPollTimer = 0;
      }
      session.currentVideoCleanup?.();
      session.currentVideoCleanup = null;
      session.mutationObserver?.disconnect?.();
      session.mutationObserver = null;
      if (session.mountedUi) {
        session.mountedUi.destroy();
      }
      restoreVideo(session.currentVideo, session.currentRestoreContext);
      globalObject.removeEventListener("pagehide", restoreAndClose);
      globalObject.removeEventListener("pagehide", handleOpenerPageHide);
      globalObject.removeEventListener("popstate", handlePossibleYouTubeNavigation);
      globalObject.removeEventListener("hashchange", handlePossibleYouTubeNavigation);
      globalObject.removeEventListener("yt-navigate-start", handleYouTubeNavigateStart);
      globalObject.removeEventListener("yt-navigate-finish", handleYouTubeNavigateFinish);
      globalObject.removeEventListener("yt-page-data-updated", handleYouTubeNavigateFinish);
      globalObject.removeEventListener("yt-player-updated", handleYouTubeNavigateFinish);
      globalObject.document.removeEventListener("yt-navigate-start", handleYouTubeNavigateStart);
      globalObject.document.removeEventListener("yt-navigate-finish", handleYouTubeNavigateFinish);
      globalObject.document.removeEventListener("yt-page-data-updated", handleYouTubeNavigateFinish);
      globalObject.document.removeEventListener("yt-player-updated", handleYouTubeNavigateFinish);

      if (session.pipWindow && !session.pipWindow.closed) {
        session.pipWindow.close();
      }

      if (globalObject.__NativePiPDocumentSession?.restoreAndClose === restoreAndClose) {
        globalObject.__NativePiPDocumentSession = null;
      }
    }

    function replaceSessionVideo(nextVideo) {
      if (!session || !nextVideo || nextVideo === session.currentVideo) {
        return false;
      }

      const nextRestoreContext = createRestoreContext(nextVideo);
      if (!nextRestoreContext) {
        return false;
      }

      prepareVideoForDocumentPiP(nextVideo);
      discardRestoreContext(session.currentRestoreContext);
      session.currentVideoCleanup?.();
      session.currentVideo = nextVideo;
      session.currentRestoreContext = nextRestoreContext;
      session.currentVideoCleanup = watchCurrentVideo(nextVideo);
      session.mountedUi?.updateVideo?.(nextVideo);

      if (nextVideo.paused) {
        nextVideo.play().catch(() => {});
      }

      return true;
    }

    function findActivePageVideo() {
      const nextVideo = shared.selectBestVideo();
      if (!nextVideo || nextVideo === session?.currentVideo) {
        return findFallbackPageVideo();
      }

      return nextVideo;
    }

    function findFallbackPageVideo() {
      const haveNothing = globalObject.HTMLMediaElement?.HAVE_NOTHING ?? 0;
      const videos = Array.from(globalObject.document.querySelectorAll("video"));
      return videos.find((candidate) => (
        candidate &&
        candidate !== session?.currentVideo &&
        candidate.isConnected &&
        !candidate.ended &&
        !candidate.disablePictureInPicture &&
        (candidate.currentSrc || candidate.src || candidate.readyState > haveNothing)
      )) || null;
    }

    function scheduleRebindActiveVideo(delayMs = 120) {
      if (!session || session.isClosing) {
        return;
      }

      if (session.rebindTimer) {
        globalObject.clearTimeout(session.rebindTimer);
      }

      session.rebindTimer = globalObject.setTimeout(() => {
        session.rebindTimer = 0;
        const nextVideo = findActivePageVideo();
        if (nextVideo && replaceSessionVideo(nextVideo)) {
          session.navigationInProgress = false;
          session.rebindAttempts = 0;
          return;
        }

        session.rebindAttempts += 1;
        if (session.rebindAttempts < 60) {
          scheduleRebindActiveVideo(250);
        } else {
          session.navigationInProgress = false;
          session.rebindAttempts = 0;
          shared.showToast("Floating player is waiting for the next video.");
        }
      }, delayMs);
    }

    function markNavigationAndRebind(delayMs = 120) {
      if (!session || session.isClosing) {
        return;
      }

      session.navigationInProgress = true;
      session.rebindAttempts = 0;
      scheduleRebindActiveVideo(delayMs);
    }

    function watchCurrentVideo(targetVideo) {
      const handleCurrentVideoTransition = () => markNavigationAndRebind(0);
      const events = ["ended", "emptied", "loadstart", "stalled", "suspend"];
      for (const event of events) {
        targetVideo.addEventListener(event, handleCurrentVideoTransition);
      }

      return () => {
        for (const event of events) {
          targetVideo.removeEventListener(event, handleCurrentVideoTransition);
        }
      };
    }

    function startPageVideoObserver() {
      if (!globalObject.MutationObserver || session.mutationObserver) {
        return;
      }

      session.mutationObserver = new globalObject.MutationObserver((mutations) => {
        const hasVideoChange = mutations.some((mutation) => (
          Array.from(mutation.addedNodes).some((node) => node?.nodeName === "VIDEO" || node?.querySelector?.("video")) ||
          Array.from(mutation.removedNodes).some((node) => node === session.currentVideo || node?.nodeName === "VIDEO" || node?.querySelector?.("video"))
        ));

        if (hasVideoChange) {
          markNavigationAndRebind(80);
        }
      });

      session.mutationObserver.observe(globalObject.document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    function startLocationWatcher() {
      if (session.locationPollTimer) {
        return;
      }

      session.locationPollTimer = globalObject.setInterval(() => {
        const href = globalObject.location?.href || "";
        if (href && href !== session.lastUrl) {
          session.lastUrl = href;
          markNavigationAndRebind(120);
        }
      }, 500);
    }

    function handleYouTubeNavigateStart() {
      if (!session || session.isClosing) {
        return;
      }

      markNavigationAndRebind(0);
    }

    function handleYouTubeNavigateFinish() {
      if (!session || session.isClosing) {
        return;
      }

      markNavigationAndRebind();
    }

    function handlePossibleYouTubeNavigation() {
      markNavigationAndRebind();
    }

    function handleOpenerPageHide() {
      if (session?.navigationInProgress) {
        scheduleRebindActiveVideo(0);
        return;
      }

      restoreAndClose();
    }

    try {
      const windowSize = await computeRequestWindowOptions(video);
      pipWindow = await globalObject.documentPictureInPicture.requestWindow(windowSize.requestOptions);

      if (getDebugEnabled()) {
        console.debug("Document Picture-in-Picture window sizing", {
          actualHeight: pipWindow.innerHeight,
          actualWidth: pipWindow.innerWidth,
          requestedHeight: windowSize.height,
          requestedWidth: windowSize.width,
          source: windowSize.source,
          videoHeight: video.videoHeight,
          videoWidth: video.videoWidth,
          videoAspectRatio: windowSize.aspectRatio
        });
      }

      prepareVideoForDocumentPiP(video);

      try {
        mountedUi = floatingPlayerUI.mount({
          pipWindow,
          video,
          title: globalObject.document.title || "Floating video",
          onRestore: restoreAndClose
        });
      } catch (error) {
        console.error(`Floating player UI mount failed: ${formatRuntimeError(error)}`, error);
        shared.showToast("Floating player UI failed to load. Check the page console for details.");
        throw error;
      }

      session = createDocumentSession({
        initialRestoreContext: restoreContext,
        initialVideo: video,
        mountedUi,
        pipWindow
      });
      session.restoreAndClose = restoreAndClose;
      session.rebindActiveVideo = () => scheduleRebindActiveVideo(0);
      session.handleYouTubeNavigateStart = handleYouTubeNavigateStart;
      session.handleYouTubeNavigateFinish = handleYouTubeNavigateFinish;
      session.currentVideoCleanup = watchCurrentVideo(video);
      globalObject.__NativePiPDocumentSession = session;

      pipWindow.addEventListener("pagehide", restoreAndClose, { once: true });
      globalObject.addEventListener("pagehide", handleOpenerPageHide);
      globalObject.addEventListener("popstate", handlePossibleYouTubeNavigation);
      globalObject.addEventListener("hashchange", handlePossibleYouTubeNavigation);
      globalObject.addEventListener("yt-navigate-start", handleYouTubeNavigateStart);
      globalObject.addEventListener("yt-navigate-finish", handleYouTubeNavigateFinish);
      globalObject.addEventListener("yt-page-data-updated", handleYouTubeNavigateFinish);
      globalObject.addEventListener("yt-player-updated", handleYouTubeNavigateFinish);
      globalObject.document.addEventListener("yt-navigate-start", handleYouTubeNavigateStart);
      globalObject.document.addEventListener("yt-navigate-finish", handleYouTubeNavigateFinish);
      globalObject.document.addEventListener("yt-page-data-updated", handleYouTubeNavigateFinish);
      globalObject.document.addEventListener("yt-player-updated", handleYouTubeNavigateFinish);
      startPageVideoObserver();
      startLocationWatcher();

      if (video.paused) {
        await video.play().catch(() => {});
      }

      return { ok: true, action: "enter-document" };
    } catch (error) {
      console.warn(`Document Picture-in-Picture failed: ${formatRuntimeError(error)}`, error);
      if (session) {
        restoreAndClose();
      } else {
        restoreVideo(video, restoreContext);
      }
      return globalObject.NativePiPNativeRuntime.toggleNativePictureInPicture();
    }
  }

  const api = {
    computeRequestWindowOptions,
    createRestoreContext,
    createDocumentSession,
    discardRestoreContext,
    formatRuntimeError,
    getDebugEnabled,
    getWindowSizingRuntime,
    getFloatingPlayerUI,
    isSupported,
    openPremiumPlayer,
    prepareVideoForDocumentPiP,
    restoreVideo
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPDocumentRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
