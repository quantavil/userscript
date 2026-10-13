/**
 * @license GPL-3.0-or-later
 *
 * Super Chess Bot - Consolidated SVG iconography
 */

import type { OpeningStyle } from '../chess/types';

export function KnightIcon() {
  return (
    <svg
      class="panel-mark-icon"
      viewBox="0 0 45 45"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12 0 0 1.89-1.9 2-3.5-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5l2 0s.78-1.99 2.5-3c1 0 1 3 1 3z"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <circle cx="15" cy="14" r="1.5" fill="var(--ink)" stroke="none" />
      <path d="M14 39v2h24v-2" stroke="currentColor" stroke-width="1.5" />
    </svg>
  );
}

export function PowerIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4.5" />
      <path d="M4.2 4.5a5.5 5.5 0 1 0 7.6 0" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-6" />
    </svg>
  );
}

export function ClearIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5h11" />
      <path d="M6 2.5h4" />
      <path d="M4.5 4.5l.8 8.4a1.2 1.2 0 0 0 1.2 1.1h3a1.2 1.2 0 0 0 1.2-1.1l.8-8.4" />
      <path d="M7 7.5v3.5M9 7.5v3.5" />
    </svg>
  );
}

export function Chevron() {
  return (
    <svg class="panel-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function IconDualShields() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 18s5-2.5 5-6.5V7.5l-5-2-5 2V11.5c0 4 5 6.5 5 6.5z" />
      <path d="M12 9v5M9.5 11.5h5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconScale() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M7 20h10M6 6l6-1 6 1M12 3v17M9 12l-3-6-3 6a3 3 0 0 0 6 0M21 12l-3-6-3 6a3 3 0 0 0 6 0" />
    </svg>
  );
}

function IconSword() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m11 19-6-6" />
      <path d="m5 21-2-2" />
      <path d="m8 16-4 4" />
      <path d="M9.5 17.5 20.414 6.586A2 2 0 0 0 21 5.172V3h-2.172a2 2 0 0 0-1.414.586L6.5 14.5" />
    </svg>
  );
}

function IconDualSwordsSparks() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m13 19 6-6" />
      <path d="M14.5 17.5 3.586 6.586A2 2 0 0 1 3 5.172V3h2.172a2 2 0 0 1 1.414.586L17.5 14.5" />
      <path d="m14.828 6.172 2.586-2.586A2 2 0 0 1 18.828 3H21v2.172a2 2 0 0 1-.586 1.414l-2.586 2.586" />
      <path d="m16 16 4 4" />
      <path d="m19 21 2-2" />
      <path d="m5 14 4 4" />
      <path d="m5 21-2-2" />
      <path d="m7.5 16.5-3.5 3.5" />
    </svg>
  );
}

export function OpeningStyleIcon({ style }: { style: OpeningStyle }) {
  switch (style) {
    case 'hyper-defensive':
      return <IconDualShields />;
    case 'defensive':
      return <IconShield />;
    case 'balanced':
      return <IconScale />;
    case 'aggressive':
      return <IconSword />;
    case 'hyper-aggressive':
      return <IconDualSwordsSparks />;
  }
}

export function BrainIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
    </svg>
  );
}

export function LightningIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
