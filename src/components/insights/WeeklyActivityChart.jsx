import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFullDate } from '../../lib/dates.js';
import { toPercent } from '../../lib/stats.js';
import { useChartTheme } from './chartTheme.js';
import './WeeklyActivityChart.css';

function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{formatFullDate(day.key)}</p>
      <p className="chart-tooltip-value">
        {day.done} of {day.total} habits
        {day.rate !== null && <span> · {toPercent(day.rate)}%</span>}
      </p>
    </div>
  );
}

// Evenly spaced whole-number ticks that always end on the habit count.
function getTicks(max) {
  const step = Array.from({ length: max }, (_, index) => index + 1).find(
    (candidate) => max % candidate === 0 && max / candidate <= 4,
  );
  return Array.from({ length: max / step + 1 }, (_, index) => index * step);
}

export function WeeklyActivityChart({ data, habitCount }) {
  const chartTheme = useChartTheme();
  const description = data.map((day) => `${day.fullLabel}: ${day.done} of ${day.total}`).join('; ');

  return (
    <div className="activity-chart" role="img" aria-label={`Habits completed over the last seven days. ${description}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={chartTheme.grid} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fill: chartTheme.tick, fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, Math.max(habitCount, 1)]}
            ticks={getTicks(Math.max(habitCount, 1))}
            interval={0}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
            width={40}
            tick={{ fill: chartTheme.tick, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: chartTheme.cursor }}
            content={<ActivityTooltip />}
            isAnimationActive={false}
          />
          <Bar
            dataKey="done"
            radius={[6, 6, 6, 6]}
            maxBarSize={40}
            background={{ fill: chartTheme.track, radius: 6 }}
            // Recharts animates bars by re-rendering React every frame (46 commits and a
            // 50 ms task when Insights opened, measured on the phone); the chart fades
            // in with CSS instead (WeeklyActivityChart.css).
            isAnimationActive={false}
          >
            {data.map((day) => (
              <Cell key={day.key} fill={day.isToday ? chartTheme.barToday : chartTheme.bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
