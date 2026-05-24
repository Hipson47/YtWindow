(function attachFloatingPlayerUI(globalObject) {
  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const STYLES = `
    :root {
      color-scheme: dark;
      --ytwindow-bg: #050505;
      --ytwindow-text: #fff;
      --ytwindow-muted: rgba(255, 255, 255, 0.72);
      --ytwindow-surface: rgba(18, 18, 18, 0.62);
      --ytwindow-surface-strong: rgba(0, 0, 0, 0.78);
      --ytwindow-accent: #ff0033;
      --ytwindow-control-size: clamp(52px, 15vmin, 94px);
      --ytwindow-small-control-size: clamp(32px, 8vmin, 46px);
      --ytwindow-bar-height: clamp(58px, 15vmin, 86px);
      background: var(--ytwindow-bg);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      overflow: hidden;
      background: var(--ytwindow-bg);
      color: var(--ytwindow-text);
    }

    .ytwindow-player {
      position: fixed;
      inset: 0;
      display: grid;
      grid-template-rows: 1fr auto;
      background: #000;
    }

    .ytwindow-video-stage {
      position: relative;
      min-height: 0;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: #000;
    }

    .ytwindow-video-stage video {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      background: #000;
    }

    .ytwindow-center-controls {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(12px, 4vmin, 28px);
      padding: clamp(12px, 4vmin, 28px);
      pointer-events: none;
      opacity: 0;
      transition: opacity 140ms ease;
    }

    .ytwindow-player:hover .ytwindow-center-controls,
    .ytwindow-player:focus-within .ytwindow-center-controls,
    .ytwindow-player.is-paused .ytwindow-center-controls {
      opacity: 1;
    }

    .ytwindow-button {
      display: inline-grid;
      place-items: center;
      width: var(--ytwindow-small-control-size);
      height: var(--ytwindow-small-control-size);
      border: 0;
      border-radius: 999px;
      color: #fff;
      background: rgba(24, 24, 24, 0.68);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32);
      cursor: pointer;
      pointer-events: auto;
      transition: transform 120ms ease, background 120ms ease, opacity 120ms ease;
    }

    .ytwindow-button:hover,
    .ytwindow-button:focus-visible {
      background: rgba(44, 44, 44, 0.88);
      outline: 2px solid rgba(255, 255, 255, 0.86);
      outline-offset: 2px;
      transform: scale(1.04);
    }

    .ytwindow-button svg {
      width: 58%;
      height: 58%;
      fill: currentColor;
      pointer-events: none;
    }

    .ytwindow-button.is-primary {
      width: var(--ytwindow-control-size);
      height: var(--ytwindow-control-size);
      background: rgba(255, 255, 255, 0.92);
      color: #050505;
    }

    .ytwindow-bottom-bar {
      display: grid;
      grid-template-columns: auto auto auto minmax(80px, 1fr) auto auto minmax(60px, 108px) auto auto;
      align-items: center;
      gap: clamp(6px, 2vmin, 12px);
      min-height: var(--ytwindow-bar-height);
      padding: clamp(8px, 2.4vmin, 14px);
      background: linear-gradient(to top, var(--ytwindow-surface-strong), var(--ytwindow-surface));
      backdrop-filter: blur(16px);
    }

    .ytwindow-time {
      min-width: 44px;
      color: var(--ytwindow-muted);
      font-size: clamp(11px, 3vmin, 13px);
      font-variant-numeric: tabular-nums;
      text-align: center;
      white-space: nowrap;
    }

    .ytwindow-range {
      width: 100%;
      accent-color: var(--ytwindow-accent);
      cursor: pointer;
    }

    .ytwindow-volume {
      min-width: 56px;
    }

    .ytwindow-speed {
      min-width: 68px;
      height: 32px;
      border: 0;
      border-radius: 999px;
      padding: 0 8px;
      color: #fff;
      background: rgba(255, 255, 255, 0.14);
      font: 12px system-ui, sans-serif;
      cursor: pointer;
    }

    .ytwindow-restore {
      border-radius: 999px;
    }

    @media (max-width: 430px), (max-height: 250px) {
      .ytwindow-bottom-bar {
        grid-template-columns: auto auto minmax(64px, 1fr) auto auto;
      }

      .ytwindow-bottom-bar .ytwindow-secondary,
      .ytwindow-volume {
        display: none;
      }

      .ytwindow-time {
        min-width: 38px;
      }
    }
  `;

  const ICONS = {
    play: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8 5v14l11-7z\"/></svg>",
    pause: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 5h4v14H7zm6 0h4v14h-4z\"/></svg>",
    rewind: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M11 7v10l-7-5zm9 0v10l-7-5V7z\"/></svg>",
    forward: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M13 7v10l7-5zm-9 0v10l7-5V7z\"/></svg>",
    volume: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 9v6h4l5 4V5L8 9zm11.5 1.1v3.8l3-1.9z\"/></svg>",
    muted: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 9v6h4l5 4V5L8 9zm13.6 3 2.7-2.7-1.6-1.6-2.7 2.7-2.7-2.7-1.6 1.6 2.7 2.7-2.7 2.7 1.6 1.6 2.7-2.7 2.7 2.7 1.6-1.6z\"/></svg>",
    restore: "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6h12v12H6zm2 2v8h8V8zm10-4h2v14h-2zM4 4h14v2H6v12H4z\"/></svg>"
  };

  function button(documentObject, className, label, icon) {
    const element = documentObject.createElement("button");
    element.type = "button";
    element.className = `ytwindow-button ${className}`.trim();
    element.setAttribute("aria-label", label);
    element.title = label;
    element.innerHTML = icon;
    return element;
  }

  function createRange(documentObject, className, min, max, step) {
    const input = documentObject.createElement("input");
    input.type = "range";
    input.className = `ytwindow-range ${className}`.trim();
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    return input;
  }

  function mount({ pipWindow, video, title = "Floating video", onRestore }) {
    const documentObject = pipWindow.document;
    documentObject.open();
    documentObject.write("<!doctype html><html><head><title></title></head><body></body></html>");
    documentObject.close();
    documentObject.title = title;

    const style = documentObject.createElement("style");
    style.textContent = STYLES;
    documentObject.head.appendChild(style);

    const player = documentObject.createElement("main");
    player.className = "ytwindow-player";
    const stage = documentObject.createElement("section");
    stage.className = "ytwindow-video-stage";
    const centerControls = documentObject.createElement("div");
    centerControls.className = "ytwindow-center-controls";
    const bottomBar = documentObject.createElement("div");
    bottomBar.className = "ytwindow-bottom-bar";

    const centerRewind = button(documentObject, "", "Seek back 10 seconds", ICONS.rewind);
    const centerPlay = button(documentObject, "is-primary", "Play", ICONS.play);
    const centerForward = button(documentObject, "", "Seek forward 10 seconds", ICONS.forward);
    centerControls.append(centerRewind, centerPlay, centerForward);

    const barPlay = button(documentObject, "", "Play", ICONS.play);
    const barRewind = button(documentObject, "ytwindow-secondary", "Seek back 10 seconds", ICONS.rewind);
    const currentTime = documentObject.createElement("span");
    currentTime.className = "ytwindow-time";
    currentTime.textContent = "0:00";
    const progress = createRange(documentObject, "ytwindow-progress", 0, 1000, 1);
    const duration = documentObject.createElement("span");
    duration.className = "ytwindow-time";
    duration.textContent = "0:00";
    const barForward = button(documentObject, "ytwindow-secondary", "Seek forward 10 seconds", ICONS.forward);
    const mute = button(documentObject, "", "Mute", ICONS.volume);
    const volume = createRange(documentObject, "ytwindow-volume", 0, 1, 0.01);
    const speed = documentObject.createElement("select");
    speed.className = "ytwindow-speed";
    speed.setAttribute("aria-label", "Playback speed");
    for (const speedValue of SPEED_OPTIONS) {
      const option = documentObject.createElement("option");
      option.value = String(speedValue);
      option.textContent = `${speedValue}x`;
      speed.appendChild(option);
    }
    const restore = button(documentObject, "ytwindow-restore", "Close floating player", ICONS.restore);

    bottomBar.append(
      barPlay,
      barRewind,
      currentTime,
      progress,
      duration,
      barForward,
      mute,
      volume,
      speed,
      restore
    );

    stage.append(video, centerControls);
    player.append(stage, bottomBar);
    documentObject.body.appendChild(player);

    function seekBy(seconds) {
      if (Number.isFinite(video.duration)) {
        video.currentTime = globalObject.NativePiPSharedRuntime.clamp(video.currentTime + seconds, 0, video.duration);
      } else {
        video.currentTime = Math.max(0, video.currentTime + seconds);
      }
    }

    function sync() {
      const isPaused = video.paused;
      const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
      const formattedCurrentTime = globalObject.NativePiPSharedRuntime.formatTime(video.currentTime);
      const formattedDuration = globalObject.NativePiPSharedRuntime.formatTime(video.duration);
      const playIcon = isPaused ? ICONS.play : ICONS.pause;
      const playLabel = isPaused ? "Play" : "Pause";

      player.classList.toggle("is-paused", isPaused);
      centerPlay.innerHTML = playIcon;
      centerPlay.title = playLabel;
      centerPlay.setAttribute("aria-label", playLabel);
      barPlay.innerHTML = playIcon;
      barPlay.title = playLabel;
      barPlay.setAttribute("aria-label", playLabel);
      currentTime.textContent = formattedCurrentTime;
      duration.textContent = formattedDuration;
      progress.disabled = !hasDuration;
      progress.value = hasDuration ? String(Math.round((video.currentTime / video.duration) * 1000)) : "0";
      mute.innerHTML = video.muted || video.volume === 0 ? ICONS.muted : ICONS.volume;
      mute.title = video.muted ? "Unmute" : "Mute";
      mute.setAttribute("aria-label", mute.title);
      volume.value = String(video.muted ? 0 : video.volume);
      speed.value = String(video.playbackRate);
    }

    async function togglePlay() {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
      sync();
    }

    function handleProgressInput() {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = (Number(progress.value) / 1000) * video.duration;
      }
    }

    function handleVolumeInput() {
      video.volume = Number(volume.value);
      video.muted = video.volume === 0;
    }

    function handleKeydown(event) {
      if (event.target?.tagName === "SELECT" || event.target?.tagName === "INPUT") {
        return;
      }

      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        video.muted = !video.muted;
      }
    }

    const listeners = [
      [centerPlay, "click", togglePlay],
      [barPlay, "click", togglePlay],
      [centerRewind, "click", () => seekBy(-10)],
      [barRewind, "click", () => seekBy(-10)],
      [centerForward, "click", () => seekBy(10)],
      [barForward, "click", () => seekBy(10)],
      [progress, "input", handleProgressInput],
      [mute, "click", () => {
        video.muted = !video.muted;
      }],
      [volume, "input", handleVolumeInput],
      [speed, "change", () => {
        video.playbackRate = Number(speed.value);
      }],
      [restore, "click", onRestore],
      [documentObject, "keydown", handleKeydown]
    ];

    const mediaEvents = [
      "durationchange",
      "ended",
      "loadedmetadata",
      "pause",
      "play",
      "ratechange",
      "seeked",
      "seeking",
      "timeupdate",
      "volumechange"
    ];

    for (const [target, eventName, listener] of listeners) {
      target.addEventListener(eventName, listener);
    }

    for (const eventName of mediaEvents) {
      video.addEventListener(eventName, sync);
    }

    let frame = 0;
    function syncLoop() {
      sync();
      frame = pipWindow.requestAnimationFrame(syncLoop);
    }

    sync();
    frame = pipWindow.requestAnimationFrame(syncLoop);

    return {
      destroy() {
        pipWindow.cancelAnimationFrame(frame);
        for (const [target, eventName, listener] of listeners) {
          target.removeEventListener(eventName, listener);
        }
        for (const eventName of mediaEvents) {
          video.removeEventListener(eventName, sync);
        }
      }
    };
  }

  const api = {
    SPEED_OPTIONS,
    STYLES,
    mount
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPFloatingPlayerUI = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
