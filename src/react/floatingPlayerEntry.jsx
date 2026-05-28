import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "./floatingPlayer.css?raw";
import {
  AUTO_HIDE_DELAY_MS,
  DEFAULT_FIT_MODE,
  FIT_MODE_MIGRATION_KEY,
  FIT_MODE_STORAGE_KEY,
  LEGACY_FIT_MODE_STORAGE_KEY,
  PREVIOUS_FIT_MODE_STORAGE_KEY,
  SPEED_OPTIONS,
  applyVolumeChange,
  boundedSeekTime,
  formatTime,
  nextFitMode,
  normalizeFitMode,
  objectFitForMode,
  progressRatio,
  resolveStoredFitMode,
  speedLabel,
  steppedVolume
} from "./playerUtils.mjs";

const ICONS = {
  play: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M14 10.4v15.2c0 .9 1 1.4 1.8.9l12.3-7.6c.7-.4.7-1.4 0-1.8L15.8 9.5c-.8-.5-1.8 0-1.8.9z" /></svg>,
  pause: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M12 10.5c0-.8.6-1.5 1.5-1.5h3c.8 0 1.5.7 1.5 1.5v15c0 .8-.7 1.5-1.5 1.5h-3c-.9 0-1.5-.7-1.5-1.5zm8 0c0-.8.7-1.5 1.5-1.5h3c.9 0 1.5.7 1.5 1.5v15c0 .8-.6 1.5-1.5 1.5h-3c-.8 0-1.5-.7-1.5-1.5z" /></svg>,
  rewind: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18.7 8.3a1.4 1.4 0 0 1 .1 2l-2.6 2.8h7.1A7.9 7.9 0 0 1 31.2 21a7.9 7.9 0 0 1-7.9 7.9h-8.6a1.4 1.4 0 1 1 0-2.8h8.6a5.1 5.1 0 1 0 0-10.2h-7.1l2.6 2.8a1.4 1.4 0 0 1-2.1 1.9l-5.1-5.5a1.4 1.4 0 0 1 0-1.9l5.1-5.5a1.4 1.4 0 0 1 2 .6zM6.1 12.2c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4v11.6c0 .8-.6 1.4-1.4 1.4s-1.4-.6-1.4-1.4z" /></svg>,
  forward: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M17.3 8.3a1.4 1.4 0 0 0-.1 2l2.6 2.8h-7.1A7.9 7.9 0 0 0 4.8 21a7.9 7.9 0 0 0 7.9 7.9h8.6a1.4 1.4 0 1 0 0-2.8h-8.6a5.1 5.1 0 1 1 0-10.2h7.1l-2.6 2.8a1.4 1.4 0 0 0 2.1 1.9l5.1-5.5a1.4 1.4 0 0 0 0-1.9l-5.1-5.5a1.4 1.4 0 0 0-2 .6zm12.6 3.9c0-.8-.6-1.4-1.4-1.4s-1.4.6-1.4 1.4v11.6c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4z" /></svg>,
  volumeHigh: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 14.5c0-.8.7-1.5 1.5-1.5H13l7.1-5.3c1-.7 2.4 0 2.4 1.2v18.2c0 1.2-1.4 1.9-2.4 1.2L13 23H8.5c-.8 0-1.5-.7-1.5-1.5zm18.5-3.2a1.4 1.4 0 0 1 2 0 9.5 9.5 0 0 1 0 13.4 1.4 1.4 0 0 1-2-2 6.7 6.7 0 0 0 0-9.4 1.4 1.4 0 0 1 0-2zm3.8-3.8a1.4 1.4 0 0 1 2 0 14.9 14.9 0 0 1 0 21 1.4 1.4 0 1 1-2-2 12.1 12.1 0 0 0 0-17.1 1.4 1.4 0 0 1 0-1.9z" /></svg>,
  volumeLow: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 14.5c0-.8.7-1.5 1.5-1.5H13l7.1-5.3c1-.7 2.4 0 2.4 1.2v18.2c0 1.2-1.4 1.9-2.4 1.2L13 23H8.5c-.8 0-1.5-.7-1.5-1.5zm18.5-3.2a1.4 1.4 0 0 1 2 0 9.5 9.5 0 0 1 0 13.4 1.4 1.4 0 0 1-2-2 6.7 6.7 0 0 0 0-9.4 1.4 1.4 0 0 1 0-2z" /></svg>,
  muted: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 14.5c0-.8.7-1.5 1.5-1.5H13l7.1-5.3c1-.7 2.4 0 2.4 1.2v18.2c0 1.2-1.4 1.9-2.4 1.2L13 23H8.5c-.8 0-1.5-.7-1.5-1.5zm20.1 3.5-3.2-3.2 2-2 3.2 3.2 3.2-3.2 2 2-3.2 3.2 3.2 3.2-2 2-3.2-3.2-3.2 3.2-2-2z" /></svg>,
  speed: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 7a13 13 0 0 0-11.6 18.9c.3.7 1.2 1 1.9.6.7-.3 1-1.2.6-1.9A10.2 10.2 0 1 1 28.7 21c-.2.8.2 1.5 1 1.8.7.2 1.5-.2 1.7-1A13 13 0 0 0 18 7zm7.1 7.6a1.3 1.3 0 0 0-1.8 0l-6.1 5.2a2.8 2.8 0 1 0 2 2l5.9-5.4c.5-.5.5-1.3 0-1.8z" /></svg>,
  restore: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M10 8.5c0-.8.7-1.5 1.5-1.5H28c.8 0 1.5.7 1.5 1.5V25c0 .8-.7 1.5-1.5 1.5h-3V23h1V10H13v1h-3zm-3.5 5c0-.8.7-1.5 1.5-1.5h16.5c.8 0 1.5.7 1.5 1.5V30c0 .8-.7 1.5-1.5 1.5H8c-.8 0-1.5-.7-1.5-1.5zm3 1.5v13.5H23V15z" /></svg>
};

