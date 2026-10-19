import { memo } from 'react';
import { CalendarDays, ChartNoAxesColumn, CircleCheckBig, ListTodo, Settings } from 'lucide-react';
import { tapFeedback } from '../lib/haptics.js';
import './BottomNav.css';

// Tasks first (leftmost). In the Combined layout the Tasks tab is left out.
export const TABS = [
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'today', label: 'Today', icon: CircleCheckBig },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesColumn },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/** `tabs` are the destinations of the current page layout (see TABS). Memoised: it
 *  re-renders only when the active tab or the layout changes. */
export const BottomNav = memo(function BottomNav({ tabs = TABS, active, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul className="bottom-nav-list" style={{ '--tab-count': tabs.length }}>
        {tabs.map(({ id, label, icon: Icon }) => {
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
});
