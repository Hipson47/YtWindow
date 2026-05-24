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
- `src/documentPipRuntime.js` contains the YouTube-specific Document Picture-in-Picture lifecycle and restore logic.
- `src/floatingPlayerUI.js` renders the premium floating mini-player document and controls.
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
5. The extension moves the active YouTube `<video>` into the floating document and renders responsive custom controls around it.
6. The floating player includes center play/seek controls and a full-width bottom bar with play/pause, seek, time, progress, mute, volume, speed, and close/restore.
7. Closing the floating window restores the real video element to its original page location.
8. YouTube navigation and player re-renders are handled with `yt-navigate-finish`, `yt-navigate-start`, `fullscreenchange`, and a debounced `MutationObserver`.

The YouTube content script does not start Picture-in-Picture on page load. PiP starts only from an explicit user click.

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
npm test
npm run check
npm run validate
```

`npm test` runs behavior tests for video selection, manifest permissions, native fallback behavior, Document PiP fallback behavior, restore lifecycle, and toolbar idempotency.

`npm run check` validates the manifest, checks that broad host permissions are not requested, validates YouTube content-script assets, and syntax-checks JavaScript files.

`npm run validate` runs every local verification command.

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
- Center controls: resize the floating window and confirm play/pause plus seek back/forward controls scale and remain usable.
- Bottom bar: confirm current time, duration, scrubber, play/pause, mute, volume, seek buttons, playback speed, and close/restore controls work.
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
- Moving YouTube's real video element into a floating document is intentionally restored on close/navigation, but YouTube DOM changes can still affect behavior.
- The YouTube toolbar button depends on public DOM structure such as `.ytp-right-controls`, which YouTube can change.
- The toolbar integration intentionally does not bypass ads, restrictions, or private YouTube player APIs.

## Recommended Next Steps

- Add toolbar icons.
- Run headed Brave QA on several YouTube layouts and window sizes.
- Add an optional captions control only if it can be backed by stable browser/video capabilities.
- Add a short-lived action badge when injection is blocked on restricted pages.
- Add browser-level smoke tests if a stable headed Brave automation environment is available.
- Add frame-aware support for embedded videos where Chromium allows it.