function readVideoState(video) {
  return {
    currentTime: video.currentTime || 0,
    duration: video.duration || 0,
    ended: video.ended,
    muted: video.muted,
    paused: video.paused,
    playbackRate: video.playbackRate || 1,
    seeking: video.seeking,
    volume: video.volume
  };
}

function IconButton({ ariaLabel, children, className = "", onClick, title = ariaLabel }) {
  return (
    <button className={`ytp-button ${className}`.trim()} type="button" aria-label={ariaLabel} title={title} onClick={onClick}>
      {children}
    </button>
  );
}

function readLocalFitMode(ownerWindow) {
  try {
    const storedMode = ownerWindow.localStorage?.getItem(FIT_MODE_STORAGE_KEY) || globalThis.localStorage?.getItem(FIT_MODE_STORAGE_KEY);
    if (storedMode) {
      return resolveStoredFitMode({ storedMode });
    }

    // v3 intentionally ignores older Fit/Contain keys, which could keep users stuck with black bars.
    ownerWindow.localStorage?.setItem(FIT_MODE_MIGRATION_KEY, "done");
    ownerWindow.localStorage?.setItem(FIT_MODE_STORAGE_KEY, DEFAULT_FIT_MODE);
    globalThis.localStorage?.setItem(FIT_MODE_MIGRATION_KEY, "done");
    globalThis.localStorage?.setItem(FIT_MODE_STORAGE_KEY, DEFAULT_FIT_MODE);
    return DEFAULT_FIT_MODE;
  } catch {
    return DEFAULT_FIT_MODE;
  }
}

function writeLocalFitMode(ownerWindow, mode) {
  try {
    ownerWindow.localStorage?.setItem(FIT_MODE_STORAGE_KEY, mode);
  } catch {}

  try {
    globalThis.localStorage?.setItem(FIT_MODE_STORAGE_KEY, mode);
  } catch {}
}

