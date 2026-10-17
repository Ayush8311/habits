import { useId, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { extractEmoji } from '../lib/habitOptions.js';
import { Button } from './ui/Button.jsx';
import { Modal } from './ui/Modal.jsx';
import './EmojiPickerSheet.css';

const CATEGORIES = [
  { category: 'suggested', name: 'Recently used' },
  { category: 'smileys_people', name: 'Smileys & people' },
  { category: 'animals_nature', name: 'Nature' },
  { category: 'food_drink', name: 'Food & drink' },
  { category: 'activities', name: 'Activities' },
  { category: 'travel_places', name: 'Travel & places' },
  { category: 'objects', name: 'Objects' },
  { category: 'symbols', name: 'Symbols' },
  { category: 'flags', name: 'Flags' },
];

const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * A searchable sheet with every standard emoji (via emoji-picker-react, using
 * the device's own emoji font), plus a field to type or paste one directly.
 * Nothing changes until Done; closing keeps the previous choice.
 */
export default function EmojiPickerSheet({ initialEmoji, onSelect, onClose }) {
  const pasteId = useId();
  const [pending, setPending] = useState(initialEmoji ?? null);
  const [pendingName, setPendingName] = useState(null);
  const [typed, setTyped] = useState('');
  const typedEmoji = extractEmoji(typed);

  return (
    <Modal
      title="Choose an emoji"
      onClose={onClose}
      footer={(close) => (
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!pending}
            onClick={() => {
              onSelect(pending);
              close();
            }}
          >
            Done
          </Button>
        </>
      )}
    >
      <div className="emoji-sheet">
        <div className="emoji-sheet-top">
          <div className="emoji-sheet-selected" aria-live="polite">
            <span className="emoji-sheet-selected-glyph" aria-hidden="true">
              {pending ?? '·'}
            </span>
            <span className="emoji-sheet-selected-text">
              <span className="emoji-sheet-selected-label">{pending ? 'Selected' : 'Nothing selected'}</span>
              <span className={pendingName ? 'emoji-sheet-selected-name is-name' : 'emoji-sheet-selected-name'}>
                {pending ? (pendingName ?? (pending === initialEmoji ? 'Current emoji' : 'Custom emoji')) : 'Tap an emoji below'}
              </span>
            </span>
          </div>
          <div className="emoji-sheet-paste">
            <label htmlFor={pasteId} className="sr-only">
              Type or paste an emoji
            </label>
            <input
              id={pasteId}
              type="text"
              value={typed}
              placeholder="Type or paste"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby={typed && !typedEmoji ? `${pasteId}-hint` : undefined}
              onChange={(event) => {
                const value = event.target.value;
                setTyped(value);
                const emoji = extractEmoji(value);
                if (emoji) {
                  setPending(emoji);
                  setPendingName(null);
                }
              }}
            />
          </div>
        </div>
        {typed && !typedEmoji && (
          <p id={`${pasteId}-hint`} className="emoji-sheet-hint">
            That doesn’t contain an emoji.
          </p>
        )}

        <div className="emoji-sheet-picker">
          <EmojiPicker
            width="100%"
            height={360}
            emojiStyle="native"
            theme="light"
            lazyLoadEmojis
            suggestedEmojisMode="recent"
            categories={CATEGORIES}
            autoFocusSearch={!isTouch()}
            searchPlaceholder="Search emoji"
            previewConfig={{ showPreview: false }}
            skinTonePickerLocation="SEARCH"
            onEmojiClick={(data) => {
              setPending(data.emoji);
              // The longest alias is the descriptive one ("dashing away" rather than "dash").
              setPendingName(data.names?.reduce((a, b) => (b.length > a.length ? b : a), '') || null);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
