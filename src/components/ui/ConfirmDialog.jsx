import { Button } from './Button.jsx';
import { Modal } from './Modal.jsx';

export function ConfirmDialog({ title, message, confirmLabel, tone = 'danger', hideCancel = false, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      description={message}
      onClose={onClose}
      size="sm"
      role="alertdialog"
      footer={(close) => (
        <>
          {!hideCancel && (
            <Button variant="ghost" onClick={close} data-autofocus>
              Cancel
            </Button>
          )}
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              close();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      )}
    />
  );
}
