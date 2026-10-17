import { RefreshCw } from 'lucide-react';
import { applyUpdate, dismissUpdate, usePWAState } from '../../pwa.js';
import { Button } from '../ui/Button.jsx';
import './UpdateToast.css';

/** Appears when a new version has been downloaded; reloading switches to it. */
export function UpdateToast() {
  const { needRefresh } = usePWAState();
  if (!needRefresh) return null;
  return (
    <div className="update-toast" role="status" aria-live="polite">
      <RefreshCw className="update-toast-icon" size={18} strokeWidth={2} aria-hidden="true" />
      <p className="update-toast-text">A new version is ready.</p>
      <Button variant="ghost" size="sm" onClick={dismissUpdate}>
        Later
      </Button>
      <Button variant="primary" size="sm" onClick={applyUpdate}>
        Reload
      </Button>
    </div>
  );
}
