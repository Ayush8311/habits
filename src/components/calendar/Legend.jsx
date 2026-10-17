import './Legend.css';

const ITEMS = [
  { id: 'done', label: 'Completed' },
  { id: 'open', label: 'Not completed' },
  { id: 'today', label: 'Today' },
  { id: 'future', label: 'Upcoming' },
];

export function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      {ITEMS.map((item) => (
        <li key={item.id}>
          <span className={`legend-swatch legend-swatch-${item.id}`} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
