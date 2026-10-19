import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, Trash2, X } from 'lucide-react';
import { cx } from '../../lib/classNames.js';
import { getDaysInMonth, parseDateKey, toDateKey } from '../../lib/dates.js';
import { createId } from '../../lib/ids.js';
import { visibleHeight } from '../../lib/platform.js';
import {
  MAX_TASK_NAME_LENGTH,
  MAX_TASK_NOTES_LENGTH,
  PRIORITIES,
  formatTime,
  from12Hour,
  to12Hour,
  validateTaskName,
} from '../../lib/tasks.js';
import { Button, IconButton } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { WheelColumn, WheelGroup } from '../ui/WheelPicker.jsx';
import './TaskFormSheet.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: index, label }));
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: String(index + 1) }));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => ({ value: minute, label: String(minute).padStart(2, '0') }));
const PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];
const summaryFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

/** Day, Month and Year columns: dates only. Days follow the month's length (leap years included). */
function DateWheel({ dateKey, todayKey, onChange }) {
  const date = parseDateKey(dateKey);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const todayYear = Number(todayKey.slice(0, 4));

  const dayOptions = useMemo(
    () => Array.from({ length: getDaysInMonth(year, month) }, (_, index) => ({ value: index + 1, label: String(index + 1) })),
    [year, month],
  );
  const yearOptions = useMemo(() => {
    const first = Math.min(todayYear - 1, year);
    const last = Math.max(todayYear + 10, year);
    return Array.from({ length: last - first + 1 }, (_, index) => ({ value: first + index, label: String(first + index) }));
  }, [todayYear, year]);

  // Changing month or year keeps the day where possible (Jan 31 → Feb 28/29).
  const set = (nextYear, nextMonth, nextDay) => {
    const bounded = Math.min(nextDay, getDaysInMonth(nextYear, nextMonth));
    onChange(toDateKey(new Date(nextYear, nextMonth, bounded, 12)));
  };

  return (
    <WheelGroup label="Due date" className="task-wheel">
      <WheelColumn label="Day" options={dayOptions} value={day} onChange={(value) => set(year, month, value)} />
      <WheelColumn label="Month" options={MONTH_OPTIONS} value={month} onChange={(value) => set(year, value, day)} />
      <WheelColumn label="Year" options={yearOptions} value={year} onChange={(value) => set(value, month, day)} />
    </WheelGroup>
  );
}

/** Hour, Minute and AM/PM columns on a 12-hour clock. */
function TimeWheel({ time, onChange }) {
  const { hour, minute, period } = to12Hour(time);
  return (
    <WheelGroup label="Due time" className="task-wheel">
      <WheelColumn label="Hour" options={HOUR_OPTIONS} value={hour} onChange={(value) => onChange(from12Hour({ hour: value, minute, period }))} />
      <WheelColumn label="Minute" options={MINUTE_OPTIONS} value={minute} onChange={(value) => onChange(from12Hour({ hour, minute: value, period }))} />
      <WheelColumn label="AM or PM" options={PERIOD_OPTIONS} value={period} onChange={(value) => onChange(from12Hour({ hour, minute, period: value }))} />
    </WheelGroup>
  );
}

/** The next whole hour today (if before 11 PM), otherwise 9:00 AM. */
function suggestedTime(dateKey, todayKey) {
  const now = new Date();
  if (dateKey === todayKey && now.getHours() < 23) return `${String(now.getHours() + 1).padStart(2, '0')}:00`;
  return '09:00';
}

// The parts of the form that don't depend on the typed text are memoised with
// stable props, so a keystroke re-renders the sheet and its two text fields only
// (measured before: about 57 components per keystroke, every icon included).

const SheetHeader = memo(function SheetHeader({ close, titleId, isEditing, autofocusName, onSave }) {
  return (
    <header className="task-sheet-header">
      <IconButton icon={X} label="Close" size="md" onClick={close} />
      <h2 id={titleId} className="task-sheet-title" tabIndex={-1} data-autofocus={autofocusName ? undefined : true}>
        {isEditing ? 'Edit Task' : 'New Task'}
      </h2>
      <Button variant="tertiary" className="task-sheet-save" onClick={() => onSave(close)}>
        {isEditing ? 'Save' : 'Create'}
      </Button>
    </header>
  );
});

