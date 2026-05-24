export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const AUTO_HIDE_DELAY_MS = 2300;

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

export function speedLabel(speed) {
  return `${Number(speed).toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;
}
