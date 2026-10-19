import { ChevronRight, Download, Eraser, HardDrive, RotateCcw, Trash2, Upload } from 'lucide-react';
import { InstallCard } from '../../components/install/InstallCard.jsx';
import { useInstallFlow } from '../../components/install/useInstallFlow.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { countCheckIns } from '../../lib/backup.js';
import { cx } from '../../lib/classNames.js';
import { isNativeApp } from '../../lib/platform.js';
import { getCombinedOrder, getOpeningPage, getPageLayout, getTheme } from '../../lib/preferences.js';
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

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Only offered while Habit isn't installed; once installed there is nothing to show. */
function InstallGroup() {
  const flow = useInstallFlow();
  const installed = flow.status === 'installed' || flow.status === 'just-installed';
  if (isNativeApp || (installed && !flow.dialog)) return null;

  return (
    <section className="m-section">
      <h2 className="m-section-title">App</h2>
      {!installed && (
        <div className="m-card">
          <InstallCard flow={flow} />
        </div>
      )}
      {flow.dialog}
    </section>
  );
}

const LAYOUT_OPTIONS = [
  { value: 'separate', label: 'Separate pages' },
  { value: 'combined', label: 'Combined page' },
];
const LAYOUT_HINTS = {
  separate: 'Tasks and habits on their own pages.',
  combined: 'Tasks and habits together on one page. No separate Tasks page.',
};
const ORDER_OPTIONS = [
  { value: 'tasks-first', label: 'Tasks first' },
  { value: 'habits-first', label: 'Habits first' },
];
const OPENING_OPTIONS = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'today', label: 'Habits' },
];

function AppearanceGroup({ store }) {
  const { preferences } = store.state;
  const theme = getTheme(preferences);
  const layout = getPageLayout(preferences);
  const order = getCombinedOrder(preferences);
  const opening = getOpeningPage(preferences);
  return (
    <section className="m-section">
      <h2 className="m-section-title" id="appearance-title">
        Appearance
      </h2>
      <div className="m-card settings-appearance">
        <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={store.setTheme} label="Appearance" />
        <p className="settings-appearance-hint">
          {theme === 'system' ? 'Follows your device’s light or dark setting.' : `Always ${theme}.`}
        </p>
      </div>
      <h2 className="m-section-title settings-subtitle" id="layout-title">
        Page layout
      </h2>
      <div className="m-card settings-appearance">
        <SegmentedControl options={LAYOUT_OPTIONS} value={layout} onChange={store.setPageLayout} label="Page layout" />
        <p className="settings-appearance-hint">{LAYOUT_HINTS[layout]}</p>
        {layout === 'combined' ? (
          <div className="settings-subsetting">
            <p className="settings-subsetting-label" id="combined-order-label">
              Combined page order
            </p>
            <SegmentedControl options={ORDER_OPTIONS} value={order} onChange={store.setCombinedOrder} label="Combined page order" />
            <p className="settings-appearance-hint">Which section comes first on the combined page.</p>
          </div>
        ) : (
          <div className="settings-subsetting">
            <p className="settings-subsetting-label" id="opening-page-label">
              Opening page
            </p>
            <SegmentedControl options={OPENING_OPTIONS} value={opening} onChange={store.setOpeningPage} label="Opening page" />
            <p className="settings-appearance-hint">The page Habit opens on next time.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function SettingsScreen({ store, confirm, backup }) {
  const { habits, tasks } = store.state;
  const checkIns = countCheckIns(store.state);

  return (
    <div className="settings-screen">
      <ScreenHeader title="Settings" />

      <AppearanceGroup store={store} />

      <InstallGroup />


      <Group
        title="Data"
        footer={
          backup.status ??
          'Your habits and tasks are stored only on this device. To move them to another device, export a backup here and import it there.'
        }
      >
        <Row
          icon={HardDrive}
          label="Stored on this device"
          detail={`${plural(habits.length, 'habit')} · ${plural(checkIns, 'check-in')} · ${plural(tasks.length, 'task')}`}
        />
        <Row icon={Download} label="Export backup" detail="Save a copy as a file" onClick={backup.exportData} />
        <Row icon={Upload} label="Import backup" detail="Replace data from a backup file" onClick={backup.chooseFile} />
      </Group>

      <Group title="Reset">
        <Row
          icon={RotateCcw}
          label="Reset to default habits"
          onClick={() =>
            confirm({
              title: 'Reset to default habits?',
              message: 'Your habits and check-ins will be replaced with the default habits, with no check-ins. Your tasks stay.',
              confirmLabel: 'Reset',
              onConfirm: store.resetToDefaults,
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
              message: `${plural(habits.length, 'habit')} and ${plural(checkIns, 'check-in')} will be removed so you can start fresh. Your tasks stay. This can’t be undone.`,
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
