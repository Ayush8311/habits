import { useMemo } from 'react';
import { BarChart3, CalendarCheck2, Flame, Trophy } from 'lucide-react';
import { HabitIcon } from '../../components/calendar/HabitIcon.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { InsightsPanel } from '../../components/insights/InsightsPanel.jsx';
import { StatTile } from '../../components/insights/StatTile.jsx';
import { WeeklyActivityChart } from '../../components/insights/WeeklyActivityChart.jsx';
import { ProgressRing } from '../../components/ProgressRing.jsx';
import {
  formatMonthDay,
  formatMonthName,
  formatWeekRange,
  formatWeekday,
  getMonthDays,
  getMonthOf,
  getRecentDays,
} from '../../lib/dates.js';
import { buildInsights } from '../../lib/insights.js';
import {
  countCompletedOn,
  countPerfectDays,
  countTrackedOn,
  eligibleKeys,
  getDailySeries,
  getHabitProgress,
  getHabitStreaks,
  getOverallProgress,
  getStreakLeaders,
  getWeekComparison,
  getWeeklyRates,
  toPercent,
} from '../../lib/stats.js';
import { ScreenHeader } from '../ScreenHeader.jsx';
import './InsightsScreen.css';

const days = (count) => (count === 1 ? 'day' : 'days');

function weekTrend(week) {
  if (week.delta === null) return null;
  const points = Math.round(week.delta * 100);
  if (points === 0) return { direction: 'flat', label: 'Same as last week' };
  return { direction: points > 0 ? 'up' : 'down', label: `${points > 0 ? '+' : '−'}${Math.abs(points)} pts` };
}

function useInsightsData(habits, completions, todayKey) {
  return useMemo(() => {
    const { year, monthIndex } = getMonthOf(todayKey);
    const monthKeys = eligibleKeys(getMonthDays(year, monthIndex).map((day) => day.key), todayKey);
    const week = getWeekComparison(habits, completions, todayKey);
    const leaders = getStreakLeaders(habits, completions, todayKey);
    const month = getOverallProgress(habits, completions, monthKeys);

    const chart = getDailySeries(habits, completions, getRecentDays(todayKey, 7)).map((day) => ({
      ...day,
      label: day.key === todayKey ? 'Today' : formatWeekday(day.key, 'short'),
      fullLabel: formatWeekday(day.key, 'long'),
      isToday: day.key === todayKey,
    }));

    const perHabit = habits
      .map((habit) => ({
        habit,
        progress: getHabitProgress(habit, completions, monthKeys),
        streak: getHabitStreaks(habit.id, completions, todayKey),
      }))
      .sort((a, b) => (b.progress.rate ?? 0) - (a.progress.rate ?? 0));

    // Personal bests, each only shown when there is real data behind it.
    const bestWeek = getWeeklyRates(habits, completions, todayKey, 8)
      .filter((entry) => entry.done > 0)
      .reduce((best, entry) => (!best || entry.rate > best.rate ? entry : best), null);
    const thirtyDays = getRecentDays(todayKey, 30).map((day) => day.key);
    const bestDay = thirtyDays.reduce(
      (best, key) => {
        const done = countCompletedOn(habits, completions, key);
        return done > best.done ? { key, done, total: countTrackedOn(habits, completions, key) } : best;
      },
      { key: null, done: 0, total: 0 },
    );

    return {
      monthKeys,
      week,
      leaders,
      month,
      chart,
      perHabit,
      todayDone: countCompletedOn(habits, completions, todayKey),
      perfectDays: countPerfectDays(habits, completions, monthKeys),
      bestWeek,
      bestDay,
      insights: buildInsights({ habits, completions, todayKey, week, monthKeys }),
    };
  }, [habits, completions, todayKey]);
}

