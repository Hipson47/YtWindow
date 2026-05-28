(function attachPiPWindowSizing(globalObject) {
  const DEFAULT_PIP_WINDOW_SIZE = {
    fallbackAspectRatio: 16 / 9,
    maxHeightRatio: 0.65,
    maxWidthRatio: 0.65,
    minHeight: 236,
    minWidth: 420,
    preferredLandscapeWidth: 760
  };

  function isPositiveFiniteNumber(value) {
    return Number.isFinite(value) && value > 0;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getAspectRatio(videoWidth, videoHeight, fallbackAspectRatio = DEFAULT_PIP_WINDOW_SIZE.fallbackAspectRatio) {
    if (isPositiveFiniteNumber(videoWidth) && isPositiveFiniteNumber(videoHeight)) {
      return {
        aspectRatio: videoWidth / videoHeight,
        source: "video-metadata"
      };
    }

    return {
      aspectRatio: fallbackAspectRatio,
      source: "fallback"
    };
  }

  function computePipWindowSize({
    availableHeight,
    availableWidth,
    fallbackAspectRatio = DEFAULT_PIP_WINDOW_SIZE.fallbackAspectRatio,
    maxHeightRatio = DEFAULT_PIP_WINDOW_SIZE.maxHeightRatio,
    maxWidthRatio = DEFAULT_PIP_WINDOW_SIZE.maxWidthRatio,
    minHeight = DEFAULT_PIP_WINDOW_SIZE.minHeight,
    minWidth = DEFAULT_PIP_WINDOW_SIZE.minWidth,
    preferredLandscapeWidth = DEFAULT_PIP_WINDOW_SIZE.preferredLandscapeWidth,
    videoHeight,
    videoWidth
  } = {}) {
    const { aspectRatio, source } = getAspectRatio(videoWidth, videoHeight, fallbackAspectRatio);
    const safeAvailableWidth = isPositiveFiniteNumber(availableWidth) ? availableWidth : 1280;
    const safeAvailableHeight = isPositiveFiniteNumber(availableHeight) ? availableHeight : 720;
    const maxWidth = Math.max(minWidth, Math.round(safeAvailableWidth * maxWidthRatio));
    const maxHeight = Math.max(minHeight, Math.round(safeAvailableHeight * maxHeightRatio));

    let width = clamp(preferredLandscapeWidth, Math.min(minWidth, maxWidth), maxWidth);
    let height = Math.round(width / aspectRatio);

    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }

    const minimumWidthForRatio = aspectRatio >= 1 ? minWidth : Math.min(minWidth, Math.round(maxHeight * aspectRatio));
    if (width < minimumWidthForRatio) {
      width = minimumWidthForRatio;
      height = Math.round(width / aspectRatio);
    }

    if (height < minHeight) {
      height = minHeight;
      width = Math.round(height * aspectRatio);
    }

    if (width > maxWidth) {
      width = maxWidth;
      height = Math.round(width / aspectRatio);
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * aspectRatio);
    }

    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));

    return {
      aspectRatio,
      height,
      source,
      width
    };
  }

  function waitForVideoMetadata(video, timeoutMs = 450) {
    if (isPositiveFiniteNumber(video?.videoWidth) && isPositiveFiniteNumber(video?.videoHeight)) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (loaded) => {
        if (settled) {
          return;
        }

        settled = true;
        video?.removeEventListener?.("loadedmetadata", handleLoadedMetadata);
        clearTimeout(timeoutId);
        resolve(loaded);
      };
      const handleLoadedMetadata = () => finish(true);
      const timeoutId = setTimeout(() => finish(false), timeoutMs);

      video?.addEventListener?.("loadedmetadata", handleLoadedMetadata, { once: true });
    });
  }

  function getAvailableScreenSize(targetGlobal = globalObject) {
    return {
      availableHeight: targetGlobal.screen?.availHeight || targetGlobal.innerHeight,
      availableWidth: targetGlobal.screen?.availWidth || targetGlobal.innerWidth
    };
  }

  const api = {
    DEFAULT_PIP_WINDOW_SIZE,
    computePipWindowSize,
    getAvailableScreenSize,
    waitForVideoMetadata
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPWindowSizing = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
