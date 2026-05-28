export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const AUTO_HIDE_DELAY_MS = 2300;
export const DEFAULT_FIT_MODE = "fill";
export const LEGACY_FIT_MODE_STORAGE_KEY = "native-pip-fit-mode";
export const PREVIOUS_FIT_MODE_STORAGE_KEY = "native-pip-fit-mode-v2";
export const FIT_MODE_STORAGE_KEY = "native-pip-fit-mode-v3";
export const FIT_MODE_MIGRATION_KEY = "native-pip-fit-mode-migration-v3";
export const FIT_MODES = ["fit", "fill"];

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatTime(seconds) {
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

export function progressRatio(currentTime, duration) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return clamp(currentTime / duration, 0, 1);
}

export function boundedSeekTime(currentTime, delta, duration) {
  if (Number.isFinite(duration) && duration > 0) {
    return clamp(currentTime + delta, 0, duration);
  }

  return Math.max(0, currentTime + delta);
}

export function clampVolume(value) {
  return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
}

export function steppedVolume(currentVolume, direction, step = 0.05) {
  const normalizedDirection = direction < 0 ? -1 : 1;
  return clampVolume(clampVolume(currentVolume) + normalizedDirection * step);
}

export function applyVolumeChange(video, nextVolume) {
  const volume = clampVolume(nextVolume);
  video.volume = volume;
  video.muted = volume === 0;

  return {
    muted: video.muted,
    volume: video.volume
  };
}

export function isValidFitMode(mode) {
  return FIT_MODES.includes(mode);
}

export function normalizeFitMode(mode, fallback = DEFAULT_FIT_MODE) {
  return isValidFitMode(mode) ? mode : fallback;
}

export function objectFitForMode(mode) {
  return "cover";
}

export function nextFitMode(mode) {
  return DEFAULT_FIT_MODE;
}

export function resolveStoredFitMode({ storedMode, legacyMode, previousMode } = {}) {
  return DEFAULT_FIT_MODE;
}

export function speedLabel(speed) {
  return `${Number(speed).toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;
}