const PrioritySection = memo(function PrioritySection({ priority, onChange }) {
  return (
    <fieldset className="task-field task-priority">
      <legend className="task-label">
        Priority <span className="task-optional">Optional</span>
      </legend>
      <div className="priority-options" role="radiogroup" aria-label="Priority, optional">
        {PRIORITIES.map((option) => {
          const checked = priority === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${option.label} priority${checked ? ', selected. Tap again to clear' : ''}`}
              className={cx('priority-option', `is-${option.id}`, checked && 'is-selected')}
              onClick={() => onChange(checked ? null : option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
});

const TimeToggle = memo(function TimeToggle({ hasTime, onToggle }) {
  return (
    <div className="task-time-row">
      <button type="button" className="task-time-toggle" aria-pressed={hasTime} onClick={onToggle}>
        <Clock size={16} strokeWidth={2} aria-hidden="true" />
        {hasTime ? 'Remove time' : 'Add time'}
      </button>
    </div>
  );
});

const DueSection = memo(function DueSection({ dueRef, dueDate, dueTime, mode, todayKey, setDueDate, setDueTime, setMode }) {
  return (
    <section ref={dueRef} className="task-field task-due" aria-label="Due date and time">
      {dueDate ? (
        <>
          <div className="task-due-head">
            <span className="task-label">Due</span>
            <div className="task-due-chips">
              <button
                type="button"
                className={cx('task-chip', mode === 'date' && 'is-active')}
                aria-pressed={mode === 'date'}
                onClick={() => setMode('date')}
              >
                <span className="sr-only">Date: </span>
                {summaryFormat.format(parseDateKey(dueDate))}
              </button>
              {dueTime && (
                <button
                  type="button"
                  className={cx('task-chip', mode === 'time' && 'is-active')}
                  aria-pressed={mode === 'time'}
                  onClick={() => setMode('time')}
                >
                  <span className="sr-only">Time: </span>
                  {formatTime(dueTime)}
                </button>
              )}
            </div>
            <button
              type="button"
              className="task-due-clear"
              onClick={() => {
                setDueDate(null);
                setDueTime(null);
                setMode('date');
              }}
            >
              Clear
            </button>
          </div>
          {mode === 'time' && dueTime ? (
            <TimeWheel time={dueTime} onChange={setDueTime} />
          ) : (
            <DateWheel dateKey={dueDate} todayKey={todayKey} onChange={setDueDate} />
          )}
        </>
      ) : (
        <button
          type="button"
          className="task-due-add"
          onClick={() => {
            setDueDate(todayKey);
            setMode('date');
          }}
        >
          <CalendarDays size={18} strokeWidth={1.9} aria-hidden="true" />
          <span>Add due date</span>
          <span className="task-optional">Optional</span>
        </button>
      )}
    </section>
  );
});

const FormActions = memo(function FormActions({ isEditing, onDelete }) {
  return (
    <div className="task-actions">
      <Button variant="primary" type="submit" className="task-submit">
        {isEditing ? 'Save changes' : 'Create task'}
      </Button>
      {isEditing && (
        <Button variant="danger-ghost" icon={Trash2} onClick={onDelete}>
          Delete task
        </Button>
      )}
    </div>
  );
});

/**
 * Create or edit a task. Visible order: header, priority, Add time, notes, task
 * name, due date/time, then the primary action. On phones, when Notes or Task
 * name has focus, the sheet keeps Task name directly above the keyboard with
 * Notes right above it.
 */
export function TaskFormSheet({ task, todayKey, onSubmit, onDelete, onClose }) {
  const isEditing = Boolean(task);
  const [id] = useState(() => task?.id ?? createId());
  const [name, setName] = useState(task?.name ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [priority, setPriority] = useState(task?.priority ?? null);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? null);
  const [dueTime, setDueTime] = useState(task?.dueTime ?? null);
  const [mode, setMode] = useState('date');
  const [error, setError] = useState(null);
  const submitted = useRef(false);
  const formId = useId();
  const nameId = useId();
  const notesId = useId();
  const errorId = useId();
  const formRef = useRef(null);
  const nameFieldRef = useRef(null);
  // Tallest viewport seen while the sheet is open: the height without a keyboard.
  const fullHeight = useRef(typeof window === 'undefined' ? 0 : visibleHeight());
  const notesFieldRef = useRef(null);
  const dueRef = useRef(null);
  // New task: Task name takes focus as soon as the sheet has mounted (Modal focuses
  // [data-autofocus] in its mount effect), which opens the keyboard on Android so
  // typing can start at once. Editing opens without the keyboard.
  const autofocusName = !isEditing;

  const submit = (close) => {
    if (submitted.current) return; // a second tap while closing is ignored
    const problem = validateTaskName(name);
    if (problem) {
      setError(problem);
      nameFieldRef.current?.querySelector('input')?.focus();
      return;
    }
    submitted.current = true;
    onSubmit(id, { name, notes, priority, dueDate, dueTime: dueDate ? dueTime : null });
    close();
  };

  // Stable handle on the latest submit, for the memoised header's Save button.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const save = useCallback((close) => submitRef.current(close), []);

  const toggleTime = useCallback(() => {
    if (dueTime) {
      setDueTime(null);
      setMode('date');
      return;
    }
    const date = dueDate ?? todayKey;
    setDueDate(date);
    setDueTime(suggestedTime(date, todayKey));
    setMode('time');
    window.requestAnimationFrame(() => dueRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [dueDate, dueTime, todayKey]);

  // Keyboard-aware layout. While Notes or Task name is being typed into (and the
  // keyboard is open), the sheet's scroll area is made to end at the bottom of Task
  // name. The sheet sits on the keyboard, so Task name lands directly above it with
  // Notes right above; the due date and action scroll out of view below. If there
  // isn't room for everything above, the area scrolls, keeping the focused field
  // fully visible. When the keyboard closes the sheet returns to its normal size.
  const keepFieldsVisible = useCallback(() => {
    const form = formRef.current;
    const field = nameFieldRef.current;
    const body = field?.closest('.modal-body');
    const sheet = body?.closest('.modal');
    if (!form || !body || !sheet) return;
    // While the sheet is leaving, its geometry is frozen (see Modal): dropping the
    // typing height here made it jump to full height just as it started to close.
    if (sheet.closest('.modal-root')?.classList.contains('is-closing')) return;
    // On Android the visual viewport can report a stale height for a frame while the
    // WebView resizes (measured: 193px vs 563px), which made the sheet jump; the
    // layout viewport is always current there. iOS needs the visual viewport.
    const viewport = visibleHeight();
    fullHeight.current = Math.max(fullHeight.current, viewport);
    const keyboardOpen = fullHeight.current - viewport > 120;
    const focused = document.activeElement;
    const typing =
      keyboardOpen && focused instanceof HTMLElement && form.contains(focused) && focused.matches('input[type="text"], textarea');
    if (!typing) {
      if (sheet.classList.contains('is-typing')) {
        sheet.classList.remove('is-typing');
        sheet.style.removeProperty('--typing-height');
      }
      return;
    }
    const gap = 12;
    const chrome = sheet.offsetHeight - body.clientHeight; // header and borders
    const nameBottom = field.offsetTop + field.offsetHeight + gap; // within the scroll area
    sheet.style.setProperty('--typing-height', `${Math.ceil(chrome + nameBottom)}px`);
    sheet.classList.add('is-typing');
    // Reading clientHeight applies the new size (CSS still caps it to the space available).
    let top = nameBottom - body.clientHeight;
    const focusedField = focused.closest('.task-field') ?? focused;
    if (focusedField.offsetTop - gap < top) top = focusedField.offsetTop - gap;
    body.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(keepFieldsVisible);
    };
    // The sheet's full-screen container has exactly the viewport's size, and a
    // ResizeObserver runs after layout but before paint. Reacting there puts the
    // keyboard layout into the very frame the keyboard resizes the page; a resize
    // event + rAF arrived a frame late (measured: the sheet showed one frame at the
    // full available height before settling).
    const root = formRef.current?.closest('.modal-root');
    const observer = root && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => keepFieldsVisible()) : null;
    if (observer) observer.observe(root);
    viewport?.addEventListener('resize', schedule);
    window.addEventListener('resize', schedule);
    // A rotation changes what "no keyboard" looks like.
    const onRotate = () => {
      fullHeight.current = 0;
      schedule();
    };
    window.addEventListener('orientationchange', onRotate);
    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', onRotate);
    };
  }, [keepFieldsVisible]);

  const onFieldFocus = () => {
    // Once now (keyboard already open), and again after the keyboard has animated in.
    window.requestAnimationFrame(keepFieldsVisible);
    window.setTimeout(keepFieldsVisible, 320);
  };

  return (
    <Modal
      onClose={onClose}
      className="task-sheet"
      bodyClassName="task-sheet-body"
      header={({ close, titleId }) => (
        <SheetHeader close={close} titleId={titleId} isEditing={isEditing} autofocusName={autofocusName} onSave={save} />
      )}
    >
      {(close) => (
        <form
          ref={formRef}
          id={formId}
          className="task-form"
          noValidate
          onBlur={() => window.requestAnimationFrame(keepFieldsVisible)}
          onSubmit={(event) => {
            event.preventDefault();
            submit(close);
          }}
        >
          {/* 2. Priority (optional: nothing is selected until the user picks one) */}
          <PrioritySection priority={priority} onChange={setPriority} />

          {/* 3. Optional time */}
          <TimeToggle hasTime={Boolean(dueTime)} onToggle={toggleTime} />

          {/* 4. Notes, directly above 5. Task name */}
          <div ref={notesFieldRef} className="task-field">
            <label htmlFor={notesId} className="task-label">
              Notes <span className="task-optional">Optional</span>
            </label>
            <textarea
              id={notesId}
              className="task-input task-notes"
              value={notes}
              rows={2}
              maxLength={MAX_TASK_NOTES_LENGTH}
              placeholder="Add details"
              onFocus={onFieldFocus}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div ref={nameFieldRef} className="task-field">
            <label htmlFor={nameId} className="task-label">
              Task name
            </label>
            <input
              id={nameId}
              type="text"
              className={cx('task-input', error && 'has-error')}
              value={name}
              maxLength={MAX_TASK_NAME_LENGTH}
              placeholder="e.g. Call the dentist"
              autoComplete="off"
              enterKeyHint="done"
              required
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              data-autofocus={autofocusName ? true : undefined}
              onFocus={onFieldFocus}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
            />
            {error && (
              <p id={errorId} className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* 6. Due date, or time when Add time is on; both share one area */}
          <DueSection
            dueRef={dueRef}
            dueDate={dueDate}
            dueTime={dueTime}
            mode={mode}
            todayKey={todayKey}
            setDueDate={setDueDate}
            setDueTime={setDueTime}
            setMode={setMode}
          />

          {/* 7. Primary action */}
          <FormActions isEditing={isEditing} onDelete={onDelete} />
        </form>
      )}
    </Modal>
  );
}
