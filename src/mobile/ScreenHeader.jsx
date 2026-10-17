import { cx } from '../lib/classNames.js';
import './ScreenHeader.css';

/**
 * Large-title header used at the top of every mobile screen. `wideEyebrow` gives
 * the eyebrow its own full-width line, so a long one (Today's full date) never
 * wraps however wide the actions beside the title become.
 */
export function ScreenHeader({ eyebrow, title, subtitle, actions, wideEyebrow = false }) {
  return (
    <header className={cx('screen-header', wideEyebrow && 'screen-header--wide-eyebrow')}>
      <div className="screen-header-text">
        {eyebrow && <p className="screen-header-eyebrow">{eyebrow}</p>}
        <h1 className="screen-header-title">{title}</h1>
        {subtitle && <p className="screen-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="screen-header-actions">{actions}</div>}
    </header>
  );
}
