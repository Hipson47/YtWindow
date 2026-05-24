(function attachFloatingPlayerUI(globalObject) {
  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const AUTO_HIDE_DELAY_MS = 1800;

  const STYLES = `
    :root {
      color-scheme: dark;
      --ytwindow-bg: #000;
      --ytwindow-text: #fff;
      --ytwindow-muted: rgba(255, 255, 255, 0.74);
      --ytwindow-soft: rgba(255, 255, 255, 0.14);
      --ytwindow-strong: rgba(0, 0, 0, 0.72);
      --ytwindow-accent: #ff0033;
      --ytwindow-control-size: clamp(56px, 16vmin, 104px);
      --ytwindow-side-control-size: clamp(42px, 11vmin, 68px);
      --ytwindow-toolbar-icon: clamp(32px, 8vmin, 42px);
      --ytwindow-toolbar-height: clamp(78px, 20vmin, 118px);
      --ytwindow-player-padding: clamp(10px, 2.8vmin, 20px);
      background: #000;
      font-family: Roboto, Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      overflow: hidden;
      background: #000;
      color: var(--ytwindow-text);
      user-select: none;
    }

    .ytwindow-player {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: #000;
      cursor: none;
    }

    .ytwindow-player.is-controls-visible,
    .ytwindow-player.is-paused,
    .ytwindow-player.is-menu-open,
    .ytwindow-player:focus-within {
      cursor: default;
    }

    .ytwindow-video-stage {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
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

    .ytwindow-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 160ms ease;
    }

    .ytwindow-player.is-controls-visible .ytwindow-layer,
    .ytwindow-player.is-paused .ytwindow-layer,
    .ytwindow-player.is-menu-open .ytwindow-layer,
    .ytwindow-player:focus-within .ytwindow-layer {
      opacity: 1;
    }

    .ytwindow-layer::before,
    .ytwindow-layer::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      pointer-events: none;
    }

    .ytwindow-layer::before {
      top: 0;
      height: 26%;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), transparent);
    }

    .ytwindow-layer::after {
      bottom: 0;
      height: 44%;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.92), rgba(0, 0, 0, 0.58) 42%, transparent);
    }

    .ytwindow-center-controls {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(16px, 4.8vmin, 36px);
      padding: var(--ytwindow-player-padding);
      transform: translateY(clamp(-8px, -2vmin, -2px));
      pointer-events: none;
      z-index: 2;
    }

    .ytwindow-bottom-overlay {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      gap: clamp(5px, 1.6vmin, 9px);
      padding: 0 var(--ytwindow-player-padding) var(--ytwindow-player-padding);
      min-height: var(--ytwindow-toolbar-height);
      align-content: end;
      pointer-events: auto;
      z-index: 3;
      transform: translateY(12px);
      transition: transform 160ms ease;
    }

    .ytwindow-player.is-controls-visible .ytwindow-bottom-overlay,
    .ytwindow-player.is-paused .ytwindow-bottom-overlay,
    .ytwindow-player.is-menu-open .ytwindow-bottom-overlay,
    .ytwindow-player:focus-within .ytwindow-bottom-overlay {
      transform: translateY(0);
    }

    .ytwindow-progress {
      position: relative;
      height: clamp(10px, 2.6vmin, 16px);
      display: flex;
      align-items: center;
      cursor: pointer;
      touch-action: none;
    }

    .ytwindow-progress-track {
      position: relative;
      width: 100%;
      height: 3px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.28);
      overflow: visible;
      transition: height 120ms ease;
    }

    .ytwindow-progress:hover .ytwindow-progress-track,
    .ytwindow-progress.is-scrubbing .ytwindow-progress-track {
      height: 5px;
    }

    .ytwindow-progress-played {
      position: absolute;
      inset: 0 auto 0 0;
      width: 0%;
      border-radius: inherit;
      background: var(--ytwindow-accent);
    }

    .ytwindow-progress-thumb {
      position: absolute;
      top: 50%;
      left: 0%;
      width: clamp(10px, 2.8vmin, 14px);
      height: clamp(10px, 2.8vmin, 14px);
      border-radius: 999px;
      background: var(--ytwindow-accent);
      box-shadow: 0 0 0 4px rgba(255, 0, 51, 0.18);
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.72);
      transition: opacity 120ms ease, transform 120ms ease;
    }

    .ytwindow-progress:hover .ytwindow-progress-thumb,
    .ytwindow-progress.is-scrubbing .ytwindow-progress-thumb {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    .ytwindow-toolbar {
      display: grid;
      grid-template-columns: auto auto auto auto minmax(96px, 1fr) auto auto auto;
      align-items: center;
      gap: clamp(4px, 1.2vmin, 9px);
      min-width: 0;
    }

    .ytwindow-left-controls,
    .ytwindow-right-controls,
    .ytwindow-time-cluster {
      display: inline-flex;
      align-items: center;
      min-width: 0;
    }

    .ytwindow-left-controls {
      gap: clamp(2px, 0.8vmin, 6px);
    }

    .ytwindow-right-controls {
      justify-content: flex-end;
      gap: clamp(3px, 1vmin, 7px);
    }

    .ytwindow-time-cluster {
      gap: 4px;
      color: rgba(255, 255, 255, 0.88);
      font-size: clamp(11px, 3vmin, 13px);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .ytwindow-time-divider,
    .ytwindow-duration {
      color: var(--ytwindow-muted);
    }

    .ytwindow-button {
      appearance: none;
      display: inline-grid;
      place-items: center;
      width: var(--ytwindow-toolbar-icon);
      height: var(--ytwindow-toolbar-icon);
      border: 0;
      border-radius: 999px;
      padding: 0;
      color: #fff;
      background: transparent;
      cursor: pointer;
      pointer-events: auto;
      transform: translateZ(0);
      transition: transform 100ms ease, background 120ms ease, opacity 120ms ease;
    }

    .ytwindow-button:hover,
    .ytwindow-button:focus-visible {
      background: rgba(255, 255, 255, 0.14);
      outline: 0;
    }

    .ytwindow-button:focus-visible {
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.82);
    }

    .ytwindow-button:active {
      transform: scale(0.92);
    }

    .ytwindow-button svg {
      width: 64%;
      height: 64%;
      fill: currentColor;
      pointer-events: none;
    }

    .ytwindow-center-button {
      width: var(--ytwindow-side-control-size);
      height: var(--ytwindow-side-control-size);
      background: rgba(0, 0, 0, 0.48);
      box-shadow: 0 12px 34px rgba(0, 0, 0, 0.44);
      pointer-events: auto;
    }

    .ytwindow-center-button:hover,
    .ytwindow-center-button:focus-visible {
      background: rgba(0, 0, 0, 0.72);
      transform: scale(1.04);
    }

    .ytwindow-center-button.is-primary {
      width: var(--ytwindow-control-size);
      height: var(--ytwindow-control-size);
      background: rgba(0, 0, 0, 0.6);
    }

    .ytwindow-center-button.is-primary svg {
      width: 58%;
      height: 58%;
    }

    .ytwindow-volume-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      min-width: 0;
    }

    .ytwindow-volume {
      appearance: none;
      width: clamp(54px, 16vmin, 96px);
      height: 18px;
      margin: 0;
      background: transparent;
      cursor: pointer;
      opacity: 0.86;
      transition: width 140ms ease, opacity 120ms ease;
    }

    .ytwindow-volume:focus-visible {
      outline: 0;
      opacity: 1;
    }

    .ytwindow-volume::-webkit-slider-runnable-track {
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(to right, #fff var(--ytwindow-volume-percent, 100%), rgba(255, 255, 255, 0.28) var(--ytwindow-volume-percent, 100%));
    }

    .ytwindow-volume::-webkit-slider-thumb {
      appearance: none;
      width: 11px;
      height: 11px;
      margin-top: -4px;
      border-radius: 50%;
      background: #fff;
      opacity: 0;
      transition: opacity 120ms ease, transform 120ms ease;
    }

    .ytwindow-volume-group:hover .ytwindow-volume::-webkit-slider-thumb,
    .ytwindow-volume:focus-visible::-webkit-slider-thumb {
      opacity: 1;
      transform: scale(1.04);
    }

    .ytwindow-volume::-moz-range-track {
      height: 3px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.28);
    }

    .ytwindow-volume::-moz-range-progress {
      height: 3px;
      border-radius: 999px;
      background: #fff;
    }

    .ytwindow-volume::-moz-range-thumb {
      width: 11px;
      height: 11px;
      border: 0;
      border-radius: 50%;
      background: #fff;
    }

    .ytwindow-speed-control {
      position: relative;
      pointer-events: auto;
    }

    .ytwindow-speed-button {
      min-width: clamp(44px, 11vmin, 62px);
      padding: 0 10px;
      border-radius: 4px;
      font-size: clamp(11px, 3vmin, 13px);
      font-weight: 500;
      letter-spacing: 0;
    }

    .ytwindow-speed-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 10px);
      display: grid;
      min-width: 118px;
      padding: 6px;
      border-radius: 10px;
      background: rgba(28, 28, 28, 0.96);
      box-shadow: 0 14px 44px rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transform: translateY(8px) scale(0.98);
      transition: opacity 120ms ease, transform 120ms ease;
    }

    .ytwindow-speed-menu.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .ytwindow-speed-option {
      appearance: none;
      border: 0;
      border-radius: 7px;
      padding: 8px 10px;
      color: #fff;
      background: transparent;
      font: 13px system-ui, sans-serif;
      text-align: left;
      cursor: pointer;
    }

    .ytwindow-speed-option:hover,
    .ytwindow-speed-option:focus-visible,
    .ytwindow-speed-option.is-selected {
      background: rgba(255, 255, 255, 0.14);
      outline: 0;
    }

    .ytwindow-speed-option.is-selected::before {
      content: "";
      display: inline-block;
      width: 7px;
      height: 7px;
      margin-right: 11px;
      border-radius: 999px;
      background: var(--ytwindow-accent);
    }

    .ytwindow-speed-option:not(.is-selected)::before {
      content: "";
      display: inline-block;
      width: 18px;
    }

    @media (max-width: 480px), (max-height: 270px) {
      :root {
        --ytwindow-toolbar-icon: clamp(30px, 9vmin, 38px);
        --ytwindow-toolbar-height: clamp(64px, 20vmin, 92px);
      }

      .ytwindow-toolbar {
        grid-template-columns: auto auto minmax(74px, 1fr) auto auto;
      }

      .ytwindow-toolbar .ytwindow-secondary,
      .ytwindow-volume {
        display: none;
      }

      .ytwindow-time-cluster {
        font-size: 11px;
      }
    }
  `;

  const ICONS = {
    play: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M13 9v18l15-9z\"/></svg>",
    pause: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M12 9h5v18h-5zm7 0h5v18h-5z\"/></svg>",
    rewind: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M17 11v14l-10-7zm12 0v14l-10-7V11z\"/><text x=\"18\" y=\"31\" text-anchor=\"middle\" font-size=\"7\" fill=\"currentColor\" font-family=\"Arial\">10</text></svg>",
    forward: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M19 11v14l10-7zm-12 0v14l10-7V11z\"/><text x=\"18\" y=\"31\" text-anchor=\"middle\" font-size=\"7\" fill=\"currentColor\" font-family=\"Arial\">10</text></svg>",
    volume: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M7 14v8h6l8 6V8l-8 6zm17.5-1.5a8 8 0 0 1 0 11l2.1 2.1a11 11 0 0 0 0-15.2z\"/></svg>",
    muted: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M7 14v8h6l8 6V8l-8 6zm20.7 4 4-4-2.2-2.2-4 4-4-4-2.2 2.2 4 4-4 4 2.2 2.2 4-4 4 4 2.2-2.2z\"/></svg>",
    restore: "<svg viewBox=\"0 0 36 36\" aria-hidden=\"true\"><path d=\"M10 10h16v16H10zm3 3v10h10V13zm14-7h3v21h-3zM6 6h21v3H9v18H6z\"/></svg>"
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function progressRatio(currentTime, duration) {
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
      return 0;
    }

    return clamp(currentTime / duration, 0, 1);
  }

  function speedLabel(speed) {
    return `${Number(speed).toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;
  }

  function button(documentObject, className, label, icon) {
    const element = documentObject.createElement("button");
    element.type = "button";
    element.className = `ytwindow-button ${className}`.trim();
    element.setAttribute("aria-label", label);
    element.title = label;
    element.innerHTML = icon;
    return element;
  }

  function createVolumeRange(documentObject) {
    const input = documentObject.createElement("input");
    input.type = "range";
    input.className = "ytwindow-volume";
    input.min = "0";
    input.max = "1";
    input.step = "0.01";
    input.setAttribute("aria-label", "Volume");
    return input;
  }

  function createProgress(documentObject) {
    const progress = documentObject.createElement("div");
    progress.className = "ytwindow-progress";
    progress.setAttribute("role", "slider");
    progress.setAttribute("aria-label", "Seek");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.tabIndex = 0;

    const track = documentObject.createElement("div");
    track.className = "ytwindow-progress-track";
    const played = documentObject.createElement("div");
    played.className = "ytwindow-progress-played";
    const thumb = documentObject.createElement("div");
    thumb.className = "ytwindow-progress-thumb";

    track.append(played, thumb);
    progress.appendChild(track);

    return { progress, played, thumb };
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
    player.className = "ytwindow-player is-controls-visible";
    const stage = documentObject.createElement("section");
    stage.className = "ytwindow-video-stage";
    const layer = documentObject.createElement("div");
    layer.className = "ytwindow-layer";
    const centerControls = documentObject.createElement("div");
    centerControls.className = "ytwindow-center-controls";
    const bottomOverlay = documentObject.createElement("div");
    bottomOverlay.className = "ytwindow-bottom-overlay";
    const toolbar = documentObject.createElement("div");
    toolbar.className = "ytwindow-toolbar";

    const centerRewind = button(documentObject, "ytwindow-center-button", "Seek back 10 seconds", ICONS.rewind);
    const centerPlay = button(documentObject, "ytwindow-center-button is-primary", "Play", ICONS.play);
    const centerForward = button(documentObject, "ytwindow-center-button", "Seek forward 10 seconds", ICONS.forward);
    centerControls.append(centerRewind, centerPlay, centerForward);

    const barPlay = button(documentObject, "", "Play", ICONS.play);
    const barRewind = button(documentObject, "ytwindow-secondary", "Seek back 10 seconds", ICONS.rewind);
    const barForward = button(documentObject, "ytwindow-secondary", "Seek forward 10 seconds", ICONS.forward);
    const mute = button(documentObject, "", "Mute", ICONS.volume);
    const volume = createVolumeRange(documentObject);
    const restore = button(documentObject, "ytwindow-restore", "Close floating player", ICONS.restore);

    const leftControls = documentObject.createElement("div");
    leftControls.className = "ytwindow-left-controls";
    const volumeGroup = documentObject.createElement("div");
    volumeGroup.className = "ytwindow-volume-group";
    volumeGroup.append(mute, volume);
    leftControls.append(barPlay, barRewind, barForward, volumeGroup);

    const currentTime = documentObject.createElement("span");
    currentTime.className = "ytwindow-current-time";
    currentTime.textContent = "0:00";
    const duration = documentObject.createElement("span");
    duration.className = "ytwindow-duration";
    duration.textContent = "0:00";
    const divider = documentObject.createElement("span");
    divider.className = "ytwindow-time-divider";
    divider.textContent = "/";
    const timeCluster = documentObject.createElement("div");
    timeCluster.className = "ytwindow-time-cluster";
    timeCluster.append(currentTime, divider, duration);

    const { progress, played, thumb } = createProgress(documentObject);

    const speedControl = documentObject.createElement("div");
    speedControl.className = "ytwindow-speed-control";
    const speedButton = button(documentObject, "ytwindow-speed-button", "Playback speed", "");
    const speedMenu = documentObject.createElement("div");
    speedMenu.className = "ytwindow-speed-menu";
    speedMenu.setAttribute("role", "menu");
    for (const speedValue of SPEED_OPTIONS) {
      const option = documentObject.createElement("button");
      option.type = "button";
      option.className = "ytwindow-speed-option";
      option.value = String(speedValue);
      option.textContent = speedLabel(speedValue);
      option.setAttribute("role", "menuitemradio");
      option.addEventListener("click", () => {
        video.playbackRate = speedValue;
        closeSpeedMenu();
      });
      speedMenu.appendChild(option);
    }
    speedControl.append(speedButton, speedMenu);

    const spacer = documentObject.createElement("div");
    spacer.className = "ytwindow-spacer";
    toolbar.append(leftControls, timeCluster, spacer, speedControl, restore);
    bottomOverlay.append(progress, toolbar);
    layer.append(centerControls, bottomOverlay);
    stage.append(video);
    player.append(stage, layer);
    documentObject.body.appendChild(player);

    let hideTimer = 0;
    let frame = 0;
    let isScrubbing = false;

    function shouldKeepControlsVisible() {
      return video.paused || isScrubbing || player.classList.contains("is-menu-open");
    }

    function revealControls() {
      player.classList.add("is-controls-visible");
      pipWindow.clearTimeout(hideTimer);

      if (!shouldKeepControlsVisible()) {
        hideTimer = pipWindow.setTimeout(() => {
          if (!shouldKeepControlsVisible()) {
            player.classList.remove("is-controls-visible");
          }
        }, AUTO_HIDE_DELAY_MS);
      }
    }

    function setProgressFromEvent(event) {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      const rect = progress.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      video.currentTime = ratio * video.duration;
      sync();
    }

    function seekBy(seconds) {
      if (Number.isFinite(video.duration)) {
        video.currentTime = globalObject.NativePiPSharedRuntime.clamp(video.currentTime + seconds, 0, video.duration);
      } else {
        video.currentTime = Math.max(0, video.currentTime + seconds);
      }
      revealControls();
    }

    function closeSpeedMenu() {
      player.classList.remove("is-menu-open");
      speedMenu.classList.remove("is-open");
      speedButton.setAttribute("aria-expanded", "false");
      revealControls();
    }

    function toggleSpeedMenu() {
      const isOpen = speedMenu.classList.toggle("is-open");
      player.classList.toggle("is-menu-open", isOpen);
      speedButton.setAttribute("aria-expanded", String(isOpen));
      revealControls();
    }

    function sync() {
      const isPaused = video.paused;
      const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
      const ratio = progressRatio(video.currentTime, video.duration);
      const formattedCurrentTime = globalObject.NativePiPSharedRuntime.formatTime(video.currentTime);
      const formattedDuration = globalObject.NativePiPSharedRuntime.formatTime(video.duration);
      const playIcon = isPaused ? ICONS.play : ICONS.pause;
      const playLabel = isPaused ? "Play" : "Pause";
      const percent = `${Math.round(ratio * 10000) / 100}%`;
      const volumePercent = `${Math.round((video.muted ? 0 : video.volume) * 100)}%`;

      player.classList.toggle("is-paused", isPaused);
      centerPlay.innerHTML = playIcon;
      centerPlay.title = playLabel;
      centerPlay.setAttribute("aria-label", playLabel);
      barPlay.innerHTML = playIcon;
      barPlay.title = playLabel;
      barPlay.setAttribute("aria-label", playLabel);
      currentTime.textContent = formattedCurrentTime;
      duration.textContent = formattedDuration;
      progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      progress.setAttribute("aria-valuetext", `${formattedCurrentTime} of ${formattedDuration}`);
      progress.classList.toggle("is-disabled", !hasDuration);
      played.style.width = hasDuration ? percent : "0%";
      thumb.style.left = hasDuration ? percent : "0%";
      mute.innerHTML = video.muted || video.volume === 0 ? ICONS.muted : ICONS.volume;
      mute.title = video.muted ? "Unmute" : "Mute";
      mute.setAttribute("aria-label", mute.title);
      volume.value = String(video.muted ? 0 : video.volume);
      volume.style.setProperty("--ytwindow-volume-percent", volumePercent);
      speedButton.textContent = speedLabel(video.playbackRate);

      for (const option of speedMenu.querySelectorAll(".ytwindow-speed-option")) {
        const isSelected = Number(option.value) === video.playbackRate;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-checked", String(isSelected));
      }
    }

    async function togglePlay() {
      revealControls();
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
      sync();
    }

    function handleVolumeInput() {
      video.volume = Number(volume.value);
      video.muted = video.volume === 0;
      revealControls();
    }

    function startScrubbing(event) {
      event.preventDefault();
      isScrubbing = true;
      progress.classList.add("is-scrubbing");
      revealControls();
      setProgressFromEvent(event);
    }

    function updateScrubbing(event) {
      if (!isScrubbing) {
        return;
      }
      setProgressFromEvent(event);
    }

    function stopScrubbing() {
      if (!isScrubbing) {
        return;
      }
      isScrubbing = false;
      progress.classList.remove("is-scrubbing");
      revealControls();
    }

    function handleProgressKeydown(event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-5);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(5);
      }
    }

    function handleKeydown(event) {
      if (event.target?.tagName === "INPUT") {
        return;
      }

      revealControls();

      if (event.key === "Escape" && player.classList.contains("is-menu-open")) {
        event.preventDefault();
        closeSpeedMenu();
      } else if (event.key === " " || event.key.toLowerCase() === "k") {
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
      [player, "mousemove", revealControls],
      [player, "pointerdown", revealControls],
      [centerPlay, "click", togglePlay],
      [barPlay, "click", togglePlay],
      [centerRewind, "click", () => seekBy(-10)],
      [barRewind, "click", () => seekBy(-10)],
      [centerForward, "click", () => seekBy(10)],
      [barForward, "click", () => seekBy(10)],
      [progress, "pointerdown", startScrubbing],
      [progress, "keydown", handleProgressKeydown],
      [pipWindow, "pointermove", updateScrubbing],
      [pipWindow, "pointerup", stopScrubbing],
      [mute, "click", () => {
        video.muted = !video.muted;
        revealControls();
      }],
      [volume, "input", handleVolumeInput],
      [speedButton, "click", toggleSpeedMenu],
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

    function syncLoop() {
      sync();
      frame = pipWindow.requestAnimationFrame(syncLoop);
    }

    sync();
    revealControls();
    frame = pipWindow.requestAnimationFrame(syncLoop);

    return {
      destroy() {
        pipWindow.clearTimeout(hideTimer);
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
    AUTO_HIDE_DELAY_MS,
    SPEED_OPTIONS,
    STYLES,
    mount,
    progressRatio,
    speedLabel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalObject.NativePiPFloatingPlayerUI = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
