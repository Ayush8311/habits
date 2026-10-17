// Which manual install instructions to show when the browser offers no
// in-page install prompt. Feature checks come first; the user agent is only
// used to pick the right wording, and every path has a usable fallback.

/**
 * @param {object} env  Defaults to the current browser; injectable for tests.
 * @returns {'ios'|'in-app'|'android'|'android-firefox'|'mac-safari'|'desktop-chromium'|'desktop-firefox'|'other'}
 */
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Snapchat|TikTok|musical_ly|Twitter|GSA\//;

export function detectInstallPlatform(env = browserEnv()) {
  const { userAgent: ua = '', platform = '', maxTouchPoints = 0, brands = [] } = env;

  // iPadOS reports itself as a Mac, but has touch.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  // Browsers built into other apps (Instagram, Facebook, Gmail links…) can't install
  // web apps on either platform; the page has to be opened in the real browser.
  if (IN_APP_BROWSER.test(ua) || (/Android/.test(ua) && /; wv\)/.test(ua))) return 'in-app';
  if (isIOS) return 'ios';

  const isFirefox = /Firefox\//.test(ua);
  const isChromium =
    brands.some(({ brand }) => /Chromium|Google Chrome|Microsoft Edge|Opera/.test(brand)) ||
    /Chrome\/|Chromium\/|Edg\//.test(ua);

  if (/Android/.test(ua)) return isFirefox ? 'android-firefox' : 'android';
  if (isFirefox) return 'desktop-firefox';
  if (isChromium) return 'desktop-chromium';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return 'mac-safari';
  return 'other';
}

function browserEnv() {
  if (typeof navigator === 'undefined') return {};
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    brands: navigator.userAgentData?.brands ?? [],
  };
}
