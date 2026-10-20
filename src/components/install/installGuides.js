import { AppWindow, Download, EllipsisVertical, Menu, MonitorDown, Plus, Share, SquarePlus } from 'lucide-react';

// Manual install steps for browsers without an in-page install prompt.
// Menu names change between browser versions, so each guide says so.
export const INSTALL_GUIDES = {
  ios: {
    title: 'Add mink to your Home Screen',
    intro: 'On iPhone and iPad, mink is installed from the Share menu.',
    steps: [
      { icon: Share, text: 'Tap the Share button. In Safari it’s in the toolbar at the bottom (iPhone) or top (iPad); in Chrome it’s in the address bar.' },
      { icon: SquarePlus, text: 'Scroll down and tap “Add to Home Screen”.' },
      { icon: Plus, text: 'Tap “Add”. mink appears on your Home Screen and opens full screen.' },
    ],
    notice:
      'The Home Screen app keeps its own data, separate from Safari. If you already have habits here, tap Export backup in Settings first, then Import backup in the installed app.',
    note: 'Option names vary slightly by iOS version. On iOS 16.4 and later, Chrome, Edge and Firefox offer “Add to Home Screen” in their Share menus too.',
  },
  'in-app': {
    title: 'Open mink in your browser',
    intro: 'This page is open inside another app, which can’t install web apps.',
    steps: [
      { icon: EllipsisVertical, text: 'Open this app’s menu (⋯ or ⋮), usually at the top or bottom right.' },
      { icon: AppWindow, text: 'Choose “Open in Safari” on iPhone, or “Open in Chrome” / “Open in browser” on Android.' },
      { icon: Download, text: 'Tap Install App in mink’s Settings again to see the steps for that browser.' },
    ],
    note: 'You can also copy the link and paste it into Safari or Chrome.',
  },
  android: {
    title: 'Install mink on Android',
    intro: 'Your browser can add mink to your home screen.',
    steps: [
      { icon: EllipsisVertical, text: 'Open the browser menu (⋮), usually at the top right.' },
      { icon: Download, text: 'Tap “Install app” or “Add to Home screen”.' },
      { icon: Plus, text: 'Confirm with “Install”. mink appears with your other apps.' },
    ],
    note: 'If you don’t see the option, reload the page once and try again. Exact wording depends on the browser.',
  },
  'android-firefox': {
    title: 'Install mink from Firefox',
    intro: 'Firefox for Android can add mink to your home screen.',
    steps: [
      { icon: EllipsisVertical, text: 'Open the Firefox menu (⋮).' },
      { icon: Download, text: 'Tap “Install” or “Add to Home screen”.' },
      { icon: Plus, text: 'Confirm to add mink to your home screen.' },
    ],
    note: 'Menu wording varies between Firefox versions.',
  },
  'mac-safari': {
    title: 'Add mink to the Dock',
    intro: 'Safari 17 and later on macOS Sonoma or newer can turn mink into a Dock app.',
    steps: [
      { icon: Share, text: 'Choose File › Add to Dock… or click the Share button in the toolbar.' },
      { icon: SquarePlus, text: 'Choose “Add to Dock”.' },
      { icon: Plus, text: 'Click “Add”. mink opens in its own window from the Dock and Launchpad.' },
    ],
    note: 'On older versions of Safari, open this page in Chrome or Edge to install it.',
  },
  'desktop-chromium': {
    title: 'Install mink on this computer',
    intro: 'Chrome and Edge can install mink as an app with its own window.',
    steps: [
      { icon: MonitorDown, text: 'Click the install icon at the right end of the address bar, if you see one.' },
      { icon: EllipsisVertical, text: 'Otherwise open the browser menu: in Chrome, “Cast, save and share” › “Install page as app…”; in Edge, “Apps” › “Install this site as an app”.' },
      { icon: AppWindow, text: 'Confirm with “Install”. mink opens from your Dock, Start menu or app list.' },
    ],
    note: 'If mink is already installed, open it from your apps instead. Menu names change between browser versions.',
  },
  'desktop-firefox': {
    title: 'Using mink in Firefox',
    intro: 'Firefox doesn’t offer full app installation on most desktops.',
    steps: [
      { icon: Menu, text: 'Newer Firefox versions on Windows may offer pinning the site to the taskbar from the address bar or menu.' },
      { icon: MonitorDown, text: 'For a full app window, open this page in Chrome or Edge (Windows, macOS, Linux) or Safari (macOS) and install from there.' },
      { icon: Plus, text: 'Or bookmark the page. mink still works offline in this browser once it has loaded.' },
    ],
    note: 'Your data stays in the browser where you use mink, so install it in the browser you use most.',
  },
  other: {
    title: 'Install mink',
    intro: 'This browser doesn’t offer an install button to websites.',
    steps: [
      { icon: Menu, text: 'Look in the browser’s menu for “Install app”, “Add to Home screen” or “Add to Dock”.' },
      { icon: MonitorDown, text: 'If there isn’t one, open this page in Chrome, Edge or Safari to install it.' },
    ],
    note: 'mink keeps working in the browser, including offline, even without installing.',
  },
};
