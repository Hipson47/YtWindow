const INJECTION_FILES = [
  "src/videoSelector.js",
  "src/injectedPiP.js"
];

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: INJECTION_FILES
    });
  } catch (error) {
    console.warn("Native Picture-in-Picture Toggle could not run on this page.", error);
  }
});
