(function attachVideoSelector(globalObject) {
  const DEFAULT_MIN_USABLE_AREA = 3600;
  const DEFAULT_HAVE_NOTHING = 0;
  const DEFAULT_HAVE_CURRENT_DATA = 2;

  function toFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getViewport(options = {}) {
    if (options.viewport) {
      return {
        width: toFiniteNumber(options.viewport.width),
        height: toFiniteNumber(options.viewport.height)
      };
    }

    const documentElement = globalObject.document?.documentElement;

    return {
      width: toFiniteNumber(globalObject.innerWidth || documentElement?.clientWidth),
      height: toFiniteNumber(globalObject.innerHeight || documentElement?.clientHeight)
    };
  }

  function getVideoStyle(video, options = {}) {
    const getComputedStyle = options.getComputedStyle || globalObject.getComputedStyle;
    if (typeof getComputedStyle === "function") {
      return getComputedStyle(video);
    }

    return video.style || {};
  }

  function getVideoRect(video) {
    if (typeof video.getBoundingClientRect === "function") {
      return video.getBoundingClientRect();
    }

    return video.rect || {};
  }

  function getVisibleArea(rect, viewport) {
    const left = toFiniteNumber(rect.left);
    const top = toFiniteNumber(rect.top);
    const width = toFiniteNumber(rect.width);
    const height = toFiniteNumber(rect.height);
    const right = toFiniteNumber(rect.right, left + width);
    const bottom = toFiniteNumber(rect.bottom, top + height);
    const visibleWidth = Math.max(0, Math.min(right, viewport.width) - Math.max(left, 0));
    const visibleHeight = Math.max(0, Math.min(bottom, viewport.height) - Math.max(top, 0));

    return visibleWidth * visibleHeight;
  }

  function isHiddenByStyle(style) {
    const opacity = style.opacity === "" || style.opacity == null ? 1 : Number(style.opacity);

    return (
      style.display === "none" ||
      style.visibility === "hidden" ||
      opacity === 0
    );
  }

  function scoreVideo(video, options = {}) {
    if (!video || !video.isConnected || video.ended || video.disablePictureInPicture) {
      return null;
    }

    const style = getVideoStyle(video, options);
    if (isHiddenByStyle(style)) {
      return null;
    }

    const viewport = getViewport(options);
    const rect = getVideoRect(video);
    const renderedArea = Math.max(0, toFiniteNumber(rect.width) * toFiniteNumber(rect.height));
    const visibleArea = getVisibleArea(rect, viewport);
    const usableArea = visibleArea || renderedArea;
    const haveNothing = options.readyStateHaveNothing ?? DEFAULT_HAVE_NOTHING;
    const haveCurrentData = options.readyStateHaveCurrentData ?? DEFAULT_HAVE_CURRENT_DATA;
    const minUsableArea = options.minUsableArea ?? DEFAULT_MIN_USABLE_AREA;

    if (video.readyState === haveNothing || usableArea < minUsableArea) {
      return null;
    }

    let score = usableArea;

    if (!video.paused) {
      score += 10000000;
    }

    if (toFiniteNumber(video.currentTime) > 0) {
      score += 100000;
    }

    if (toFiniteNumber(video.readyState) >= haveCurrentData) {
      score += 50000;
    }

    if (!video.muted && toFiniteNumber(video.volume, 1) > 0) {
      score += 10000;
    }

    return { video, score };
  }

  function selectBestVideo(videos, options = {}) {
    return Array.from(videos || [])
      .map((video) => scoreVideo(video, options))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0]?.video || null;
  }

  const api = {
    DEFAULT_MIN_USABLE_AREA,
    getVisibleArea,
    scoreVideo,
    selectBestVideo
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPVideoSelector = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
