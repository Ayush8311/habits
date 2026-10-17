import {
  ChevronRight,
  CircleCheck,
  Download,
  Eraser,
  HardDrive,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { HabitIcon } from '../../components/calendar/HabitIcon.jsx';
import { countCheckIns } from '../../lib/backup.js';
import { cx } from '../../lib/classNames.js';
import { InstallCard } from '../../components/install/InstallCard.jsx';
import { useInstallFlow } from '../../components/install/useInstallFlow.jsx';
import { usePWAState } from '../../pwa.js';
import { ScreenHeader } from '../ScreenHeader.jsx';
import './SettingsScreen.css';

const BUILD_LABEL = new Date(__BUILD_TIME__).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

function Row({ icon: Icon, label, detail, tone, chevron = false, onClick, leading }) {
  const content = (
    <>
      {leading ?? (
        <span className={cx('settings-row-icon', tone && `is-${tone}`)} aria-hidden="true">
          <Icon size={17} strokeWidth={2} />
        </span>
      )}
      <span className="settings-row-text">
        <span className={cx('settings-row-label', tone === 'danger' && 'is-danger')}>{label}</span>
        {detail && <span className="settings-row-detail">{detail}</span>}
      </span>
      {chevron && <ChevronRight className="settings-row-chevron" size={18} strokeWidth={2} aria-hidden="true" />}
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" className="settings-row is-interactive" onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className="settings-row">{content}</div>
      )}
    </li>
  );
}

function Group({ title, footer, children }) {
  return (
    <section className="m-section">
      {title && <h2 className="m-section-title">{title}</h2>}
      <ul className="m-card settings-group">{children}</ul>
      {footer && <p className="m-footnote">{footer}</p>}
    </section>
  );
}

function InstallGroup() {
  const flow = useInstallFlow();
  const { offlineReady } = usePWAState();

  return (
    <section className="m-section">
      <h2 className="m-section-title">App</h2>
      <div className="m-card">
        <InstallCard flow={flow} />
      </div>
      <ul className="m-card settings-group settings-group-spaced">
        <Row
          icon={CircleCheck}
          label={offlineReady ? 'Works offline' : 'Preparing offline mode'}
          detail={offlineReady ? 'Habit is saved on this device' : 'Available after the first full load'}
        />
      </ul>
      {flow.dialog}
    </section>
  );
}

export function SettingsScreen({ store, confirm, backup, onAddHabit, onEditHabit }) {
  const { habits } = store.state;
  const checkIns = countCheckIns(store.state);

  return (
    <div className="settings-screen">
      <ScreenHeader title="Settings" />

      <InstallGroup />

      <Group title="Habits">
        {habits.map((habit) => (
          <Row
            key={habit.id}
            leading={<HabitIcon icon={habit.icon} emoji={habit.emoji} color={habit.color} />}
            label={habit.name}
            chevron
            onClick={() => onEditHabit(habit.id)}
          />
        ))}
        <Row icon={Plus} label="Add habit" tone="accent" onClick={onAddHabit} />
      </Group>


      <Group
        title="Data"
        footer={
          backup.status ??
          'Your habits are stored only on this device. To move them to another device, export a backup here and import it there.'
        }
      >
        <Row
          icon={HardDrive}
          label="Stored on this device"
          detail={`${plural(habits.length, 'habit')} · ${plural(checkIns, 'check-in')}`}
        />
        <Row icon={Download} label="Export backup" detail="Save a copy as a file" onClick={backup.exportData} />
        <Row icon={Upload} label="Import backup" detail="Replace data from a backup file" onClick={backup.chooseFile} />
      </Group>

      <Group title="Reset">
        <Row
          icon={RotateCcw}
          label="Reset to sample data"
          onClick={() =>
            confirm({
              title: 'Reset to sample data?',
              message: 'Your habits and check-ins will be replaced with the example set.',
              confirmLabel: 'Reset',
              onConfirm: store.resetToSample,
            })
          }
        />
        <Row
          icon={Eraser}
          label="Clear all check-ins"
          tone="danger"
          onClick={() =>
            confirm({
              title: 'Clear all check-ins?',
              message: `Your habits stay, but ${plural(checkIns, 'check-in')} will be removed. This can’t be undone.`,
              confirmLabel: 'Clear check-ins',
              onConfirm: store.clearCompletions,
            })
          }
        />
        <Row
          icon={Trash2}
          label="Delete all habits"
          tone="danger"
          onClick={() =>
            confirm({
              title: 'Delete all habits?',
              message: `${plural(habits.length, 'habit')} and ${plural(checkIns, 'check-in')} will be removed so you can start fresh. This can’t be undone.`,
              confirmLabel: 'Delete everything',
              onConfirm: store.deleteEverything,
            })
          }
        />
      </Group>

      <p className="settings-version">
        Habit · version {__APP_VERSION__} · built {BUILD_LABEL}
      </p>
    </div>
  );
}
