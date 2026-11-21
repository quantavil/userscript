import type { JSX } from 'preact';

export interface IconProps {
  size?: number;
}

const Base = ({ size = 14, children }: IconProps & { children: JSX.Element | JSX.Element[] }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const Icons = {
  Fab: ({ size = 22 }: IconProps = {}) => (
    <Base size={size}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Base>
  ),
  Expand: ({ size = 15 }: IconProps = {}) => (
    <Base size={size}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </Base>
  ),
  Shrink: ({ size = 15 }: IconProps = {}) => (
    <Base size={size}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </Base>
  ),
  Close: ({ size = 15 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Base>
  ),
  File: ({ size = 14 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Base>
  ),
  Users: ({ size = 14 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Base>
  ),
  Scale: ({ size = 14 }: IconProps = {}) => (
    <Base size={size}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </Base>
  ),
  Plus: ({ size = 13 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Base>
  ),
  Copy: ({ size = 13 }: IconProps = {}) => (
    <Base size={size}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Base>
  ),
  Download: ({ size = 14 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </Base>
  ),
  Upload: ({ size = 14 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Base>
  ),
  Fill: ({ size = 14 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m3 15 2 2 4-4" />
    </Base>
  ),
  Edit: ({ size = 13 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Base>
  ),
  Trash: ({ size = 13 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </Base>
  ),
  ArrowRight: ({ size = 13 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Base>
  ),
  Check: ({ size = 13 }: IconProps = {}) => (
    <Base size={size}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  ),
};
