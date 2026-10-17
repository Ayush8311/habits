import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, IconButton } from './ui/Button.jsx';
import './MonthNavigation.css';

export function MonthNavigation({ onPrevious, onNext, onToday, isShowingToday }) {
  return (
    <div className="month-nav" role="group" aria-label="Change month">
      <div className="month-nav-arrows">
        <IconButton icon={ChevronLeft} label="Previous month" size="sm" onClick={onPrevious} />
        <IconButton icon={ChevronRight} label="Next month" size="sm" onClick={onNext} />
      </div>
      <Button variant="secondary" size="sm" onClick={onToday} disabled={isShowingToday}>
        Today
      </Button>
    </div>
  );
}
