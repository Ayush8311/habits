import { AppWindow, Download, EllipsisVertical, Menu, MonitorDown, Plus, Share, SquarePlus } from 'lucide-react';

// Manual install steps for browsers without an in-page install prompt.
// Menu names change between browser versions, so each guide says so.
export const INSTALL_GUIDES = {
  ios: {
    title: 'Add Habit to your Home Screen',
    intro: 'On iPhone and iPad, Habit is installed from the Share menu.',
    steps: [
      { icon: Share, text: 'Tap the Share button. In Safari it’s in the toolbar at the bottom (iPhone) or top (iPad).' },
      { icon: SquarePlus, text: 'Scroll down and tap “Add to Home Screen”.' },
      { icon: Plus, text: 'Tap “Add”. Habit appears on your Home Screen and opens full screen.' },
    ],
    note: 'Option names vary slightly by iOS version. On iOS 16.4 and later, Chrome, Edge and Firefox offer “Add to Home Screen” in their Share menus too.',
  },
  android: {
    title: 'Install Habit on Android',
    intro: 'Your browser can add Habit to your home screen.',
    steps: [
      { icon: EllipsisVertical, text: 'Open the browser menu (⋮), usually at the top right.' },
      { icon: Download, text: 'Tap “Install app” or “Add to Home screen”.' },
      { icon: Plus, text: 'Confirm with “Install”. Habit appears with your other apps.' },
    ],
    note: 'If you don’t see the option, reload the page once and try again. Exact wording depends on the browser.',
  },
  'android-firefox': {
    title: 'Install Habit from Firefox',
    intro: 'Firefox for Android can add Habit to your home screen.',
    steps: [
      { icon: EllipsisVertical, text: 'Open the Firefox menu (⋮).' },
      { icon: Download, text: 'Tap “Install” or “Add to Home screen”.' },
      { icon: Plus, text: 'Confirm to add Habit to your home screen.' },
    ],
    note: 'Menu wording varies between Firefox versions.',
  },
  'mac-safari': {
    title: 'Add Habit to the Dock',
    intro: 'Safari 17 and later on macOS Sonoma or newer can turn Habit into a Dock app.',
    steps: [
      { icon: Share, text: 'Choose File › Add to Dock… or click the Share button in the toolbar.' },
      { icon: SquarePlus, text: 'Choose “Add to Dock”.' },
      { icon: Plus, text: 'Click “Add”. Habit opens in its own window from the Dock and Launchpad.' },
    ],
    note: 'On older versions of Safari, open this page in Chrome or Edge to install it.',
  },
  'desktop-chromium': {
    title: 'Install Habit on this computer',
    intro: 'Chrome and Edge can install Habit as an app with its own window.',
    steps: [
      { icon: MonitorDown, text: 'Click the install icon at the right end of the address bar, if you see one.' },
      { icon: EllipsisVertical, text: 'Otherwise open the browser menu: in Chrome, “Cast, save and share” › “Install page as app…”; in Edge, “Apps” › “Install this site as an app”.' },
      { icon: AppWindow, text: 'Confirm with “Install”. Habit opens from your Dock, Start menu or app list.' },
    ],
    note: 'If Habit is already installed, open it from your apps instead. Menu names change between browser versions.',
  },
  'desktop-firefox': {
    title: 'Using Habit in Firefox',
    intro: 'Firefox doesn’t offer full app installation on most desktops.',
    steps: [
      { icon: Menu, text: 'Newer Firefox versions on Windows may offer pinning the site to the taskbar from the address bar or menu.' },
      { icon: MonitorDown, text: 'For a full app window, open this page in Chrome or Edge (Windows, macOS, Linux) or Safari (macOS) and install from there.' },
      { icon: Plus, text: 'Or bookmark the page. Habit still works offline in this browser once it has loaded.' },
    ],
    note: 'Your data stays in the browser where you use Habit, so install it in the browser you use most.',
  },
  other: {
    title: 'Install Habit',
    intro: 'This browser doesn’t offer an install button to websites.',
    steps: [
      { icon: Menu, text: 'Look in the browser’s menu for “Install app”, “Add to Home screen” or “Add to Dock”.' },
      { icon: MonitorDown, text: 'If there isn’t one, open this page in Chrome, Edge or Safari to install it.' },
    ],
    note: 'Habit keeps working in the browser, including offline, even without installing.',
  },
};