export function InsightsScreen({ store, todayKey }) {
  const { habits, completions } = store.state;
  const data = useInsightsData(habits, completions, todayKey);
  const { week, leaders, month, perHabit } = data;
  const monthName = formatMonthName(todayKey);

  if (habits.length === 0) {
    return (
      <div className="insights-screen">
        <ScreenHeader title="Insights" />
        <div className="m-card">
          <EmptyState
            icon={BarChart3}
            title="No insights yet"
            message="Add a habit and check in for a few days. Your progress will appear here."
          />
        </div>
      </div>
    );
  }

  const todayRate = data.todayDone / habits.length;
  const bests = [
    leaders.best.habit && {
      label: 'Longest streak',
      value: `${leaders.best.value} ${days(leaders.best.value)}`,
      detail: leaders.best.habit.name,
    },
    data.bestWeek && {
      label: 'Best week',
      value: `${toPercent(data.bestWeek.rate)}%`,
      detail: formatWeekRange(data.bestWeek.start),
    },
    data.bestDay.key && {
      label: 'Best day, last 30 days',
      value: `${data.bestDay.done} of ${data.bestDay.total}`,
      detail: formatMonthDay(data.bestDay.key),
    },
    {
      label: `Perfect days in ${monthName}`,
      value: String(data.perfectDays),
      detail: 'Every habit done',
    },
  ].filter(Boolean);

  return (
    <div className="insights-screen">
      <ScreenHeader eyebrow="Your progress" title="Insights" />

      <div className="insights-tiles">
        <StatTile
          icon={CalendarCheck2}
          label="Today"
          value={toPercent(todayRate)}
          unit="%"
          caption={`${data.todayDone} of ${habits.length} done`}
        />
        <StatTile
          icon={BarChart3}
          label="This week"
          value={toPercent(week.thisWeek.rate)}
          unit="%"
          trend={weekTrend(week)}
          caption={week.hasPrevious ? 'vs last week' : `${week.thisWeek.done} check-ins`}
        />
        <StatTile
          icon={Flame}
          label="Current streak"
          value={leaders.current.value}
          unit={days(leaders.current.value)}
          caption={leaders.current.habit ? leaders.current.habit.name : 'Check in to start one'}
        />
        <StatTile
          icon={Trophy}
          label="Longest streak"
          value={leaders.best.value}
          unit={days(leaders.best.value)}
          caption={leaders.best.habit ? leaders.best.habit.name : 'Nothing recorded yet'}
        />
      </div>

      <section className="m-card consistency" aria-labelledby="consistency-title">
        <ProgressRing value={month.rate} size={76} stroke={8} />
        <div>
          <h2 id="consistency-title" className="consistency-title">
            {monthName} consistency
          </h2>
          <p className="consistency-detail">
            {month.total === 0
              ? 'No days to count yet.'
              : `${month.done} of ${month.total} possible check-ins over ${data.monthKeys.length} ${days(data.monthKeys.length)}.`}
          </p>
        </div>
      </section>

      <section className="m-section" aria-labelledby="activity-title-m">
        <h2 id="activity-title-m" className="m-section-title">
          Last 7 days
        </h2>
        <div className="m-card insights-chart">
          <WeeklyActivityChart data={data.chart} habitCount={habits.length} />
        </div>
      </section>

      <section className="m-section" aria-labelledby="habit-progress-title">
        <h2 id="habit-progress-title" className="m-section-title">
          By habit · {monthName}
        </h2>
        <ul className="m-card habit-progress">
          {perHabit.map(({ habit, progress, streak }) => {
            const percent = toPercent(progress.rate);
            return (
              <li key={habit.id} className="habit-progress-row">
                <HabitIcon icon={habit.icon} color={habit.color} />
                <div className="habit-progress-body">
                  <div className="habit-progress-top">
                    <span className="habit-progress-name">{habit.name}</span>
                    <span className="habit-progress-percent tabular">{percent === null ? '—' : `${percent}%`}</span>
                  </div>
                  <div
                    className="habit-progress-bar"
                    role="progressbar"
                    aria-label={`${habit.name} this month`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent ?? 0}
                  >
                    <span style={{ transform: `scaleX(${progress.rate ?? 0})` }} />
                  </div>
                  <p className="habit-progress-meta tabular">
                    {progress.done}/{progress.total} days · streak {streak.current} · best {streak.best}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="m-section" aria-labelledby="bests-title">
        <h2 id="bests-title" className="m-section-title">
          Personal bests
        </h2>
        <dl className="m-card bests">
          {bests.map((best) => (
            <div key={best.label} className="bests-row">
              <dt>
                <span className="bests-label">{best.label}</span>
                <span className="bests-detail">{best.detail}</span>
              </dt>
              <dd className="tabular">{best.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="m-section insights-summary">
        <InsightsPanel insights={data.insights} />
      </section>
    </div>
  );
}
