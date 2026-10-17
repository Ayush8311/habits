import './ScreenHeader.css';

/** Large-title header used at the top of every mobile screen. */
export function ScreenHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="screen-header">
      <div className="screen-header-text">
        {eyebrow && <p className="screen-header-eyebrow">{eyebrow}</p>}
        <h1 className="screen-header-title">{title}</h1>
        {subtitle && <p className="screen-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="screen-header-actions">{actions}</div>}
    </header>
  );
}
