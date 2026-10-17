import { Download, Plus } from 'lucide-react';
import { formatFullDate } from '../lib/dates.js';
import { Button, IconButton } from './ui/Button.jsx';
import { SettingsMenu } from './SettingsMenu.jsx';
import './Header.css';

// The app icon itself (generated from assets/habit-icon.svg), so the header matches the installed app.
function BrandMark() {
  return <img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="32" height="32" />;
}

export function Header({ todayKey, onAddHabit, settingsActions, summary, installFlow }) {
  const canOfferInstall = installFlow && installFlow.status !== 'installed' && installFlow.status !== 'just-installed';
  return (
    <header className="app-header">
      <div className="brand">
        <BrandMark />
        <div className="brand-text">
          <span className="brand-name">Habit</span>
          <span className="brand-tagline">Make today count.</span>
        </div>
      </div>

      <div className="app-header-actions">
        <time className="app-header-date" dateTime={todayKey}>
          {formatFullDate(todayKey)}
        </time>
        <Button variant="primary" size="sm" icon={Plus} onClick={onAddHabit}>
          New habit
        </Button>
        {canOfferInstall && <IconButton icon={Download} label="Install App" onClick={installFlow.install} />}
        <SettingsMenu actions={settingsActions} summary={summary} />
      </div>
    </header>
  );
}
