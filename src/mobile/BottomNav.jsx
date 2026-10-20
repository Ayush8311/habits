import { memo } from 'react';
import { CalendarDays, ChartNoAxesColumn, CircleCheckBig, ListTodo, Settings } from 'lucide-react';
import { tapFeedback } from '../lib/haptics.js';
import './BottomNav.css';

// Every destination, by id. The ids never change (links, saved settings); the
// order comes from Settings (see tabOrder) and the Habit page's label from the
// layout: 'Habit' on Separate pages, 'Duel' when habits and tasks share the page.
export const TABS = [
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'today', label: 'Habit', icon: CircleCheckBig },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesColumn },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const TAB_BY_ID = Object.fromEntries(TABS.map((tab) => [tab.id, tab]));

/** The tab bar's items for tab ids in order (see tabOrder) and a page layout. */
export const buildTabs = (ids, layout) =>
  ids.map((id) => (id === 'today' && layout === 'combined' ? { ...TAB_BY_ID[id], label: 'Duel' } : TAB_BY_ID[id]));

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
