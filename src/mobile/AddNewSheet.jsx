import { ChevronRight, ListTodo, Repeat } from 'lucide-react';
import { Modal } from '../components/ui/Modal.jsx';
import './AddNewSheet.css';

const CHOICES = [
  { id: 'habit', icon: Repeat, title: 'Habit', subtitle: 'Build a routine' },
  { id: 'task', icon: ListTodo, title: 'Task', subtitle: 'Get something done' },
];

/** "Add new": exactly two choices. The chosen form opens once this sheet has closed. */
export function AddNewSheet({ onChoose, onClose }) {
  return (
    <Modal title="Add new" onClose={onClose} size="sm">
      {(close) => (
        <ul className="add-new-list">
          {CHOICES.map(({ id, icon: Icon, title, subtitle }) => (
            <li key={id}>
              <button
                type="button"
                className="add-new-choice"
                data-autofocus={id === 'habit' ? true : undefined}
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
