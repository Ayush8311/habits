import { cx } from '../../lib/classNames.js';
import { formatFullDate } from '../../lib/dates.js';
import { CompletionButton } from './CompletionButton.jsx';
import { HabitLabel } from './HabitLabel.jsx';

export function HabitRow({ habit, row, days, todayKey, record, stats, activeCell, buttonSize, onToggle, onEdit, onFocusCell }) {
  return (
    <tr className="grid-row">
      <th scope="row" className="grid-habit">
        <HabitLabel habit={habit} progress={stats.progress} streak={stats.streak} onEdit={onEdit} />
      </th>
      {days.map((day, col) => {
        const isToday = day.key === todayKey;
        return (
          <td key={day.key} className={cx('grid-cell', day.isWeekend && 'is-weekend', isToday && 'is-today')}>
            <CompletionButton
              done={record?.[day.key] === true}
              future={day.key > todayKey}
              today={isToday}
              size={buttonSize}
              label={`${habit.name}, ${formatFullDate(day.key)}`}
              onToggle={() => onToggle(habit.id, day.key)}
              onFocus={() => onFocusCell(row, col)}
              tabIndex={activeCell.row === row && activeCell.col === col ? 0 : -1}
              data-cell={`${row}:${col}`}
            />
          </td>
        );
      })}
    </tr>
  );
}
