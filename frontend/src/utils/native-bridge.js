export function isNativeApp() {
  return typeof window !== "undefined" && Boolean(window.ReactNativeWebView);
}

export function postToNativeApp(message) {
  if (!isNativeApp()) return;
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}
