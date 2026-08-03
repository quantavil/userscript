// src/ui/styles/css.ts

/**
 * Every visual value lives in a --mvc-* token. Components read tokens only;
 * a theme is a token block and nothing else. The active theme is selected by
 * `data-mvc-theme` on <html> — overlays are scattered across body and the
 * fullscreen element, so <html> is the one ancestor all of them share.
 */
const THEMES = `
        /* ── HALO (default) ────────────────────────────────────────────
           No surfaces at all. Each glyph carries its own dark outline —
           the subtitle solution. Nothing is drawn over the picture. */
        :root,
        :root[data-mvc-theme="halo"] {
            --mvc-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            --mvc-surface: transparent;
            --mvc-sheet: rgba(14, 15, 18, 0.94);
            --mvc-toast: rgba(14, 15, 18, 0.9);
            --mvc-border: 0;
            --mvc-text: #ffffff;
            --mvc-dim: rgba(255, 255, 255, 0.72);
            --mvc-accent: #ffffff;
            --mvc-fill: #ffffff;
            --mvc-on-accent: #0e0f12;
            --mvc-r-pill: 999px;
            --mvc-r-card: 16px;
            --mvc-r-sm: 8px;
            --mvc-blur: none;
            --mvc-shadow: none;
            --mvc-glow: none;
            --mvc-track: rgba(255, 255, 255, 0.42);
            --mvc-buffer: rgba(255, 255, 255, 0.6);
            --mvc-btn-on: rgba(255, 255, 255, 0.2);
            --mvc-switch-on: #ffffff;
            --mvc-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
            --mvc-dur: 0.2s;
            --mvc-glyph-shadow: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 5px rgba(0, 0, 0, 0.7));
            --mvc-frame: transparent;
            --mvc-ticks: none;
            --mvc-track-h: 3px;
        }

        /* ── HIGH CONTRAST ─────────────────────────────────────────────
           Near-opaque solids, amber, squared. Readable in sunlight and on
           washed-out panels. Zero blur, zero shadow. */
        :root[data-mvc-theme="contrast"] {
            --mvc-font: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
            --mvc-surface: rgba(8, 9, 10, 0.92);
            --mvc-sheet: rgba(8, 9, 10, 0.97);
            --mvc-toast: rgba(8, 9, 10, 0.97);
            --mvc-border: 1px solid rgba(255, 255, 255, 0.16);
            --mvc-text: #e8e6e1;
            --mvc-dim: rgba(232, 230, 225, 0.55);
            --mvc-accent: #ffb020;
            --mvc-fill: #ffb020;
            --mvc-on-accent: #150d00;
            --mvc-r-pill: 4px;
            --mvc-r-card: 6px;
            --mvc-r-sm: 2px;
            --mvc-blur: none;
            --mvc-shadow: none;
            --mvc-glow: none;
            --mvc-track: rgba(255, 255, 255, 0.16);
            --mvc-buffer: rgba(255, 255, 255, 0.32);
            --mvc-btn-on: rgba(255, 176, 32, 0.2);
            --mvc-switch-on: #ffb020;
            --mvc-ease: linear;
            --mvc-dur: 0.1s;
            --mvc-glyph-shadow: none;
            --mvc-frame: transparent;
            --mvc-ticks: none;
            --mvc-track-h: 4px;
        }

        /* ── FRAME ─────────────────────────────────────────────────────
           Halo's mechanism with a camera-gate vernacular: corner brackets,
           a 1px scrub line with frame ticks, one red playhead. */
        :root[data-mvc-theme="frame"] {
            --mvc-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            --mvc-surface: transparent;
            --mvc-sheet: rgba(12, 12, 13, 0.95);
            --mvc-toast: rgba(12, 12, 13, 0.92);
            --mvc-border: 0;
            --mvc-text: #f2f0ec;
            --mvc-dim: rgba(242, 240, 236, 0.6);
            --mvc-accent: #ff4438;
            --mvc-fill: #f2f0ec;
            --mvc-on-accent: #ffffff;
            --mvc-r-pill: 0px;
            --mvc-r-card: 0px;
            --mvc-r-sm: 0px;
            --mvc-blur: none;
            --mvc-shadow: none;
            --mvc-glow: none;
            --mvc-track: rgba(242, 240, 236, 0.28);
            --mvc-buffer: rgba(242, 240, 236, 0.45);
            --mvc-btn-on: rgba(255, 68, 56, 0.22);
            --mvc-switch-on: #ff4438;
            --mvc-ease: linear;
            --mvc-dur: 0.12s;
            --mvc-glyph-shadow: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
            --mvc-frame: rgba(242, 240, 236, 0.42);
            --mvc-ticks: repeating-linear-gradient(to right, rgba(242, 240, 236, 0.5) 0 1px, transparent 1px 100%);
            --mvc-track-h: 1px;
        }
`;

