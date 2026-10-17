import { useState } from 'react';
import { detectInstallPlatform } from '../../lib/installPlatform.js';
import { promptInstall, usePWAState } from '../../pwa.js';
import { InstallGuideModal } from './InstallGuideModal.jsx';

/**
 * Install state for the UI plus a single `install()` action:
 *   'installed'     running as an installed app
 *   'just-installed' the browser confirmed installation; this tab is still a browser tab
 *   'available'     a native install prompt can be shown
 *   'manual'        no prompt available; `install()` opens instructions for this platform
 */
export function useInstallFlow() {
  const pwa = usePWAState();
  const [guideOpen, setGuideOpen] = useState(false);
  const [message, setMessage] = useState(null);

  const status = pwa.standalone
    ? 'installed'
    : pwa.installedThisSession
      ? 'just-installed'
      : pwa.canPrompt
        ? 'available'
        : 'manual';

  const install = async () => {
    setMessage(null);
    if (!pwa.canPrompt) {
      setGuideOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') setMessage('Installing Habit…');
    else if (outcome === 'dismissed') setMessage('Installation cancelled. You can install Habit any time.');
    else setGuideOpen(true);
  };

  const dialog = guideOpen ? (
    <InstallGuideModal platform={detectInstallPlatform()} onClose={() => setGuideOpen(false)} />
  ) : null;

  return { status, install, message: status === 'just-installed' ? null : message, dialog };
}
