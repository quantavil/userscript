import { useEffect, useRef, useState } from 'preact/hooks';
import { COMMENT_MAX, COMMENT_MIN, clampCommentCount } from '../settings';
import type { Settings } from '../types';
import { iconClose } from './icons';

type BoolKey = Exclude<keyof Settings, 'commentCount' | 'prompt'>;

const ITEMS: { key: BoolKey; label: string; desc: string }[] = [
  { key: 'title', label: 'Title & link', desc: 'Problem number, title, difficulty, URL' },
  { key: 'statement', label: 'Problem statement', desc: 'Description text' },
  { key: 'examples', label: 'Examples', desc: 'Example inputs, outputs, explanations' },
  { key: 'constraints', label: 'Constraints', desc: 'Limits and follow-ups' },
  { key: 'hints', label: 'Hints', desc: 'All hints, even the collapsed ones' },
  { key: 'codeTemplate', label: 'Code template', desc: 'Starter code for the selected language' },
  { key: 'currentCode', label: 'My current code', desc: 'What is in the editor right now' },
  {
    key: 'failingTest',
    label: 'Last failed submission',
    desc: 'Test case, output and errors from your last non-accepted Submit',
  },
  { key: 'tags', label: 'Topic tags', desc: 'Array, Math, DP, ...' },
  { key: 'comments', label: 'Top comments', desc: 'Most-voted discussion comments' },
];

const stop = (e: Event) => e.stopPropagation();

interface Props {
  initial: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsModal({ initial, onChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const downOnBackdrop = useRef(false);
  const [s, setS] = useState<Settings>(initial);

  const update = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    onChange(next);
  };
  const close = () => dialog.current?.close();

  // showModal() gives a focus trap, Esc handling, an inert page behind and top-layer stacking for free.
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      class="modal"
      aria-labelledby="bl-title"
      onClose={onClose}
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) close();
      }}
      // LeetCode has global hotkeys; shadow-DOM retargeting would make our inputs look like page elements to them.
      onKeyDown={stop}
      onKeyUp={stop}
      onKeyPress={stop}
    >
      <div class="head">
        <h2 id="bl-title">Better LeetCode</h2>
        <button
          type="button"
          class="icon-btn"
          aria-label="Close"
          onClick={close}
          dangerouslySetInnerHTML={{ __html: iconClose(18) }}
        />
      </div>

      <div class="body">
        <div class="section-title">Include when copying</div>
        <div class="card">
          {ITEMS.map((it) => (
            <label class="row" key={it.key}>
              <span class="txt">
                <span class="label">{it.label}</span>
                <span class="desc">{it.desc}</span>
              </span>
              <input
                class="switch"
                type="checkbox"
                // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox already exposes its checked state
                role="switch"
                checked={s[it.key]}
                onChange={(e) => update({ [it.key]: e.currentTarget.checked } as Partial<Settings>)}
              />
            </label>
          ))}
          <label class="row">
            <span class="txt">
              <span class="label">Number of comments</span>
              <span class="desc">
                Used when "Top comments" is on ({COMMENT_MIN}-{COMMENT_MAX})
              </span>
            </span>
            <input
              class="num"
              type="number"
              min={COMMENT_MIN}
              max={COMMENT_MAX}
              disabled={!s.comments}
              value={s.commentCount}
              // onChange (not onInput): fires on blur/Enter, so the field can be cleared while typing.
              onChange={(e) => {
                const el = e.currentTarget;
                const v = el.value.trim() === '' ? s.commentCount : clampCommentCount(el.value);
                el.value = String(v);
                update({ commentCount: v });
              }}
            />
          </label>
        </div>

        <label class="section-title" for="bl-prompt">
          Custom prompt
        </label>
        <textarea
          id="bl-prompt"
          placeholder="e.g. Explain the approach step by step, then give an optimal {{language}} solution."
          value={s.prompt}
          onInput={(e) => update({ prompt: e.currentTarget.value })}
        />
        <div class="hint">
          Added at the top of the copied Markdown. Variables: <code>{'{{title}}'}</code> <code>{'{{id}}'}</code>{' '}
          <code>{'{{difficulty}}'}</code> <code>{'{{language}}'}</code>
        </div>
      </div>

      <div class="foot">
        <button type="button" class="btn primary" onClick={close}>
          Done
        </button>
      </div>
    </dialog>
  );
}
