import { useSignal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

const OTHER = '\u0000other';

interface Props {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  /** Marked "(default)" in the list. */
  defaultModel: string;
  /** When set, an extra first option with value '' (e.g. "Same as the vision model"). */
  emptyLabel?: string;
  placeholder: string;
  onChange: (model: string) => void;
  /** Resets "Other…" mode, e.g. when the provider changes. */
  resetKey: string;
  fetch?: { run: () => void; busy: boolean; disabled: boolean; title: string };
  hint: ComponentChildren;
}

/**
 * Model chooser: a real dropdown of known models plus "Other…" for any id. A <datalist> was
 * used before, but it filters by the current value and so showed only the selected model.
 */
export function ModelPicker(p: Props) {
  const custom = useSignal(false);
  useEffect(() => {
    custom.value = false;
  }, [p.resetKey]);

  const known = p.value && !p.options.includes(p.value) ? [p.value, ...p.options] : [...p.options];
  const typing = custom.value || (known.length === 0 && p.emptyLabel === undefined);

  return (
    <div class="field">
      <label for={p.id}>{p.label}</label>
      <div class="row">
        {typing ? (
          <input
            id={p.id}
            class="grow mono"
            type="text"
            autocomplete="off"
            spellcheck={false}
            value={p.value}
            placeholder={p.placeholder}
            onInput={(e) => p.onChange(e.currentTarget.value)}
          />
        ) : (
          <select
            id={p.id}
            class="grow mono"
            value={p.value}
            onChange={(e) => {
              const v = e.currentTarget.value;
              if (v === OTHER) custom.value = true;
              else p.onChange(v);
            }}
          >
            {p.emptyLabel !== undefined && <option value="">{p.emptyLabel}</option>}
            {known.map((m) => (
              <option key={m} value={m}>
                {m}
                {m === p.defaultModel ? ' (default)' : ''}
              </option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
        )}
        {p.fetch && (
          <button
            type="button"
            class="btn sm"
            disabled={p.fetch.disabled || p.fetch.busy}
            title={p.fetch.title}
            onClick={() => {
              custom.value = false;
              p.fetch?.run();
            }}
          >
            {p.fetch.busy ? '…' : 'Fetch list'}
          </button>
        )}
      </div>
      <p class="hint">{p.hint}</p>
    </div>
  );
}
