# YouTube Floating Picture-in-Picture

A minimal Manifest V3 extension for Brave and Chromium browsers. On YouTube, it opens a premium Document Picture-in-Picture mini-player with responsive controls. On other pages, it keeps the browser-native video Picture-in-Picture fallback.

This extension does not add analytics, network requests, telemetry, or third-party scripts.

On YouTube and YouTube Music, the extension adds a small PiP button directly to the player toolbar. The browser extension icon remains available as a global native PiP fallback.

## Project Path

The active project directory is:

```text
/home/hipson47/code/wtyczka
```

## Structure

- `manifest.json` defines the Manifest V3 extension, action button, service worker, and minimal permissions.
- `background.js` handles extension icon clicks and injects the page scripts into the active tab.
- `src/videoSelector.js` contains the reusable video scoring and selection logic.
- `src/pipRuntime.js` contains shared helpers for toasts, video selection, time formatting, and compatibility.
- `src/nativePipRuntime.js` contains the classic native `HTMLVideoElement.requestPictureInPicture()` fallback.
- `src/pipWindowSizing.js` computes aspect-ratio-aware Document Picture-in-Picture window sizes.
- `src/documentPipRuntime.js` contains the YouTube-specific Document Picture-in-Picture lifecycle and restore logic.
- `src/react/floatingPlayerEntry.jsx` mounts the React premium floating mini-player UI.
- `src/react/floatingPlayer.css` contains the YouTube-like visual system for the floating controls.
- `src/react/playerUtils.mjs` contains tested UI math helpers for progress, speed labels, and seek bounds.
- `dist/floatingPlayerUI.global.js` is the built static React bundle loaded by the extension content script.
- `src/runTogglePiP.js` calls the native fallback for the browser extension icon path.
- `src/youtubeToolbar.js` adds the YouTube player toolbar button without auto-triggering Picture-in-Picture on load.
- `src/youtubeToolbar.css` styles the YouTube toolbar button to fit native player controls.
- `test/` contains Node built-in test runner tests.
- `scripts/check-extension.js` validates manifest constraints and JavaScript syntax.
- `scripts/launch-brave-dev.sh` launches Brave with this extension and a temporary development profile.
- `fixtures/manual-video.html` is a local manual QA page with generated video streams.

## How It Works

### Extension Icon

1. Click the extension icon.
2. The service worker injects `src/videoSelector.js`, `src/pipRuntime.js`, `src/nativePipRuntime.js`, and `src/runTogglePiP.js` into the active tab with `chrome.scripting.executeScript`.
3. The runner calls the native PiP fallback runtime.
4. The runtime exits native Picture-in-Picture if the current document already has a PiP video.
5. Otherwise, it finds usable `<video>` elements and prefers active, visible, ready media with the strongest score.
6. It calls the selected video's native `requestPictureInPicture()` method.

### YouTube Toolbar

1. On `https://www.youtube.com/*` and `https://music.youtube.com/*`, the manifest loads a YouTube-only content script.
2. The content script inserts one `ytwindow-pip-button` into `.ytp-right-controls`.
3. The button uses YouTube's `ytp-button` class plus local styling.
4. Clicking the button opens a Document Picture-in-Picture window when supported.
5. The extension computes an initial floating window size from the active video's real aspect ratio, then moves the active YouTube `<video>` into the floating document and renders responsive custom controls around it.
6. The floating player includes center play/seek controls and a full-width bottom bar with play/pause, seek, time, progress, mute, volume, speed, and close/restore.
7. Closing the floating window restores the real video element to its original page location.
8. YouTube navigation and player re-renders are handled with `yt-navigate-finish`, `yt-navigate-start`, `fullscreenchange`, and a debounced `MutationObserver`.

The YouTube content script does not start Picture-in-Picture on page load. PiP starts only from an explicit user click.

## Floating Player UI

The Document Picture-in-Picture window uses a locally bundled React UI. It does not use a runtime dev server, CDN dependency, remote script, analytics, or telemetry.

- The video defaults to Fill mode with `object-fit: cover`, so the floating window is filled by default.
- Fit mode uses `object-fit: contain` to preserve the full frame. Fill mode uses `object-fit: cover` to reduce external bars by cropping when the window shape does not match the video.
- Controls overlay the video with YouTube-like dark gradients.
- Center play and seek controls scale with `clamp()` sizing.
- The bottom toolbar uses compact white controls and a red watched progress segment.
- The progress bar supports click and drag scrubbing.
- The volume slider is styled locally and avoids default browser range styling where supported.
- The Fit/Fill choice is persisted with a versioned key. Older saved Fit/Contain state is reset to Fill/Cover once so the new default is deterministic.
- Press `F` in the floating player to toggle optional Fit/Fill without changing the restored toolbar layout.
- Playback speed uses a custom dark menu instead of a native dropdown.
- Controls auto-hide while playing and reappear on movement, focus, keyboard interaction, pause, seeking, or menu use.
- Seek backward and seek forward show brief animated feedback overlays.

The React bundle is built with Vite into `dist/floatingPlayerUI.global.js`, which exposes the same `NativePiPFloatingPlayerUI.mount(...)` contract used by the existing Document PiP runtime.

## Native PiP vs Document Picture-in-Picture

YouTube toolbar mode prefers Document Picture-in-Picture. That API lets the extension create a small floating document and place the real video element plus custom controls inside it.

The browser extension icon and unsupported environments use classic native video Picture-in-Picture through `HTMLVideoElement.requestPictureInPicture()`. That gives the browser-managed PiP window for a selected video element and remains the stable fallback.

## Permissions

- `activeTab`: grants temporary access only to the tab where the user clicked the extension.
- `scripting`: allows the extension to run the PiP toggle scripts in that active tab.

The extension does not request host permissions and does not collect, store, or transmit user data.

