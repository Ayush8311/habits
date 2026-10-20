import { ChevronRight, ListTodo, Repeat } from 'lucide-react';
import { Modal } from '../components/ui/Modal.jsx';
import './AddNewSheet.css';

const CHOICES = [
  { id: 'habit', icon: Repeat, title: 'Habit', subtitle: 'Build a routine' },
  { id: 'task', icon: ListTodo, title: 'Task', subtitle: 'Get something done' },
];

/** "Add new": exactly two choices, in the order chosen in Settings (Habit first by
 *  default). The chosen form opens once this sheet has closed. */
export function AddNewSheet({ order = 'habits-first', onChoose, onClose }) {
  const choices = order === 'tasks-first' ? [...CHOICES].reverse() : CHOICES;
  return (
    <Modal title="Add new" onClose={onClose} size="sm">
      {(close) => (
        <ul className="add-new-list">
          {choices.map(({ id, icon: Icon, title, subtitle }, index) => (
            <li key={id}>
              <button
                type="button"
                className="add-new-choice"
                data-autofocus={index === 0 ? true : undefined}
                aria-label={`${title}: ${subtitle}`}
                onClick={() => {
                  onChoose(id);
                  close();
                }}
              >
                <span className="add-new-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={2} />
                </span>
                <span className="add-new-text">
                  <span className="add-new-title">{title}</span>
                  <span className="add-new-subtitle">{subtitle}</span>
                </span>
                <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="add-new-chevron" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
