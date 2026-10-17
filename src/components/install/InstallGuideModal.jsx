import { Button } from '../ui/Button.jsx';
import { Modal } from '../ui/Modal.jsx';
import { INSTALL_GUIDES } from './installGuides.js';
import './InstallGuideModal.css';

export function InstallGuideModal({ platform, onClose }) {
  const guide = INSTALL_GUIDES[platform] ?? INSTALL_GUIDES.other;
  return (
    <Modal
      title={guide.title}
      description={guide.intro}
      onClose={onClose}
      size="sm"
      footer={(close) => (
        <Button variant="primary" onClick={close} data-autofocus>
          Done
        </Button>
      )}
    >
      <ol className="install-steps">
        {guide.steps.map(({ icon: Icon, text }, index) => (
          <li key={index} className="install-step">
            <span className="install-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="install-step-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.9} />
            </span>
            <span className="install-step-text">{text}</span>
          </li>
        ))}
      </ol>
      {guide.note && <p className="install-note">{guide.note}</p>}
    </Modal>
  );
}
