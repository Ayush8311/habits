import { useEffect, useId, useRef, useState } from 'react';
import { Download, Eraser, HardDrive, RotateCcw, Settings2, Upload } from 'lucide-react';
import { IconButton } from './ui/Button.jsx';
import './SettingsMenu.css';

const ITEMS = [
  {
    id: 'export',
    icon: Download,
    title: 'Export backup',
    description: 'Save your data as a file',
  },
  {
    id: 'import',
    icon: Upload,
    title: 'Import backup',
    description: 'Restore from a backup file',
  },
  {
    id: 'reset',
    icon: RotateCcw,
    title: 'Reset sample data',
    description: 'Replace everything with the example habits',
  },
  {
    id: 'clear',
    icon: Eraser,
    title: 'Clear all check-ins',
    description: 'Keep your habits, remove every record',
    danger: true,
  },
];

/** `actions` maps each item id (export, import, reset, clear) to its handler. */
export function SettingsMenu({ actions, summary }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const closeAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (event) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    const moves = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRestoreFocus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key in moves) {
      event.preventDefault();
      items[(moves[event.key] + items.length) % items.length].focus();
    }
  };

  const choose = (id) => {
    setOpen(false);
    actions[id]();
  };

  return (
    <div className="settings" ref={rootRef}>
      <IconButton
        ref={triggerRef}
        icon={Settings2}
        label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div id={menuId} ref={menuRef} className="menu" role="menu" aria-label="Settings" onKeyDown={onMenuKeyDown}>
          <p className="menu-label" aria-hidden="true">
            Data
          </p>
          {ITEMS.map(({ id, icon: Icon, title, description, danger }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={danger ? 'menu-item is-danger' : 'menu-item'}
              onClick={() => choose(id)}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="menu-item-text">
                <span className="menu-item-title">{title}</span>
                <span className="menu-item-description">{description}</span>
              </span>
            </button>
          ))}
          <p className="menu-footer">
            <HardDrive size={13} strokeWidth={1.8} aria-hidden="true" />
            Saved on this device · {summary}
          </p>
        </div>
      )}
    </div>
  );
}
