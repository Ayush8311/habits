import { useMemo, useState } from 'react';
import { Plus, Sparkles, SunMedium } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ProgressRing } from '../../components/ProgressRing.jsx';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { formatFullDateWithYear } from '../../lib/dates.js';
import { buildTodayInsight } from '../../lib/insights.js';
import { countCompletedOn, getHabitStreaks, getWeekComparison } from '../../lib/stats.js';
import { HabitCheckRow } from '../HabitCheckRow.jsx';
import { ScreenHeader } from '../ScreenHeader.jsx';
import './TodayScreen.css';

export function TodayScreen({ store, todayKey, onAddHabit, onEditHabit }) {
  const { habits, completions } = store.state;
  const [editing, setEditing] = useState(false);
  const isEditing = editing && habits.length > 0;

  const done = countCompletedOn(habits, completions, todayKey);
  const total = habits.length;
  const insight = useMemo(
    () =>
      buildTodayInsight({
        habits,
        completions,
        todayKey,
        week: getWeekComparison(habits, completions, todayKey),
      }),
    [habits, completions, todayKey],
  );

  return (
    <div className="today">
      <ScreenHeader
        eyebrow={formatFullDateWithYear(todayKey)}
        title="Today"
        actions={
          <>
            {habits.length > 0 && (
              <button type="button" className="text-button" onClick={() => setEditing((value) => !value)}>
                {isEditing ? 'Done' : 'Edit'}
              </button>
            )}
            <button type="button" className="round-button" aria-label="Add habit" onClick={onAddHabit}>
              <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </>
        }
      />

      <section className="m-card today-summary" aria-label="Today’s progress">
        <ProgressRing value={total ? done / total : null} size={96} stroke={9} />
        <div className="today-summary-text">
          <p className="today-greeting">Make today count.</p>
          <p className="today-count">
            <AnimatedNumber value={done} />
            <span className="today-count-total"> of {total} done</span>
          </p>
          <p className="today-insight" aria-live="polite">
            <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
            {insight}
          </p>
        </div>
      </section>

      <section className="m-section" aria-labelledby="today-habits-title">
        <h2 id="today-habits-title" className="m-section-title">
          {isEditing ? 'Tap a habit to edit' : 'Habits'}
        </h2>
        {habits.length === 0 ? (
          <div className="m-card">
            <EmptyState
              icon={SunMedium}
              title="Nothing to track yet"
              message="Add one small habit you’d like to do most days."
              action={
                <button type="button" className="btn btn-primary btn-md" onClick={onAddHabit}>
                  <Plus size={16} strokeWidth={2} aria-hidden="true" />
                  <span>Add a habit</span>
                </button>
              }
            />
          </div>
        ) : (
          <ul className="m-card check-list">
            {habits.map((habit) => (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                done={completions[habit.id]?.[todayKey] === true}
                streak={getHabitStreaks(habit.id, completions, todayKey)}
                mode={isEditing ? 'edit' : 'toggle'}
                onToggle={() => store.toggleCompletion(habit.id, todayKey)}
                onEdit={() => onEditHabit(habit.id)}
              />
            ))}
          </ul>
        )}
        {isEditing && (
          <button type="button" className="today-add-row" onClick={onAddHabit}>
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Add habit
          </button>
        )}
      </section>
    </div>
  );
}