export function injectStyles(): void {
	if (document.getElementById("mvc-styles")) return;
	if (!document.head) return;
	const style = document.createElement("style");
	style.id = "mvc-styles";
	style.textContent = `
${THEMES}
        /* Top Header Bar Container.
           One filter here gives every glyph in the bar its halo in a single
           composited pass, instead of one filter per control. */
        .mvc-top-bar {
            position: fixed;
            top: 16px;
            left: 16px;
            right: 16px;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            pointer-events: none;
            filter: var(--mvc-glyph-shadow);
        }

        /* Camera-gate corner brackets — invisible unless a theme colours them.
           They fade with the rest of the chrome; left on permanently they just
           sit on the picture and distract. */
        .mvc-frame {
            position: fixed;
            pointer-events: none;
            z-index: 2147483645;
            opacity: 0;
            transition: opacity .35s ease;
        }
        .mvc-frame.visible { opacity: 1; }
        .mvc-frame i {
            position: absolute;
            width: 20px;
            height: 20px;
            border: 0 solid var(--mvc-frame);
        }
        .mvc-frame i:nth-child(1) { top: 12px; left: 12px; border-top-width: 1px; border-left-width: 1px; }
        .mvc-frame i:nth-child(2) { top: 12px; right: 12px; border-top-width: 1px; border-right-width: 1px; }
        .mvc-frame i:nth-child(3) { bottom: 12px; left: 12px; border-bottom-width: 1px; border-left-width: 1px; }
        .mvc-frame i:nth-child(4) { bottom: 12px; right: 12px; border-bottom-width: 1px; border-right-width: 1px; }

        /* Speed Control Container & Minimal Speed FAB */
        .mvc-speed-control-wrap {
            display: flex;
            align-items: center;
            pointer-events: auto;
            flex-shrink: 0;
        }

        .mvc-speed-fab {
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: var(--mvc-r-pill);
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--mvc-surface);
            color: var(--mvc-accent);
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            border: var(--mvc-border);
            box-shadow: var(--mvc-shadow);
            font-family: var(--mvc-font);
            font-size: 11px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            cursor: pointer;
            flex-shrink: 0;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.15s var(--mvc-ease), background var(--mvc-dur) var(--mvc-ease);
            padding: 0;
        }
        .mvc-speed-fab:active {
            transform: scale(0.9);
            background: var(--mvc-btn-on);
        }

        /* Stepper Pill */
        .mvc-stepper-pill {
            position: relative;
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--mvc-surface);
            color: var(--mvc-text);
            padding: 4px 8px;
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            box-shadow: var(--mvc-shadow);
            font-family: var(--mvc-font);
            font-weight: 600;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform var(--mvc-dur) var(--mvc-ease);
            touch-action: none;
            flex-shrink: 0;
        }

        /* Progress Bar (Ultra-Minimal Floating Line) */
        .mvc-progress-bar {
            flex: 1;
            min-width: 60px;
            height: 36px;
            display: flex;
            align-items: center;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 4px;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            pointer-events: auto;
            box-sizing: border-box;
            transition: opacity var(--mvc-dur) var(--mvc-ease);
        }

        .mvc-progress-track-wrap {
            position: relative;
            flex: 1;
            height: 20px;
            display: flex;
            align-items: center;
            cursor: pointer;
            touch-action: none;
        }

        /* Film-gate ticks — invisible unless a theme supplies them */
        .mvc-progress-track-wrap::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: calc(50% + 4px);
            height: 5px;
            background-image: var(--mvc-ticks);
            background-size: 8.333% 100%;
            pointer-events: none;
        }

        .mvc-progress-bg-track {
            position: absolute;
            left: 0;
            right: 0;
            height: var(--mvc-track-h);
            background: var(--mvc-track);
            border-radius: var(--mvc-r-sm);
        }

        .mvc-progress-buf-track {
            position: absolute;
            left: 0;
            height: var(--mvc-track-h);
            background: var(--mvc-buffer);
            border-radius: var(--mvc-r-sm);
            width: 0%;
        }

        .mvc-progress-fill-track {
            position: absolute;
            left: 0;
            height: var(--mvc-track-h);
            background: var(--mvc-fill);
            border-radius: var(--mvc-r-sm);
            width: 0%;
            box-shadow: var(--mvc-glow);
        }

        .mvc-progress-thumb {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 11px;
            height: 11px;
            border-radius: var(--mvc-r-pill);
            background: var(--mvc-fill);
            box-shadow: var(--mvc-glow);
            pointer-events: none;
            opacity: 0;
            transition: transform 0.15s var(--mvc-ease), opacity var(--mvc-dur) var(--mvc-ease);
        }
        :root[data-mvc-theme="frame"] .mvc-progress-thumb {
            width: 2px;
            height: 14px;
            background: var(--mvc-accent);
        }

        .mvc-progress-tooltip {
            position: absolute;
            bottom: calc(100% + 4px);
            transform: translateX(-50%);
            background: var(--mvc-toast);
            border: var(--mvc-border);
            color: var(--mvc-text);
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: var(--mvc-r-sm);
            pointer-events: none;
            white-space: nowrap;
            z-index: 2;
            font-variant-numeric: tabular-nums;
            font-family: var(--mvc-font);
        }

        .mvc-progress-track-wrap.dragging .mvc-progress-thumb,
        .mvc-progress-track-wrap:active .mvc-progress-thumb {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.4);
        }

        @media (hover: hover) {
            .mvc-progress-track-wrap:hover .mvc-progress-thumb {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.4);
            }
        }

        .mvc-stepper-pill-btn {
            background: transparent !important;
            border: none;
            color: var(--mvc-text) !important;
            font-size: 18px;
            font-weight: 400;
            cursor: pointer;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border-radius: var(--mvc-r-pill);
            transition: background var(--mvc-dur) var(--mvc-ease), transform 0.15s var(--mvc-ease);
            touch-action: none;
        }
        .mvc-stepper-pill-btn:active {
            background: var(--mvc-btn-on);
            transform: scale(0.9);
        }

        .mvc-stepper-pill-val {
            font-variant-numeric: tabular-nums;
            font-size: 13px;
            min-width: 44px;
            text-align: center;
            color: var(--mvc-accent);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: var(--mvc-r-sm);
            transition: background var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-stepper-pill-val:active {
            background: var(--mvc-btn-on);
        }

        /* Header Control Buttons (Top Right) & Collapse Button */
        .mvc-settings-btn,
        .mvc-pip-btn,
        .mvc-lock-btn,
        .mvc-ratio-btn,
        .mvc-collapse-btn {
            position: relative;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--mvc-surface);
            color: var(--mvc-text);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            cursor: pointer;
            box-shadow: var(--mvc-shadow);
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.2s var(--mvc-ease), background-color var(--mvc-dur) var(--mvc-ease);
            padding: 0;
            flex-shrink: 0;
        }

        /* Header Controls Group & Row */
        .mvc-controls-group {
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            pointer-events: auto;
            flex-shrink: 0;
            margin-left: auto;
        }
        .mvc-controls-row {
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 1;
            max-width: 240px;
            transition: max-width 0.35s var(--mvc-ease), opacity var(--mvc-dur) var(--mvc-ease);
            overflow: hidden;
        }
        .mvc-controls-row.collapsed {
            max-width: 0;
            opacity: 0;
            pointer-events: none;
        }
        .mvc-collapse-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor !important;
            transition: transform 0.35s var(--mvc-ease);
        }
        .mvc-controls-group.expanded .mvc-collapse-btn svg {
            transform: rotate(180deg);
        }
        .mvc-settings-btn:active,
        .mvc-pip-btn:active,
        .mvc-lock-btn:active,
        .mvc-ratio-btn:active,
        .mvc-collapse-btn:active {
            transform: scale(0.9);
            background: var(--mvc-btn-on);
        }
        .mvc-settings-btn.visible,
        .mvc-lock-btn[aria-pressed="true"] {
            background: var(--mvc-btn-on);
            color: var(--mvc-accent);
        }
        .mvc-settings-btn svg,
        .mvc-pip-btn svg,
        .mvc-lock-btn svg,
        .mvc-ratio-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor !important;
        }
        /* The ratio button doubles as the rotation control (long-press),
           so it shows the current angle. */
        .mvc-ratio-btn svg {
            transition: transform 0.25s var(--mvc-ease);
        }
        .mvc-ratio-btn[data-rot="90"] svg  { transform: rotate(90deg); }
        .mvc-ratio-btn[data-rot="180"] svg { transform: rotate(180deg); }
        .mvc-ratio-btn[data-rot="270"] svg { transform: rotate(270deg); }
        .mvc-ratio-btn[data-rot="90"],
        .mvc-ratio-btn[data-rot="180"],
        .mvc-ratio-btn[data-rot="270"] {
            background: var(--mvc-btn-on);
            color: var(--mvc-accent);
        }

        /* ── Settings Sheet — bottom sheet, centred on the video ────────
           Anchored to the bottom edge rather than hanging off the gear, so
           it never covers the controls it is changing and stays in reach. */
        .mvc-settings-sheet {
            position: fixed;
            left: 50%;
            bottom: 0;
            z-index: 2147483647;
            width: 420px;
            max-width: 94vw;
            max-height: 78vh;
            max-height: 78dvh;
            background: var(--mvc-sheet);
            border: var(--mvc-border);
            border-bottom: 0;
            border-radius: var(--mvc-r-card) var(--mvc-r-card) 0 0;
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            box-shadow: var(--mvc-shadow);
            padding: 14px 16px 20px;
            opacity: 0;
            transform: translate(-50%, 100%);
            pointer-events: none;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.28s var(--mvc-ease);
            font-family: var(--mvc-font);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
        }
        .mvc-settings-sheet.visible {
            opacity: 1;
            transform: translate(-50%, 0);
            pointer-events: auto;
        }

        /* The sheet is modal: transient overlays never share the frame */
        .mvc-settings-sheet.visible ~ .mvc-toast,
        .mvc-settings-sheet.visible ~ .mvc-gesture-overlay,
        .mvc-settings-sheet.visible ~ .mvc-doubletap-container {
            display: none !important;
        }

        .mvc-settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            margin-bottom: 6px;
            flex-shrink: 0;
        }

        .mvc-settings-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--mvc-text);
            letter-spacing: -0.01em;
        }
        :root[data-mvc-theme="contrast"] .mvc-settings-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: var(--mvc-accent);
        }

        .mvc-settings-close-btn {
            background: transparent;
            border: var(--mvc-border);
            color: var(--mvc-dim);
            cursor: pointer;
            width: 28px;
            height: 28px;
            border-radius: var(--mvc-r-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background var(--mvc-dur) var(--mvc-ease), color var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-settings-close-btn:active {
            background: var(--mvc-btn-on);
            color: var(--mvc-text);
        }
        .mvc-settings-close-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor !important;
        }

        /* Two columns: toggles pair up, steppers and buttons span the width */
        .mvc-settings-card {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 18px;
            align-content: start;
            overflow-y: auto;
            flex: 1;
            scrollbar-width: none;
            overscroll-behavior: contain;
        }
        .mvc-settings-card::-webkit-scrollbar {
            display: none;
        }

        @media (max-height: 480px) {
            .mvc-settings-sheet {
                max-height: 92vh;
                max-height: 92dvh;
                padding: 10px 14px 14px;
            }
        }

        .mvc-settings-row {
            grid-column: 1 / -1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            min-width: 0;
            padding: 7px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }
        .mvc-settings-row.half { grid-column: auto; }
        /* Odd toggle count leaves the last row alone — a half-width rule above
           the reset button just looks broken. */
        .mvc-settings-row:last-of-type { border-bottom: 0; }

        .mvc-settings-label {
            color: var(--mvc-dim);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* One column is unreadable below ~320px of sheet */
        @media (max-width: 360px) {
            .mvc-settings-row.half { grid-column: 1 / -1; }
        }

        /* Steppers inside settings */
        .mvc-stepper {
            display: flex;
            align-items: center;
            gap: 4px;
            justify-content: flex-end;
        }
        .mvc-stepper-btn {
            border: var(--mvc-border);
            background: transparent;
            color: var(--mvc-text);
            font-size: 15px;
            font-weight: 600;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: var(--mvc-r-sm);
            transition: background var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-stepper-btn:active {
            background: var(--mvc-btn-on);
        }
        .mvc-stepper-val {
            color: var(--mvc-text);
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            min-width: 62px;
            text-align: center;
        }

        /* Switch */
        .mvc-switch {
            position: relative;
            width: 38px;
            height: 22px;
            flex-shrink: 0;
            background: var(--mvc-track);
            border-radius: var(--mvc-r-pill);
            transition: background-color var(--mvc-dur) var(--mvc-ease);
            cursor: pointer;
        }
        .mvc-switch.checked {
            background: var(--mvc-switch-on);
        }
        .mvc-switch-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            border-radius: var(--mvc-r-pill);
            background: #fff;
            transition: transform var(--mvc-dur) var(--mvc-ease), background var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-switch.checked .mvc-switch-thumb {
            transform: translateX(16px);
            background: var(--mvc-on-accent);
        }

        /* Grid buttons */
        .mvc-grid-btn {
            grid-column: 1 / -1;
            appearance: none;
            border: var(--mvc-border);
            background: transparent;
            color: var(--mvc-text);
            border-radius: var(--mvc-r-sm);
            padding: 9px;
            margin: 10px 0 4px;
            font-family: var(--mvc-font);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            transition: background var(--mvc-dur) var(--mvc-ease), transform 0.1s var(--mvc-ease);
        }
        .mvc-grid-btn:active {
            background: var(--mvc-btn-on);
            transform: scale(0.98);
        }
        .mvc-grid-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor !important;
        }

        /* Backdrop */
        .mvc-backdrop {
            opacity: 0;
            pointer-events: none;
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            background: rgba(0, 0, 0, 0.4);
            transition: opacity var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-backdrop.visible {
            opacity: 1;
            pointer-events: auto;
        }

        /* Unified Toast */
        .mvc-toast {
            position: fixed;
            left: 50%;
            bottom: 40px;
            transform: translateX(-50%) translateY(10px);
            background: var(--mvc-toast);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            color: var(--mvc-text);
            padding: 9px 16px;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform var(--mvc-dur) var(--mvc-ease);
            pointer-events: none;
            font-size: 13px;
            font-weight: 550;
            font-family: var(--mvc-font);
            box-shadow: var(--mvc-shadow);
            text-align: center;
        }
        .mvc-toast.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        /* Gesture feedback overlay (top-center, minimal) */
        .mvc-gesture-overlay {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--mvc-toast);
            border: var(--mvc-border);
            color: var(--mvc-text);
            font-size: 14px;
            font-weight: 600;
            padding: 6px 16px;
            border-radius: var(--mvc-r-pill);
            text-align: center;
            z-index: 2147483647;
            display: none;
            line-height: 1.3;
            pointer-events: none;
            box-shadow: var(--mvc-shadow);
            font-family: var(--mvc-font);
            font-variant-numeric: tabular-nums;
            user-select: none;
            -webkit-user-select: none;
        }

        /* Double Tap to Skip — minimal inline pill */
        .mvc-doubletap-panel {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 45%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s var(--mvc-ease);
        }
        .mvc-doubletap-panel.left { left: 0; }
        .mvc-doubletap-panel.right { right: 0; }
        .mvc-doubletap-panel.visible { opacity: 1; }

        .mvc-doubletap-inner {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--mvc-toast);
            border: var(--mvc-border);
            padding: 6px 14px;
            border-radius: var(--mvc-r-pill);
            box-shadow: var(--mvc-shadow);
        }

        .mvc-doubletap-chevrons {
            display: flex;
            gap: 0px;
        }
        .mvc-doubletap-chevron {
            font-size: 18px;
            font-weight: 900;
            color: var(--mvc-accent);
            opacity: 0.3;
            line-height: 1;
        }

        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(1) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0s; }
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(2) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.2s; }
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(3) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.4s; }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(1) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.4s; }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(2) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.2s; }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(3) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0s; }

        @keyframes mvc-chev-wave {
            0%, 100% { opacity: 0.3; }
            50%      { opacity: 1; }
        }

        .mvc-doubletap-text {
            font-size: 14px;
            font-weight: 700;
            color: var(--mvc-text);
            font-family: var(--mvc-font);
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }

        /* Volume & Brightness rails — vertical pills on the video edges */
        .mvc-volume-bar,
        .mvc-brightness-bar {
            position: fixed;
            width: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            background: var(--mvc-surface);
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            padding: 12px 0;
            z-index: 2147483647;
            pointer-events: none;
            opacity: 0;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.25s var(--mvc-ease);
            box-shadow: var(--mvc-shadow);
            filter: var(--mvc-glyph-shadow);
        }
        .mvc-volume-bar { transform: scale(0.88) translateX(6px); }
        .mvc-brightness-bar { transform: scale(0.88) translateX(-6px); }
        .mvc-volume-bar.visible,
        .mvc-brightness-bar.visible {
            opacity: 1;
            transform: scale(1) translateX(0);
        }

        .mvc-volume-icon,
        .mvc-brightness-icon {
            font-size: 13px;
            line-height: 1;
            flex-shrink: 0;
        }

        .mvc-volume-track,
        .mvc-brightness-track {
            flex: 1;
            width: 5px;
            background: var(--mvc-track);
            border-radius: var(--mvc-r-sm);
            position: relative;
            overflow: hidden;
            min-height: 60px;
        }
        .mvc-volume-fill,
        .mvc-brightness-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--mvc-fill);
            border-radius: var(--mvc-r-sm);
            transition: height 0.06s linear;
            box-shadow: var(--mvc-glow);
        }

        .mvc-volume-value,
        .mvc-brightness-value {
            font-size: 10px;
            font-weight: 700;
            color: var(--mvc-dim);
            font-variant-numeric: tabular-nums;
            font-family: var(--mvc-font);
            flex-shrink: 0;
        }

        /* Brightness Overlay */
        .mvc-brightness-overlay {
            position: fixed;
            background: black;
            opacity: 0;
            pointer-events: none;
            z-index: 2147483645;
            transition: opacity 0.05s linear;
        }

        /* Lock Screen Styles */
        .mvc-lock-shield {
            position: fixed;
            z-index: 2147483646;
            background: rgba(0,0,0,0);
            pointer-events: auto;
            touch-action: none;
        }

        .mvc-ui-wrap.locked .mvc-settings-btn,
        .mvc-ui-wrap.locked .mvc-pip-btn,
        .mvc-ui-wrap.locked .mvc-ratio-btn,
        .mvc-ui-wrap.locked .mvc-stepper-pill,
        .mvc-ui-wrap.locked .mvc-speed-fab,
        .mvc-ui-wrap.locked .mvc-progress-bar,
        .mvc-ui-wrap.locked .mvc-collapse-btn {
            display: none !important;
            pointer-events: none !important;
        }
        .mvc-ui-wrap.locked .mvc-controls-row {
            max-width: none !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            overflow: visible !important;
        }

        @media (prefers-reduced-motion: reduce) {
            .mvc-top-bar *,
            .mvc-settings-sheet,
            .mvc-toast,
            .mvc-volume-bar,
            .mvc-brightness-bar {
                transition-duration: 0.01ms !important;
                animation-duration: 0.01ms !important;
            }
        }
    `;
	document.head.appendChild(style);
}

export const MVC_THEMES = ["halo", "contrast", "frame"] as const;
export type MvcTheme = (typeof MVC_THEMES)[number];
export const MVC_THEME_LABELS: Record<MvcTheme, string> = {
	halo: "Halo",
	contrast: "High Contrast",
	frame: "Frame",
};

export function applyTheme(theme: string): void {
	const root = document.documentElement;
	if (root) root.setAttribute("data-mvc-theme", theme);
}
