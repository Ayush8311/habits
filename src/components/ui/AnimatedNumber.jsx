import { useAnimatedNumber } from '../../hooks/useAnimatedNumber.js';

export function AnimatedNumber({ value, className }) {
  const display = useAnimatedNumber(value);
  return <span className={className ?? 'tabular'}>{Math.round(display)}</span>;
}