The YouTube toolbar integration is scoped through `content_scripts.matches` only:

```text
https://www.youtube.com/*
https://music.youtube.com/*
```

## Test And Validation Commands

```bash
npm run build
npm test
npm run check
npm run validate
```

`npm run build` creates `dist/floatingPlayerUI.global.js` from the React source.

`npm test` runs behavior tests for video selection, manifest permissions, native fallback behavior, Document PiP fallback behavior, restore lifecycle, and toolbar idempotency.

`npm run check` builds the React bundle, validates the manifest, checks that broad host permissions are not requested, validates YouTube content-script assets, rejects browser-incompatible bundle globals such as `process.env`, and syntax-checks JavaScript files.

`npm run validate` runs every local verification command.

After changing React UI files, run `npm run build` or `npm run validate`, then reload the unpacked extension in `brave://extensions`.

If the YouTube floating player stops opening after UI changes, run `npm run validate` first. It rebuilds `dist/floatingPlayerUI.global.js` and verifies that the content-script bundle exposes `NativePiPFloatingPlayerUI.mount(...)` without Node-only runtime globals.

## Launch In Brave With A Temporary Dev Profile

Use this command from the project directory:

```bash
npm run launch:brave
```

The launcher uses:

- `--no-first-run`

On Linux Brave, it loads the extension directly from `/home/hipson47/code/wtyczka` and uses `/home/hipson47/code/wtyczka/.brave-dev-profile`.

On Windows Brave launched from WSL, it avoids `\\wsl.localhost` browser profile paths because Chromium's Windows file locking and sandbox APIs can fail there with `Niepoprawna funkcja (0x1)`. In that case the launcher copies the minimal extension files to Windows `%TEMP%\wtyczka-native-pip-extension` and uses `%TEMP%\wtyczka-brave-dev-profile`.

It tries `brave-browser`, then `brave`, then the common Windows Brave path under WSL:

```text
/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe
```

The normal/default Brave profile is not modified. The temporary profile directory is ignored by git.

## Load Manually In Brave

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `/home/hipson47/code/wtyczka`.
5. Pin the extension if you want quick access from the toolbar.

## Manual Test Checklist

- YouTube toolbar button: open a YouTube video and confirm a small PiP button appears in the right player controls.
- Premium YouTube floating player: click the toolbar button and confirm a Document Picture-in-Picture window opens when supported.
- Aspect ratio: confirm a normal 16:9 video opens close to 16:9, an older 4:3 video opens closer to 4:3, and a Shorts/portrait video opens in a taller shape when browser clamping allows it.
- Fit/Fill: confirm Fill is the default, resize the PiP window to a mismatched shape, press `F` to switch to Fit and show the full video with possible bars, then press `F` again and confirm external bars are reduced by cropping.
- YouTube next video: while the floating player is open, navigate to another YouTube video and confirm the PiP window stays open and rebinds to the active video.
- Center controls: resize the floating window and confirm play/pause plus seek back/forward controls scale and remain usable.
- Bottom bar: confirm current time, duration, red progress scrubber, play/pause, mute, volume, seek buttons, playback speed menu, and close/restore controls work.
- Auto-hide: while playing, stop moving the pointer and confirm controls hide, then move/focus/press a key and confirm they return.
- Restore: close the floating window and confirm the video returns to the YouTube page cleanly.
- Fallback: if Document Picture-in-Picture is unsupported, confirm the toolbar button falls back to native video PiP.
- YouTube SPA navigation: navigate to another video without a full reload and confirm the PiP button appears once, without duplicates.
- YouTube theater mode: switch theater mode and confirm the toolbar button remains usable.
- YouTube normal video: click the extension icon and confirm native Picture-in-Picture opens.
- YouTube Music: open a video-capable YouTube Music page and confirm the button appears when the YouTube player controls exist.
- Multiple videos: open `fixtures/manual-video.html` and confirm the larger active video is selected.
- Page with no video: confirm a small temporary "No video found." message appears.
- Toggle off: while Picture-in-Picture is open for the current page, click the extension icon again and confirm it exits.
- Reload: reload a video page and confirm the extension still works.

## Known Limitations

- Document Picture-in-Picture and native OS-level PiP behavior still need manual browser QA because headless automation is not a reliable proof for floating-window behavior.
- Browser-restricted pages such as `brave://` and some store pages do not allow script injection.
- Videos inside cross-origin iframes are not targeted in v1.
- Some sites may explicitly disable Picture-in-Picture on their video elements.
- Browser settings or site policies can block the native Picture-in-Picture API.
- Document Picture-in-Picture is Chromium-specific and may be unavailable in some browsers or settings.
- Browsers may clamp or remember Document Picture-in-Picture window size despite the extension requesting an aspect-ratio-aware initial size.
- Fill mode can reduce external bars caused by a mismatched window shape, but it crops video content by design.
- Some videos contain black bars inside the encoded frame; the extension cannot remove those without cropping real video pixels.
- Moving YouTube's real video element into a floating document is intentionally restored on close/navigation, but YouTube DOM changes can still affect behavior.
- The YouTube toolbar button depends on public DOM structure such as `.ytp-right-controls`, which YouTube can change.
- The toolbar integration intentionally does not bypass ads, restrictions, or private YouTube player APIs.
- The floating player UI is designed to feel YouTube-like, but it is not a wholesale copy of YouTube's private internal controls DOM.

## Recommended Next Steps

- Run headed Brave QA on several YouTube layouts and window sizes.
- Add an optional captions control only if it can be backed by stable browser/video capabilities.
- Add a short-lived action badge when injection is blocked on restricted pages.
- Add browser-level smoke tests if a stable headed Brave automation environment is available.
- Add frame-aware support for embedded videos where Chromium allows it.
