import { Plus } from 'lucide-react';
import { formatFullDate } from '../lib/dates.js';
import { Button } from './ui/Button.jsx';
import { SettingsMenu } from './SettingsMenu.jsx';
import './Header.css';

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" />
      <path d="M10 16.6l4 4 8-9" />
    </svg>
  );
}

export function Header({ todayKey, onAddHabit, settingsActions, summary }) {
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
        <SettingsMenu actions={settingsActions} summary={summary} />
      </div>
    </header>
  );
}
