// The Android Back button in the app. Without this, Back would close Habit from any
// screen (tabs don't add history entries), even with a sheet or unsaved form open.
//
//   a dialog or sheet is open  → close the top one (as Escape does)
//   another tab is showing     → go back to Today
//   on Today                   → send the app to the background, like other apps
import { App } from '@capacitor/app';

export function setupAndroidBackButton() {
  App.addListener('backButton', () => {
    const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    if (dialogs.length > 0) {
      const top = dialogs[dialogs.length - 1];
      const target = top.contains(document.activeElement) ? document.activeElement : top;
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    const onMobileTab = document.querySelector('.bottom-nav') && !/^#\/?(today)?$/.test(window.location.hash);
    if (onMobileTab) {
      window.location.hash = '#/today';
      return;
    }
    App.minimizeApp();
  });
}
