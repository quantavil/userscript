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
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 2.5L2 4.5v5c0 4 2.8 6.5 4.5 7.5 1.7-1 4.5-3.5 4.5-7.5v-5L6.5 2.5z" />
      <path d="M17.5 2.5L13 4.5v5c0 4 2.8 6.5 4.5 7.5 1.7-1 4.5-3.5 4.5-7.5v-5L17.5 2.5z" />
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
      <path d="M12 2L5 4.5v5.5c0 4.8 4.2 8 7 9.5 2.8-1.5 7-4.7 7-9.5V4.5L12 2z" />
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
      <path d="M19 2.5L9 12.5M16 2.5h3v3M7 9.5l4 4M7.5 14l-3.5 3.5M3 18.5l-1 1M4.5 20l-2-2" />
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
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 3.5l16 16M14 17l4-4" />
      <path d="M20 3.5L4 19.5M6 13l4 4" />
      <path d="M13 1l-3 5h3.5L11.5 11l5-6h-3.5L14.5 1z" fill="currentColor" stroke="none" />
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

export function GhostIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M9 10h.01M15 10h.01" />
      <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
    </svg>
  );
}
