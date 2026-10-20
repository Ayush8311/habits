import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cx } from '../../lib/classNames.js';
import { MAX_LIST_NAME_LENGTH, validateListName } from '../../lib/tasks.js';
import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import '../HabitFormModal.css';

/**
 * Create a task list (name field focused, keyboard up) or rename one (opens without
 * the keyboard, like every other editor). `existingNames` are lower-cased names of
 * the other lists, so two lists can't share a name.
 */
export function TaskListSheet({ list, existingNames, onSubmit, onDelete, onClose }) {
  const isEditing = Boolean(list);
  const [name, setName] = useState(list?.name ?? '');
  const [error, setError] = useState(null);
  const formId = useId();
  const nameId = useId();
  const errorId = useId();

  return (
    <Modal
      title={isEditing ? 'Rename list' : 'New list'}
      description={isEditing ? null : 'Group related tasks, like Errands or Work.'}
      onClose={onClose}
      size="sm"
      footer={(close) => (
        <>
          {isEditing && (
            <>
              <Button variant="danger-ghost" icon={Trash2} onClick={onDelete}>
                Delete
              </Button>
              <span className="modal-footer-spacer" />
            </>
          )}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId}>
            {isEditing ? 'Save' : 'Create list'}
          </Button>
        </>
      )}
    >
      {(close) => (
        <form
          id={formId}
          className="habit-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const problem = validateListName(name, existingNames);
            if (problem) {
              setError(problem);
              event.currentTarget.querySelector(`#${CSS.escape(nameId)}`).focus();
              return;
            }
            onSubmit(name.trim());
            close();
          }}
        >
          <div className="field">
            <label htmlFor={nameId} className="field-label">
              Name
            </label>
            <div className={cx('name-input', error && 'has-error')}>
              <input
                id={nameId}
                type="text"
                value={name}
                maxLength={MAX_LIST_NAME_LENGTH}
                placeholder="e.g. Errands"
                autoComplete="off"
                enterKeyHint="done"
                data-autofocus={isEditing ? undefined : true}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
              />
              <span className="name-count tabular" aria-hidden="true">
                {name.trim().length}/{MAX_LIST_NAME_LENGTH}
              </span>
            </div>
            {error && (
              <p id={errorId} className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
