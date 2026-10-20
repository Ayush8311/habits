import { useState } from 'react';
import { CalendarArrowUp, CalendarDays, ChevronRight } from 'lucide-react';
import { addDays, parseDateKey } from '../../lib/dates.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { DateWheel } from './TaskFormSheet.jsx';
import '../../mobile/AddNewSheet.css';
import './PostponeSheet.css';

const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const describe = (dateKey) => dayFormat.format(parseDateKey(dateKey));

/**
 * Postpone a task (from a left swipe): Tomorrow, or a day picked on the date
 * wheel and confirmed. Only the due day changes; the time, list, priority and notes
 * stay. Dates are local calendar days ("YYYY-MM-DD"), so no time zone can move them.
 */
export function PostponeSheet({ task, todayKey, onPostpone, onClose }) {
  const tomorrow = addDays(todayKey, 1);
  const [picking, setPicking] = useState(false);
  // Start the wheel the day after the task's current day (or tomorrow).
  const [dateKey, setDateKey] = useState(() =>
    task.dueDate && task.dueDate >= tomorrow ? addDays(task.dueDate, 1) : tomorrow,
  );
  const valid = dateKey > todayKey;

  return (
    <Modal title="Postpone task" description={task.name} onClose={onClose} size="sm" className="postpone-sheet">
      {(close) => (
        <div className="postpone">
          <ul className="add-new-list">
            <li>
              <button
                type="button"
                className="add-new-choice"
                data-autofocus
                onClick={() => {
                  onPostpone(task.id, tomorrow);
                  close();
                }}
              >
                <span className="add-new-icon" aria-hidden="true">
                  <CalendarArrowUp size={20} strokeWidth={2} />
                </span>
                <span className="add-new-text">
                  <span className="add-new-title">Tomorrow</span>
                  <span className="add-new-subtitle">{describe(tomorrow)}</span>
                </span>
                <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="add-new-chevron" />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="add-new-choice"
                aria-expanded={picking}
                onClick={() => setPicking((value) => !value)}
              >
                <span className="add-new-icon" aria-hidden="true">
                  <CalendarDays size={20} strokeWidth={2} />
                </span>
                <span className="add-new-text">
                  <span className="add-new-title">Pick a date</span>
                  <span className="add-new-subtitle">Choose any later day</span>
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={picking ? 'add-new-chevron postpone-chevron is-open' : 'add-new-chevron postpone-chevron'}
                />
              </button>
            </li>
          </ul>

          {picking && (
            <div className="postpone-picker">
              <DateWheel dateKey={dateKey} todayKey={todayKey} onChange={setDateKey} label="Postpone to" />
              <p className="postpone-hint" role={valid ? undefined : 'alert'}>
                {valid ? describe(dateKey) : 'Choose a day after today.'}
              </p>
              <Button
                variant="primary"
                className="postpone-confirm"
                disabled={!valid}
                onClick={() => {
                  onPostpone(task.id, dateKey);
                  close();
                }}
              >
                Postpone
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