function readStoredFitMode(ownerWindow) {
  const storage = globalThis.chrome?.storage?.local;
  if (!storage?.get) {
    return Promise.resolve(readLocalFitMode(ownerWindow));
  }

  return new Promise((resolve) => {
    try {
      storage.get([FIT_MODE_STORAGE_KEY, PREVIOUS_FIT_MODE_STORAGE_KEY, LEGACY_FIT_MODE_STORAGE_KEY, FIT_MODE_MIGRATION_KEY], (result) => {
        if (globalThis.chrome?.runtime?.lastError) {
          resolve(readLocalFitMode(ownerWindow));
          return;
        }

        const storedMode = result?.[FIT_MODE_STORAGE_KEY];
        if (storedMode) {
          resolve(resolveStoredFitMode({ storedMode }));
          return;
        }

        // v3 migration: old Fit/Contain state is reset to Fill/Cover unless the user chooses Fit again.
        storage.set?.({
          [FIT_MODE_MIGRATION_KEY]: "done",
          [FIT_MODE_STORAGE_KEY]: DEFAULT_FIT_MODE
        });
        writeLocalFitMode(ownerWindow, DEFAULT_FIT_MODE);
        resolve(DEFAULT_FIT_MODE);
      });
    } catch {
      resolve(readLocalFitMode(ownerWindow));
    }
  });
}

function writeStoredFitMode(ownerWindow, mode) {
  const normalizedMode = normalizeFitMode(mode);
  const storage = globalThis.chrome?.storage?.local;

  if (storage?.set) {
    try {
      storage.set({ [FIT_MODE_STORAGE_KEY]: normalizedMode });
    } catch {}
  }

  writeLocalFitMode(ownerWindow, normalizedMode);
}

function ProgressBar({ currentTime, duration, onSeek, onReveal, ownerWindow }) {
  const progressRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const ratio = progressRatio(currentTime, duration);
  const percent = `${Math.round(ratio * 10000) / 100}%`;

  const seekFromPointer = useCallback((event) => {
    const rect = progressRef.current.getBoundingClientRect();
    const nextRatio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    onSeek(nextRatio * duration);
  }, [duration, onSeek]);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMove = (event) => seekFromPointer(event);
    const handleUp = () => setIsDragging(false);
    ownerWindow.addEventListener("pointermove", handleMove);
    ownerWindow.addEventListener("pointerup", handleUp, { once: true });

    return () => {
      ownerWindow.removeEventListener("pointermove", handleMove);
      ownerWindow.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, ownerWindow, seekFromPointer]);

  return (
    <div
      ref={progressRef}
      className={`ytp-progress ${isDragging ? "is-dragging" : ""}`}
      role="slider"
      aria-label="Seek"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      tabIndex={0}
      style={{ "--progress-percent": percent }}
      onPointerDown={(event) => {
        event.preventDefault();
        onReveal();
        setIsDragging(true);
        seekFromPointer(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onSeek(boundedSeekTime(currentTime, -5, duration));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onSeek(boundedSeekTime(currentTime, 5, duration));
        }
      }}
    >
      <div className="ytp-progress__track">
        <div className="ytp-progress__played" />
        <div className="ytp-progress__thumb" />
      </div>
    </div>
  );
}

