import { CalendarDays, CircleCheck, Flame, Minus, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';
import './InsightsPanel.css';

const ICONS = {
  today: CircleCheck,
  strongest: CalendarDays,
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  'trend-flat': Minus,
  streak: Flame,
  focus: Target,
};

export function InsightsPanel({ insights }) {
  return (
    <article className="card summary" aria-labelledby="summary-title">
      <header className="summary-header">
        <span className="summary-badge" aria-hidden="true">
          <Sparkles size={15} strokeWidth={1.9} />
        </span>
        <h3 id="summary-title" className="summary-title">
          Summary
        </h3>
      </header>
      <p className="summary-headline">{insights.headline}</p>
      <p className="summary-detail">{insights.detail}</p>
      {insights.items.length > 0 && (
        <ul className="summary-list">
          {insights.items.map((item) => {
            const Icon = ICONS[item.kind] ?? Sparkles;
            return (
              <li key={item.id} className="summary-item">
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
