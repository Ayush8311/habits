import { getDaysInMonth, getMonthId, getMonthOf, formatMonthName, formatMonthYear } from '../lib/dates.js';
import { AnimatedNumber } from './ui/AnimatedNumber.jsx';
import { MonthNavigation } from './MonthNavigation.jsx';
import { ProgressRing } from './ProgressRing.jsx';
import './MonthlyOverview.css';

function OverviewStat({ label, value, total }) {
  return (
    <div className="overview-stat">
      <dt>{label}</dt>
      <dd>
        <AnimatedNumber value={value} />
        {total !== undefined && <span className="overview-stat-total">/{total}</span>}
      </dd>
    </div>
  );
}

function describeRange(cursorKey, todayKey, eligibleDays) {
  const { year, monthIndex } = getMonthOf(cursorKey);
  const length = getDaysInMonth(year, monthIndex);
  const relation = Math.sign(getMonthId(cursorKey).localeCompare(getMonthId(todayKey)));
  if (relation > 0) return { eyebrow: 'Upcoming', caption: 'This month hasn’t started yet' };
  if (relation < 0) return { eyebrow: 'Past month', caption: `All ${length} days` };
  return { eyebrow: 'This month', caption: `${eligibleDays} of ${length} days so far` };
}

export function MonthlyOverview({
  cursorKey,
  todayKey,
  habitCount,
  todayDone,
  todayDue,
  monthProgress,
  eligibleDays,
  direction,
  onPrevious,
  onNext,
  onToday,
}) {
  const { eyebrow, caption } = describeRange(cursorKey, todayKey, eligibleDays);

  return (
    <section className="card overview" aria-labelledby="overview-title">
      <div className="overview-heading">
        <div className="overview-heading-text">
          <p className="overview-eyebrow">{eyebrow}</p>
          <h1 id="overview-title" key={getMonthId(cursorKey)} className={`overview-title slide-${direction}`}>
            {formatMonthYear(cursorKey)}
          </h1>
        </div>
        <MonthNavigation
          onPrevious={onPrevious}
          onNext={onNext}
          onToday={onToday}
          isShowingToday={cursorKey === todayKey}
        />
      </div>

      <div className="overview-metrics">
        <dl className="overview-stats">
          <OverviewStat label="Habits" value={habitCount} />
          <OverviewStat label="Done today" value={todayDone} total={todayDue} />
          <OverviewStat label={`Check-ins in ${formatMonthName(cursorKey)}`} value={monthProgress.done} />
        </dl>
        <div className="overview-progress">
          <ProgressRing value={monthProgress.rate} size={84} stroke={8} />
          <div className="overview-progress-text">
            <span className="overview-progress-label">Completion</span>
            <span className="overview-progress-caption">{caption}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
