import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Heart,
  Laptop,
  Leaf,
  ListChecks,
  Moon,
  Music,
  NotebookPen,
  Sunrise,
} from 'lucide-react';

export const HABIT_ICONS = [
  { id: 'sunrise', label: 'Sunrise', Icon: Sunrise },
  { id: 'dumbbell', label: 'Workout', Icon: Dumbbell },
  { id: 'book', label: 'Book', Icon: BookOpen },
  { id: 'list', label: 'Checklist', Icon: ListChecks },
  { id: 'laptop', label: 'Laptop', Icon: Laptop },
  { id: 'notebook', label: 'Notebook', Icon: NotebookPen },
  { id: 'moon', label: 'Moon', Icon: Moon },
  { id: 'water', label: 'Water', Icon: Droplets },
  { id: 'walk', label: 'Walk', Icon: Footprints },
  { id: 'apple', label: 'Nutrition', Icon: Apple },
  { id: 'leaf', label: 'Leaf', Icon: Leaf },
  { id: 'brain', label: 'Mind', Icon: Brain },
  { id: 'music', label: 'Music', Icon: Music },
  { id: 'heart', label: 'Heart', Icon: Heart },
  { id: 'coffee', label: 'Coffee', Icon: Coffee },
  { id: 'bike', label: 'Cycling', Icon: Bike },
];

// Muted tones used for each habit's icon chip. Completion is always green.
export const HABIT_COLORS = [
  { id: 'sage', label: 'Sage', value: '#5B9A70' },
  { id: 'ocean', label: 'Ocean', value: '#4F7EA8' },
  { id: 'clay', label: 'Clay', value: '#BC7656' },
  { id: 'amber', label: 'Amber', value: '#B58C3C' },
  { id: 'plum', label: 'Plum', value: '#8A6DA6' },
  { id: 'rose', label: 'Rose', value: '#B46A7B' },
  { id: 'slate', label: 'Slate', value: '#6B7480' },
];

export const DEFAULT_ICON = 'leaf';
export const DEFAULT_COLOR = 'sage';
export const MAX_NAME_LENGTH = 40;

const iconsById = new Map(HABIT_ICONS.map((option) => [option.id, option]));
const colorsById = new Map(HABIT_COLORS.map((option) => [option.id, option]));

export const isHabitIcon = (id) => iconsById.has(id);
export const isHabitColor = (id) => colorsById.has(id);
export const getHabitIcon = (id) => (iconsById.get(id) ?? iconsById.get(DEFAULT_ICON)).Icon;
export const getHabitColor = (id) => (colorsById.get(id) ?? colorsById.get(DEFAULT_COLOR)).value;
