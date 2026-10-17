import { useMemo } from 'react';
import { BarChart3, CalendarCheck2, Flame, Trophy } from 'lucide-react';
import { formatMonthName, formatWeekday, getMonthDays, getMonthOf, getRecentDays } from '../../lib/dates.js';
import { buildInsights } from '../../lib/insights.js';
import {
  eligibleKeys,
  getDailySeries,
  getOverallProgress,
  getStreakLeaders,
  getWeekComparison,
  toPercent,
} from '../../lib/stats.js';
import { EmptyState } from '../EmptyState.jsx';
import { InsightsPanel } from './InsightsPanel.jsx';
import { StatTile } from './StatTile.jsx';
import { WeeklyActivityChart } from './WeeklyActivityChart.jsx';
import './InsightsSection.css';

const days = (count) => (count === 1 ? 'day' : 'days');

function weekTrend(week) {
  if (week.delta === null) return null;
  const points = Math.round(week.delta * 100);
  if (points === 0) return { direction: 'flat', label: 'Same as last week' };
  return { direction: points > 0 ? 'up' : 'down', label: `${points > 0 ? '+' : '−'}${Math.abs(points)} pts` };
}

/**
 * Week, streak and chart figures are always relative to today. The monthly
 * total follows the month selected in the overview.
 */
export function InsightsSection({ habits, completions, todayKey, cursorKey }) {
  const data = useMemo(() => {
    const week = getWeekComparison(habits, completions, todayKey);
    const leaders = getStreakLeaders(habits, completions, todayKey);

    const { year, monthIndex } = getMonthOf(cursorKey);
    const selectedMonthKeys = eligibleKeys(
      getMonthDays(year, monthIndex).map((day) => day.key),
      todayKey,
    );
    const month = getOverallProgress(habits, completions, selectedMonthKeys);

    const { year: thisYear, monthIndex: thisMonth } = getMonthOf(todayKey);
    const currentMonthKeys = eligibleKeys(getMonthDays(thisYear, thisMonth).map((day) => day.key), todayKey);

    const chart = getDailySeries(habits, completions, getRecentDays(todayKey, 7)).map((day) => ({
      ...day,
      label: day.key === todayKey ? 'Today' : formatWeekday(day.key, 'short'),
      fullLabel: formatWeekday(day.key, 'long'),
      isToday: day.key === todayKey,
    }));
    const chartTotals = chart.reduce(
      (sum, day) => ({ done: sum.done + day.done, total: sum.total + day.total }),
      { done: 0, total: 0 },
    );

    return {
      week,
      leaders,
      month,
      monthHasStarted: selectedMonthKeys.length > 0,
      chart,
      chartTotals,
      insights: buildInsights({ habits, completions, todayKey, week, monthKeys: currentMonthKeys }),
    };
  }, [habits, completions, todayKey, cursorKey]);

  const { week, leaders, month, chart, chartTotals } = data;
  const monthName = formatMonthName(cursorKey);
  const hasHabits = habits.length > 0;

  const weekCaption = !hasHabits
    ? 'No habits yet'
    : week.hasPrevious
      ? 'vs last week'
      : `${week.thisWeek.done} of ${week.thisWeek.total} check-ins`;

  return (
    <section className="insights" aria-labelledby="insights-title">
      <div className="insights-heading">
        <h2 id="insights-title" className="section-title">
          Insights
        </h2>
        <p className="section-subtitle">Calculated from your check-ins</p>
      </div>

      <div className="insights-grid">
        <StatTile
          icon={BarChart3}
          label="This week"
          value={toPercent(week.thisWeek.rate)}
          unit="%"
          trend={weekTrend(week)}
          caption={weekCaption}
        />
        <StatTile
          icon={Flame}
          label="Current streak"
          value={hasHabits ? leaders.current.value : null}
          unit={days(leaders.current.value)}
          caption={leaders.current.habit ? leaders.current.habit.name : 'Check in today to start one'}
        />
        <StatTile
          icon={Trophy}
          label="Best streak"
          value={hasHabits ? leaders.best.value : null}
          unit={days(leaders.best.value)}
          caption={leaders.best.habit ? leaders.best.habit.name : 'Nothing recorded yet'}
        />
        <StatTile
          icon={CalendarCheck2}
          label={`Completed in ${monthName}`}
          value={hasHabits && data.monthHasStarted ? month.done : null}
          unit={month.done === 1 ? 'check-in' : 'check-ins'}
          caption={
            !data.monthHasStarted
              ? 'This month hasn’t started'
              : month.rate === null
                ? 'No habits yet'
                : `${toPercent(month.rate)}% of ${month.total} possible`
          }
        />

        <article className="card activity" aria-labelledby="activity-title">
          <header className="activity-header">
            <div>
              <h3 id="activity-title" className="activity-title">
                Last 7 days
              </h3>
              <p className="activity-subtitle">
                {chartTotals.done === 0
                  ? 'No check-ins in the last seven days'
                  : `${chartTotals.done} check-ins · ${toPercent(chartTotals.done / chartTotals.total)}% complete`}
              </p>
            </div>
          </header>
          {hasHabits ? (
            <WeeklyActivityChart data={chart} habitCount={habits.length} />
          ) : (
            <EmptyState title="No activity yet" message="Your daily progress will appear here." />
          )}
        </article>

        <InsightsPanel insights={data.insights} />
      </div>
    </section>
  );
}
