import { cx } from '../../lib/classNames.js';
import './Button.css';

export function Button({ variant = 'secondary', size = 'md', icon: Icon, children, className, ...props }) {
  return (
    <button type="button" className={cx('btn', `btn-${variant}`, `btn-${size}`, className)} {...props}>
      {Icon && <Icon size={size === 'sm' ? 15 : 16} strokeWidth={2} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon: Icon, label, size = 'md', className, ...props }) {
  return (
    <button
      type="button"
      className={cx('icon-btn', `icon-btn-${size}`, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={size === 'sm' ? 16 : 18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
