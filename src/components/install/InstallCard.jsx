import { CircleCheck, Download } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import './InstallCard.css';

/** The Settings card: an Install App action, or confirmation once installed. */
export function InstallCard({ flow }) {
  const { status, install, message } = flow;
  const installed = status === 'installed' || status === 'just-installed';

  return (
    <div className="install-card">
      <img className="install-card-icon" src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width="52" height="52" />
      <div className="install-card-text">
        <p className="install-card-title">{installed ? 'Habit is installed' : 'Install App'}</p>
        <p className="install-card-description">
          {status === 'installed'
            ? 'You’re using the installed app.'
            : status === 'just-installed'
              ? 'Open Habit from your home screen or app list.'
              : 'Add Habit to your device for quick access.'}
        </p>
        {message && (
          <p className="install-card-message" role="status">
            {message}
          </p>
        )}
      </div>
      {installed ? (
        <span className="install-card-badge">
          <CircleCheck size={15} strokeWidth={2.2} aria-hidden="true" />
          Installed
        </span>
      ) : (
        <Button variant="primary" icon={Download} onClick={install}>
          Install App
        </Button>
      )}
    </div>
  );
}
