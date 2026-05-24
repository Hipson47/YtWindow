import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "./floatingPlayer.css?raw";
import {
  AUTO_HIDE_DELAY_MS,
  SPEED_OPTIONS,
  boundedSeekTime,
  formatTime,
  progressRatio,
  speedLabel
} from "./playerUtils.mjs";

const ICONS = {
  play: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M13 9v18l15-9z" /></svg>,
  pause: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M12 9h5v18h-5zm7 0h5v18h-5z" /></svg>,
  rewind: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M17 11v14l-10-7zm12 0v14l-10-7V11z" /><text x="18" y="31" textAnchor="middle" fontSize="7" fill="currentColor" fontFamily="Arial">10</text></svg>,
  forward: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M19 11v14l10-7zm-12 0v14l10-7V11z" /><text x="18" y="31" textAnchor="middle" fontSize="7" fill="currentColor" fontFamily="Arial">10</text></svg>,
  volume: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 14v8h6l8 6V8l-8 6zm17.5-1.5a8 8 0 0 1 0 11l2.1 2.1a11 11 0 0 0 0-15.2z" /></svg>,
  muted: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 14v8h6l8 6V8l-8 6zm20.7 4 4-4-2.2-2.2-4 4-4-4-2.2 2.2 4 4-4 4 2.2 2.2 4-4 4 4 2.2-2.2z" /></svg>,
  restore: <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M10 10h16v16H10zm3 3v10h10V13zm14-7h3v21h-3zM6 6h21v3H9v18H6z" /></svg>
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

function VolumeControl({ muted, volume, onMute, onVolume, onReveal }) {
  const visibleVolume = muted ? 0 : volume;

  return (
    <div className="ytp-volume">
      <IconButton ariaLabel={muted || volume === 0 ? "Unmute" : "Mute"} onClick={onMute}>
        {muted || volume === 0 ? ICONS.muted : ICONS.volume}
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
        onChange={(event) => {
          onReveal();
          onVolume(Number(event.currentTarget.value));
        }}
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
        {speedLabel(playbackRate)}
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
  const [videoState, setVideoState] = useState(() => readVideoState(video));
  const [visible, setVisible] = useState(true);
  const [seekFeedback, setSeekFeedback] = useState("");
  const isMenuOpen = false;

  useEffect(() => {
    videoHostRef.current.appendChild(video);
  }, [video]);

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
    if (!video.paused) {
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
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        video.muted = !video.muted;
      }
    };

    ownerWindow.addEventListener("keydown", handleKeydown);
    return () => ownerWindow.removeEventListener("keydown", handleKeydown);
  }, [ownerWindow, reveal, seekBy, togglePlay, video]);

  const rootClass = useMemo(() => [
    "ytp-clone",
    visible ? "is-visible" : "",
    videoState.paused ? "is-paused" : "",
    isMenuOpen ? "is-menu-open" : ""
  ].filter(Boolean).join(" "), [isMenuOpen, videoState.paused, visible]);

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
              <VolumeControl muted={videoState.muted} volume={videoState.volume} onMute={() => {
                video.muted = !video.muted;
                reveal();
              }} onReveal={reveal} onVolume={(volume) => {
                video.volume = volume;
                video.muted = volume === 0;
              }} />
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
  root.render(<FloatingPlayer ownerWindow={pipWindow} video={video} onRestore={onRestore} />);

  return {
    destroy() {
      root.unmount();
      style.remove();
    }
  };
}

globalThis.NativePiPFloatingPlayerUI = {
  AUTO_HIDE_DELAY_MS,
  SPEED_OPTIONS,
  mount
};