function VolumeControl({ muted, onActiveChange, onMute, onReveal, onVolume, ownerWindow, volume }) {
  const activeTimerRef = useRef(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const visibleVolume = muted ? 0 : volume;
  const volumeIcon = muted || volume === 0 ? ICONS.muted : volume < 0.5 ? ICONS.volumeLow : ICONS.volumeHigh;

  const setActive = useCallback((active) => {
    setIsInteracting(active);
    onActiveChange(active);
    onReveal();
  }, [onActiveChange, onReveal]);

  useEffect(() => {
    if (!isInteracting) {
      return undefined;
    }

    const stopInteraction = () => setActive(false);
    ownerWindow.addEventListener("pointerup", stopInteraction, { once: true });
    ownerWindow.addEventListener("blur", stopInteraction, { once: true });

    return () => {
      ownerWindow.removeEventListener("pointerup", stopInteraction);
      ownerWindow.removeEventListener("blur", stopInteraction);
    };
  }, [isInteracting, ownerWindow, setActive]);

  useEffect(() => () => ownerWindow.clearTimeout(activeTimerRef.current), [ownerWindow]);

  return (
    <div className={`ytp-volume ${isInteracting ? "is-active" : ""}`}>
      <IconButton ariaLabel={muted || volume === 0 ? "Unmute" : "Mute"} onClick={() => {
        setActive(true);
        ownerWindow.clearTimeout(activeTimerRef.current);
        activeTimerRef.current = ownerWindow.setTimeout(() => setActive(false), 1600);
        onMute();
      }}>
        {volumeIcon}
      </IconButton>
      <input
        className="ytp-volume__slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        aria-label="Volume"
        value={visibleVolume}
        style={{ "--volume-percent": `${Math.round(visibleVolume * 100)}%` }}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onChange={(event) => {
          onReveal();
          onVolume(Number(event.currentTarget.value));
        }}
        onPointerDown={() => setActive(true)}
      />
    </div>
  );
}

function SpeedMenu({ ownerWindow, playbackRate, onSpeed, onReveal }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const close = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    ownerWindow.addEventListener("keydown", close);
    return () => ownerWindow.removeEventListener("keydown", close);
  }, [open, ownerWindow]);

  return (
    <div className="ytp-speed">
      <IconButton
        ariaLabel="Playback speed"
        className="ytp-speed__button"
        title="Playback speed"
        onClick={() => {
          onReveal();
          setOpen((current) => !current);
        }}
      >
        {ICONS.speed}
        <span className="ytp-speed__label">{speedLabel(playbackRate)}</span>
      </IconButton>
      <div className={`ytp-speed__menu ${open ? "is-open" : ""}`} role="menu">
        {SPEED_OPTIONS.map((speed) => {
          const selected = speed === playbackRate;
          return (
            <button
              key={speed}
              type="button"
              className={`ytp-speed__option ${selected ? "is-selected" : ""}`}
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => {
                onSpeed(speed);
                setOpen(false);
                onReveal();
              }}
            >
              <span className="ytp-speed__dot" />
              {speedLabel(speed)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeekFeedback({ direction }) {
  if (!direction) {
    return null;
  }

  return (
    <div className={`ytp-seek-feedback is-visible ytp-seek-feedback--${direction}`} key={`${direction}-${Date.now()}`}>
      <span>{direction === "back" ? "-10" : "+10"}</span>
    </div>
  );
}

function FloatingPlayer({ onRestore, ownerWindow, video }) {
  const videoHostRef = useRef(null);
  const hideTimerRef = useRef(0);
  const frameRef = useRef(0);
  const lastNonZeroVolumeRef = useRef(video.volume > 0 ? video.volume : 1);
  const [fitMode, setFitMode] = useState(DEFAULT_FIT_MODE);
  const [videoState, setVideoState] = useState(() => readVideoState(video));
  const [volumeActive, setVolumeActive] = useState(false);
  const [visible, setVisible] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState("");
  const isMenuOpen = false;

  useEffect(() => {
    const host = videoHostRef.current;
    for (const child of Array.from(host.children)) {
      if (child !== video) {
        child.remove();
      }
    }
    host.appendChild(video);
  }, [video]);

  useEffect(() => {
    let cancelled = false;
    readStoredFitMode(ownerWindow).then((storedMode) => {
      if (!cancelled) {
        setFitMode(normalizeFitMode(storedMode));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ownerWindow]);

  useEffect(() => {
    const objectFit = objectFitForMode(fitMode);
    video.style.objectFit = objectFit;
    video.dataset.nativePipFitMode = normalizeFitMode(fitMode);
  }, [fitMode, video]);

  const sync = useCallback(() => {
    setVideoState(readVideoState(video));
  }, [video]);

  useEffect(() => {
    const events = ["durationchange", "ended", "loadedmetadata", "pause", "play", "ratechange", "seeked", "seeking", "timeupdate", "volumechange"];
    for (const event of events) {
      video.addEventListener(event, sync);
    }

    const loop = () => {
      sync();
      frameRef.current = ownerWindow.requestAnimationFrame(loop);
    };
    frameRef.current = ownerWindow.requestAnimationFrame(loop);

    return () => {
      ownerWindow.cancelAnimationFrame(frameRef.current);
      for (const event of events) {
        video.removeEventListener(event, sync);
      }
    };
  }, [ownerWindow, sync, video]);

  const reveal = useCallback(() => {
    setVisible(true);
    ownerWindow.clearTimeout(hideTimerRef.current);
    if (!video.paused && !volumeActive) {
      hideTimerRef.current = ownerWindow.setTimeout(() => setVisible(false), AUTO_HIDE_DELAY_MS);
    }
  }, [ownerWindow, video, volumeActive]);

  const setVolumeInteractionActive = useCallback((active) => {
    setVolumeActive(active);
    setVisible(true);
    ownerWindow.clearTimeout(hideTimerRef.current);

    if (!active && !video.paused) {
      hideTimerRef.current = ownerWindow.setTimeout(() => setVisible(false), AUTO_HIDE_DELAY_MS);
    }
  }, [ownerWindow, video]);

  useEffect(() => {
    reveal();
    return () => ownerWindow.clearTimeout(hideTimerRef.current);
  }, [ownerWindow, reveal]);

  const seekBy = useCallback((delta) => {
    video.currentTime = boundedSeekTime(video.currentTime, delta, video.duration);
    setSeekFeedback(delta < 0 ? "back" : "forward");
    ownerWindow.setTimeout(() => setSeekFeedback(""), 580);
    reveal();
  }, [ownerWindow, reveal, video]);

  const togglePlay = useCallback(async () => {
    reveal();
    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
    sync();
  }, [reveal, sync, video]);

  const setVideoVolume = useCallback((nextVolume) => {
    const state = applyVolumeChange(video, nextVolume);
    if (state.volume > 0) {
      lastNonZeroVolumeRef.current = state.volume;
    }
    reveal();
    sync();
  }, [reveal, sync, video]);

  const toggleMute = useCallback(() => {
    reveal();
    if (video.muted || video.volume === 0) {
      video.volume = lastNonZeroVolumeRef.current || 1;
      video.muted = false;
    } else {
      lastNonZeroVolumeRef.current = video.volume || lastNonZeroVolumeRef.current;
      video.muted = true;
    }
    sync();
  }, [reveal, sync, video]);

  const toggleFitMode = useCallback(() => {
    const mode = nextFitMode(fitMode);
    setFitMode(mode);
    writeStoredFitMode(ownerWindow, mode);
    reveal();
  }, [fitMode, ownerWindow, reveal]);

  useEffect(() => {
    if (!videoState.muted && videoState.volume > 0) {
      lastNonZeroVolumeRef.current = videoState.volume;
    }
  }, [videoState.muted, videoState.volume]);

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.target?.tagName === "INPUT") {
        return;
      }

      reveal();
      if (event.key === " " || event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekBy(-10);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seekBy(10);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setVideoVolume(steppedVolume(video.volume, 1));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setVideoVolume(steppedVolume(video.volume, -1));
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMute();
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFitMode();
      }
    };

    ownerWindow.addEventListener("keydown", handleKeydown);
    return () => ownerWindow.removeEventListener("keydown", handleKeydown);
  }, [ownerWindow, reveal, seekBy, setVideoVolume, toggleMute, togglePlay, video]);

  const rootClass = useMemo(() => [
    "ytp-clone",
    visible ? "is-visible" : "",
    videoState.paused ? "is-paused" : "",
    volumeActive ? "is-volume-active" : "",
    isMenuOpen ? "is-menu-open" : ""
  ].filter(Boolean).join(" "), [isMenuOpen, videoState.paused, visible, volumeActive]);

  const playIcon = videoState.paused ? ICONS.play : ICONS.pause;
  const playLabel = videoState.paused ? "Play" : "Pause";

  return (
    <main className={rootClass} onMouseMove={reveal} onPointerDown={reveal}>
      <section className="ytp-clone__video" ref={videoHostRef} />
      <div className="ytp-clone__overlay">
        <div className="ytp-clone__center">
          <IconButton ariaLabel="Seek back 10 seconds" className="ytp-button--center ytp-secondary" onClick={() => seekBy(-10)}>{ICONS.rewind}</IconButton>
          <IconButton ariaLabel={playLabel} className="ytp-button--center ytp-button--primary" onClick={togglePlay}>{playIcon}</IconButton>
          <IconButton ariaLabel="Seek forward 10 seconds" className="ytp-button--center ytp-secondary" onClick={() => seekBy(10)}>{ICONS.forward}</IconButton>
        </div>
        <SeekFeedback direction={seekFeedback} />
        <div className="ytp-clone__toolbar">
          <ProgressBar currentTime={videoState.currentTime} duration={videoState.duration} onReveal={reveal} ownerWindow={ownerWindow} onSeek={(time) => {
            video.currentTime = time;
            reveal();
          }} />
          <div className="ytp-clone__row">
            <div className="ytp-clone__left">
              <IconButton ariaLabel={playLabel} onClick={togglePlay}>{playIcon}</IconButton>
              <IconButton ariaLabel="Seek back 10 seconds" className="ytp-secondary" onClick={() => seekBy(-10)}>{ICONS.rewind}</IconButton>
              <IconButton ariaLabel="Seek forward 10 seconds" className="ytp-secondary" onClick={() => seekBy(10)}>{ICONS.forward}</IconButton>
              <VolumeControl muted={videoState.muted} onActiveChange={setVolumeInteractionActive} onMute={toggleMute} onReveal={reveal} onVolume={setVideoVolume} ownerWindow={ownerWindow} volume={videoState.volume} />
            </div>
            <div className="ytp-clone__time">
              <span>{formatTime(videoState.currentTime)}</span>
              <span className="ytp-clone__divider">/</span>
              <span className="ytp-clone__duration">{formatTime(videoState.duration)}</span>
            </div>
            <div />
            <div className="ytp-clone__right">
              <SpeedMenu ownerWindow={ownerWindow} playbackRate={videoState.playbackRate} onReveal={reveal} onSpeed={(speed) => {
                video.playbackRate = speed;
              }} />
              <IconButton ariaLabel="Close floating player" onClick={onRestore}>{ICONS.restore}</IconButton>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function mount({ pipWindow, video, title = "Floating video", onRestore }) {
  const documentObject = pipWindow.document;
  documentObject.open();
  documentObject.write("<!doctype html><html><head><title></title></head><body><div id=\"ytwindow-react-root\"></div></body></html>");
  documentObject.close();
  documentObject.title = title;

  const style = documentObject.createElement("style");
  style.textContent = styles;
  documentObject.head.appendChild(style);

  const rootElement = documentObject.getElementById("ytwindow-react-root");
  const root = createRoot(rootElement);
  let currentVideo = video;
  const render = () => root.render(<FloatingPlayer ownerWindow={pipWindow} video={currentVideo} onRestore={onRestore} />);
  render();

  return {
    destroy() {
      root.unmount();
      style.remove();
    },
    updateVideo(nextVideo) {
      currentVideo = nextVideo;
      render();
    }
  };
}

globalThis.NativePiPFloatingPlayerUI = {
  AUTO_HIDE_DELAY_MS,
  SPEED_OPTIONS,
  mount
};
