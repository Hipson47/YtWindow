# Native Picture-in-Picture Toggle

A minimal Manifest V3 extension for Brave and Chromium browsers that toggles browser-native Picture-in-Picture for the best active video on the current tab.

This extension uses the browser's native `requestPictureInPicture()` API. It does not create a custom floating player, fake overlay, analytics, network requests, or persistent page UI.

## Project Path

The active project directory is:

```text
/home/hipson47/code/wtyczka
```

## Structure

- `manifest.json` defines the Manifest V3 extension, action button, service worker, and minimal permissions.
- `background.js` handles extension icon clicks and injects the page scripts into the active tab.
- `src/videoSelector.js` contains the reusable video scoring and selection logic.
- `src/injectedPiP.js` runs in the active page and calls the native Picture-in-Picture API.
- `test/` contains Node built-in test runner tests.
- `scripts/check-extension.js` validates manifest constraints and JavaScript syntax.
- `scripts/launch-brave-dev.sh` launches Brave with this extension and a temporary development profile.
- `fixtures/manual-video.html` is a local manual QA page with generated video streams.

## How It Works

1. Click the extension icon.
2. The service worker injects `src/videoSelector.js` and `src/injectedPiP.js` into the active tab with `chrome.scripting.executeScript`.
3. The page script exits Picture-in-Picture if the current document already has a PiP video.
4. Otherwise, it finds usable `<video>` elements and prefers active, visible, ready media with the strongest score.
5. It calls the selected video's native `requestPictureInPicture()` method.
6. If no usable video is found, or the API is unavailable, it shows a temporary toast on the page.

## Permissions

- `activeTab`: grants temporary access only to the tab where the user clicked the extension.
- `scripting`: allows the extension to run the PiP toggle scripts in that active tab.

The extension does not request host permissions and does not collect, store, or transmit user data.

## Test And Validation Commands

```bash
npm test
npm run check
npm run validate
```

`npm test` runs behavior tests for video selection and manifest permissions.

`npm run check` validates the manifest, checks that broad host permissions are not requested, and syntax-checks JavaScript files.

`npm run validate` runs every local verification command.

## Launch In Brave With A Temporary Dev Profile

Use this command from the project directory:

```bash
npm run launch:brave
```

The launcher uses:

- `--load-extension=/home/hipson47/code/wtyczka`
- `--user-data-dir=/home/hipson47/code/wtyczka/.brave-dev-profile`
- `--no-first-run`

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

- YouTube normal video: click the extension icon and confirm native Picture-in-Picture opens.
- YouTube theater mode: click the extension icon and confirm the main video opens in native Picture-in-Picture.
- Multiple videos: open `fixtures/manual-video.html` and confirm the larger active video is selected.
- Page with no video: confirm a small temporary "No video found." message appears.
- Toggle off: while Picture-in-Picture is open for the current page, click the extension icon again and confirm it exits.
- Reload: reload a video page and confirm the extension still works.

## Known Limitations

- Native PiP behavior still needs manual browser QA because headless automation is not a reliable proof for the OS-level PiP window.
- Browser-restricted pages such as `brave://` and some store pages do not allow script injection.
- Videos inside cross-origin iframes are not targeted in v1.
- Some sites may explicitly disable Picture-in-Picture on their video elements.
- Browser settings or site policies can block the native Picture-in-Picture API.

## Recommended Next Steps

- Add toolbar icons.
- Add frame-aware support for embedded videos where Chromium allows it.
- Add a short-lived action badge when injection is blocked on restricted pages.
- Add browser-level smoke tests if a stable headed Brave automation environment is available.
