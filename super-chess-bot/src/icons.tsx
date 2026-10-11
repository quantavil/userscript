/**
 * @license GPL-3.0-or-later
 *
 * Super Chess Bot - Consolidated SVG iconography
 */

import type { OpeningStyle } from './types/chess';

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
      width="22"
      height="18"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M7 2L2.5 4v4.5c0 4 2.8 6.8 4.5 7.8 1.7-1 4.5-3.8 4.5-7.8V4L7 2z" opacity="0.6" />
      <path d="M17 3l-4.5 2v4.5c0 4 2.8 6.8 4.5 7.8 1.7-1 4.5-3.8 4.5-7.8V5L17 3z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2L6 4.5v5.5c0 5 4.5 8.5 6 10 1.5-1.5 6-5 6-10V4.5L12 2z" />
    </svg>
  );
}

function IconScale() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v15M8 18h8M4 7h16" />
      <path d="M4 7l-2.5 5.5h5L4 7zM20 7l-2.5 5.5h5L20 7z" />
    </svg>
  );
}

function IconSword() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2l-9.5 9.5M15 2l3 3M7.5 12.5l2 2M6 14l-3 3M4 18l2-2" />
    </svg>
  );
}

function IconDualSwordsSparks() {
  return (
    <svg
      width="22"
      height="18"
      viewBox="0 0 24 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 3l16 14M17 19l3-3M3 5l2 2" />
      <path d="M20 3L4 17M7 19l-3-3M21 5l-2 2" />
      <path d="M12 1v3M10 2.5h4" stroke-width="1.4" />
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
