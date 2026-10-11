import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './icons.tsx';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

/** Native <dialog>: top-layer stacking, focus trap and Escape handling for free. */
export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is a pointer shortcut; keyboard users have Escape and the Close button.
    <dialog
      ref={ref}
      class="modal"
      aria-label={title}
      // Only user-initiated closes (Escape) count; programmatic close() has already flipped `open`.
      onClose={() => openRef.current && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" class="icon" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>
      </header>
      {open && children}
    </dialog>
  );
}
