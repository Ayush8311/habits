import { useRef, useState } from 'react';
import { countCheckIns, exportBackup, readBackup } from '../lib/backup.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Export/import of a JSON backup. Importing always asks before replacing data.
 * Render `fileInput` once; call `chooseFile` from a button.
 */
export function useBackupActions({ store, confirm }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState(null);

  const exportData = async () => {
    const result = await exportBackup(store.state);
    if (result !== 'cancelled') setStatus('Backup exported.');
  };

  const onFileChosen = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const next = await readBackup(file);
    if (!next) {
      confirm({
        title: 'That file can’t be imported',
        message: 'Choose a backup file exported from Habit.',
        confirmLabel: 'OK',
        tone: 'primary',
        hideCancel: true,
        onConfirm: () => {},
      });
      return;
    }
    confirm({
      title: 'Replace your data with this backup?',
      message: `It contains ${plural(next.habits.length, 'habit')} and ${plural(countCheckIns(next), 'check-in')}, and replaces everything on this device.`,
      confirmLabel: 'Replace',
      onConfirm: () => {
        store.replaceState(next);
        setStatus('Backup imported.');
      },
    });
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json"
      hidden
      onChange={onFileChosen}
      aria-hidden="true"
      tabIndex={-1}
    />
  );

  return { exportData, chooseFile: () => inputRef.current?.click(), fileInput, status };
}
