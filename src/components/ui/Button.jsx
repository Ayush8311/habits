import { cx } from '../../lib/classNames.js';
import './Button.css';

const ICON_SIZES = { sm: 16, md: 18, lg: 22 };

/** A pill-shaped text button. Variants: primary, secondary, ghost, tertiary, danger, danger-ghost. */
export function Button({ variant = 'secondary', size = 'md', icon: Icon, children, className, ...props }) {
  return (
    <button type="button" className={cx('btn', `btn-${variant}`, `btn-${size}`, className)} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 16} strokeWidth={2} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** A circular icon-only button. `label` is required: it is the accessible name. */
export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', className, ...props }) {
  return (
    <button
      type="button"
      className={cx('icon-btn', `icon-btn-${size}`, `icon-btn-${variant}`, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={ICON_SIZES[size]} strokeWidth={variant === 'primary' ? 2.2 : 1.8} aria-hidden="true" />
    </button>
  );
}
