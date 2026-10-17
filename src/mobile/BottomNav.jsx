import { CalendarDays, ChartNoAxesColumn, CircleCheckBig, Settings } from 'lucide-react';
import { tapFeedback } from '../lib/haptics.js';
import './BottomNav.css';

export const TABS = [
  { id: 'today', label: 'Today', icon: CircleCheckBig },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesColumn },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ active, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul className="bottom-nav-list">
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                className="bottom-nav-item"
                aria-current={selected ? 'page' : undefined}
                aria-controls="m-screen"
                onClick={() => {
                  if (!selected) tapFeedback();
                  onSelect(id);
                }}
              >
                <Icon size={22} strokeWidth={selected ? 2.1 : 1.8} aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
