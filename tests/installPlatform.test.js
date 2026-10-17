import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectInstallPlatform } from '../src/lib/installPlatform.js';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0',
  windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0',
};

test('install instructions match the platform', () => {
  assert.equal(detectInstallPlatform({ userAgent: UA.iphoneSafari }), 'ios');
  assert.equal(detectInstallPlatform({ userAgent: UA.iphoneChrome }), 'ios');
  assert.equal(detectInstallPlatform({ userAgent: UA.ipadDesktopMode, platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
  assert.equal(detectInstallPlatform({ userAgent: UA.androidChrome }), 'android');
  assert.equal(detectInstallPlatform({ userAgent: UA.androidFirefox }), 'android-firefox');
  assert.equal(detectInstallPlatform({ userAgent: UA.macSafari, platform: 'MacIntel', maxTouchPoints: 0 }), 'mac-safari');
  assert.equal(detectInstallPlatform({ userAgent: UA.macChrome, platform: 'MacIntel' }), 'desktop-chromium');
  assert.equal(detectInstallPlatform({ userAgent: UA.windowsEdge }), 'desktop-chromium');
  assert.equal(detectInstallPlatform({ userAgent: UA.windowsFirefox }), 'desktop-firefox');
  assert.equal(detectInstallPlatform({ userAgent: 'SomethingElse/1.0' }), 'other');
  assert.equal(detectInstallPlatform({}), 'other');
});

test('browsers inside other apps get "open in your browser" steps', () => {
  assert.equal(detectInstallPlatform({ userAgent: `${UA.iphoneSafari} Instagram 400.0.0` }), 'in-app');
  assert.equal(
    detectInstallPlatform({
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0 Mobile Safari/537.36',
    }),
    'in-app',
  );
});

test('client hints identify Chromium even with a reduced user agent', () => {
  assert.equal(
    detectInstallPlatform({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', brands: [{ brand: 'Google Chrome', version: '140' }] }),
    'desktop-chromium',
  );
});
