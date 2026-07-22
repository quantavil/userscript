// src/ui/styles/css.ts

export function injectStyles(): void {
	if (document.getElementById("mvc-styles")) return;
	if (!document.head) return;
	const style = document.createElement("style");
	style.id = "mvc-styles";
	style.textContent = `
        :root {
            --mvc-radius-lg: 24px;
            --mvc-radius-md: 20px;
            --mvc-radius-sm: 10px;
            --mvc-bg-pill: rgba(20, 20, 22, 0.45);
            --mvc-bg-sheet: rgba(20, 20, 22, 0.7);
            --mvc-bg-toast: rgba(20, 20, 22, 0.85);
            --mvc-color-accent: #00e5ff;
            --mvc-color-accent-glow: rgba(0, 229, 255, 0.3);
            --mvc-color-accent-glow-strong: rgba(0, 229, 255, 0.5);
            --mvc-color-success: #30d158;
        }

        /* Stepper Pill (Top Left) */
        .mvc-stepper-pill {
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--mvc-bg-pill);
            color: #fff;
            padding: 4px 8px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--mvc-radius-md);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.22);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-weight: 600;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            transition: opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1), transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
            will-change: opacity, transform;
            touch-action: none;
        }

        .mvc-stepper-pill-btn {
            background: transparent !important;
            border: none;
            color: rgba(255, 255, 255, 0.8) !important;
            font-size: 18px;
            font-weight: 400;
            cursor: pointer;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border-radius: 50%;
            transition: background 0.15s, transform 0.15s;
            touch-action: none;
        }
        .mvc-stepper-pill-btn:active {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(0.9);
        }

        .mvc-stepper-pill-val {
            font-variant-numeric: tabular-nums;
            font-size: 13px;
            min-width: 44px;
            text-align: center;
            color: var(--mvc-color-accent);
            text-shadow: 0 0 8px var(--mvc-color-accent-glow);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: var(--mvc-radius-sm);
            transition: background 0.2s;
        }
        .mvc-stepper-pill-val:active {
            background: rgba(255, 255, 255, 0.08);
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
            background: var(--mvc-bg-pill);
            color: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 50%;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2);
            transition: opacity 0.35s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s;
            will-change: opacity, transform;
            padding: 0;
            flex-shrink: 0;
        }

        /* Header Controls Group & Row */
        .mvc-controls-group {
            position: fixed;
            top: 16px;
            right: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 2147483647;
            pointer-events: auto;
        }
        .mvc-controls-row {
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 1;
            max-width: 240px; /* adjusts to fit all buttons */
            transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
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
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Rotate the chevron 180 degrees when expanded */
        .mvc-controls-group.expanded .mvc-collapse-btn svg {
            transform: rotate(180deg);
        }
        .mvc-settings-btn:active,
        .mvc-pip-btn:active,
        .mvc-lock-btn:active,
        .mvc-ratio-btn:active,
        .mvc-collapse-btn:active {
            transform: scale(0.9);
            background: rgba(255, 255, 255, 0.15) !important;
        }
        .mvc-settings-btn svg,
        .mvc-pip-btn svg,
        .mvc-lock-btn svg,
        .mvc-ratio-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor !important;
        }
        .mvc-settings-btn svg {
            transition: transform 0.4s ease;
        }
        .mvc-settings-btn.visible svg {
            transform: rotate(45deg);
        }

        /* Settings Sheet (Anchored Top Right) */
        .mvc-settings-sheet {
            position: fixed;
            top: 70px;
            right: 16px;
            z-index: 2147483647;
            width: 280px;
            max-width: 90vw;
            max-height: calc(100vh - 90px);
            max-height: calc(100dvh - 90px);
            background: var(--mvc-bg-sheet);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--mvc-radius-lg);
            backdrop-filter: blur(32px);
            -webkit-backdrop-filter: blur(32px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55), inset 0 1px 2px rgba(255, 255, 255, 0.2);
            padding: 14px;
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
            transform-origin: top right;
            pointer-events: none;
            transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            will-change: opacity, transform;
            
            /* Flex layout to support scrollable content card */
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
        }
        .mvc-settings-sheet.visible {
            opacity: 1;
            transform: scale(1) translateY(0);
            pointer-events: auto;
        }

        .mvc-settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            padding-bottom: 8px;
            margin-bottom: 12px;
            flex-shrink: 0; /* Keep header from shrinking */
        }

        .mvc-settings-title {
            font-size: 14px;
            font-weight: 700;
            color: rgba(235, 235, 245, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .mvc-settings-close-btn {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.2s;
        }
        .mvc-settings-close-btn:active {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        .mvc-settings-close-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor !important;
        }

        .mvc-settings-card {
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
            flex: 1;
            scrollbar-width: none; /* Firefox */
        }
        .mvc-settings-card::-webkit-scrollbar {
            display: none; /* Safari/Chrome */
        }

        /* Auto-adjust layout for landscape mode / short screens */
        @media (max-height: 480px) {
            .mvc-settings-sheet {
                top: 12px;
                right: 12px;
                max-height: calc(100vh - 24px);
                max-height: calc(100dvh - 24px);
                border-radius: var(--mvc-radius-md);
                padding: 10px;
                width: 260px;
            }
            .mvc-settings-header {
                padding-bottom: 6px;
                margin-bottom: 8px;
            }
            .mvc-settings-card {
                gap: 8px;
            }
            .mvc-settings-row {
                gap: 8px;
            }
        }

        .mvc-settings-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            width: 100%;
        }

        .mvc-settings-label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
        }

        /* Steppers inside settings */
        .mvc-stepper {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.06);
            border-radius: var(--mvc-radius-sm);
            padding: 2px;
            width: 120px;
            justify-content: space-between;
        }
        .mvc-stepper-btn {
            border: 0;
            background: transparent;
            color: rgba(255, 255, 255, 0.8);
            font-size: 15px;
            font-weight: 600;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .mvc-stepper-btn:active {
            background: rgba(255, 255, 255, 0.1);
        }
        .mvc-stepper-val {
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
        }



        /* Switch */
        .mvc-switch {
            position: relative;
            width: 42px;
            height: 24px;
            background: rgba(255, 255, 255, 0.12);
            border-radius: var(--mvc-radius-md);
            transition: background-color 0.2s ease;
            cursor: pointer;
        }
        .mvc-switch.checked {
            background: var(--mvc-color-success);
        }
        .mvc-switch-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .mvc-switch.checked .mvc-switch-thumb {
            transform: translateX(18px);
        }

        /* Grid buttons */
        .mvc-grid-btn {
            appearance: none;
            border: 0;
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            border-radius: var(--mvc-radius-sm);
            padding: 8px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: background 0.2s, transform 0.1s;
        }
        .mvc-grid-btn:active {
            background: rgba(255, 255, 255, 0.12);
            transform: scale(0.96);
        }
        .mvc-grid-btn svg {
            width: 14px;
            height: 14px;
            fill: currentColor !important;
        }

        /* Backdrop */
        .mvc-backdrop {
            opacity: 0;
            pointer-events: none;
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            background: rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(1px);
            -webkit-backdrop-filter: blur(1px);
            transition: opacity 0.22s ease;
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
            background: var(--mvc-bg-toast);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--mvc-radius-md);
            color: #fff;
            padding: 8px 16px;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
            pointer-events: none;
            font-size: 13px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
            background: var(--mvc-bg-toast);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            padding: 6px 16px;
            border-radius: var(--mvc-radius-md);
            text-align: center;
            z-index: 2147483647;
            display: none;
            line-height: 1.3;
            pointer-events: none;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.22);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
            transition: opacity 0.15s ease;
        }
        .mvc-doubletap-panel.left {
            left: 0;
        }
        .mvc-doubletap-panel.right {
            right: 0;
        }
        .mvc-doubletap-panel.visible { opacity: 1; }

        /* Inner pill wrapping text + chevrons */
        .mvc-doubletap-inner {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(0, 0, 0, 0.75);
            padding: 6px 14px;
            border-radius: 20px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
        }

        /* Chevron row */
        .mvc-doubletap-chevrons {
            display: flex;
            gap: 0px;
        }
        .mvc-doubletap-chevron {
            font-size: 18px;
            font-weight: 900;
            color: #fff;
            opacity: 0.3;
            line-height: 1;
        }

        /* Right panel: wave left → right */
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(1) {
            animation: mvc-chev-wave 1s ease-in-out infinite;
            animation-delay: 0s;
        }
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(2) {
            animation: mvc-chev-wave 1s ease-in-out infinite;
            animation-delay: 0.2s;
        }
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(3) {
            animation: mvc-chev-wave 1s ease-in-out infinite;
            animation-delay: 0.4s;
        }

        /* Left panel: wave right → left */
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(1) {
            animation: mvc-chev-wave 1s ease-in-out infinite;
            animation-delay: 0.4s;
        }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(2) {
            animation: mvc-chev-wave 1s ease-in-out infinite;
            animation-delay: 0.2s;
        }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(3) {
            animation: mvc-chev-wave 1s ease-in-out infinite;
            animation-delay: 0s;
        }

        @keyframes mvc-chev-wave {
            0%, 100% { opacity: 0.3; }
            50%      { opacity: 1; }
        }

        /* Skip seconds label */
        .mvc-doubletap-text {
            font-size: 14px;
            font-weight: 700;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }


        /* Volume Bar — vertical pill on right edge of video */
        .mvc-volume-bar {
            position: fixed;
            width: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            background: var(--mvc-bg-pill);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--mvc-radius-lg);
            padding: 12px 0;
            z-index: 2147483647;
            pointer-events: none;
            opacity: 0;
            transform: scale(0.88) translateX(6px);
            transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.18);
            will-change: opacity, transform;
        }
        .mvc-volume-bar.visible {
            opacity: 1;
            transform: scale(1) translateX(0);
        }

        .mvc-volume-icon {
            font-size: 13px;
            line-height: 1;
            flex-shrink: 0;
        }

        .mvc-volume-track {
            flex: 1;
            width: 4px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 2px;
            position: relative;
            overflow: hidden;
            min-height: 60px;
        }
        .mvc-volume-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--mvc-color-accent);
            border-radius: 2px;
            transition: height 0.06s linear;
            box-shadow: 0 0 6px var(--mvc-color-accent-glow-strong);
        }

        .mvc-volume-value {
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.85);
            font-variant-numeric: tabular-nums;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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

        /* Brightness Bar — vertical pill on left edge of video */
        .mvc-brightness-bar {
            position: fixed;
            width: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            background: var(--mvc-bg-pill);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: var(--mvc-radius-lg);
            padding: 12px 0;
            z-index: 2147483647;
            pointer-events: none;
            opacity: 0;
            transform: scale(0.88) translateX(-6px);
            transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.18);
            will-change: opacity, transform;
        }
        .mvc-brightness-bar.visible {
            opacity: 1;
            transform: scale(1) translateX(0);
        }

        .mvc-brightness-icon {
            font-size: 13px;
            line-height: 1;
            flex-shrink: 0;
        }

        .mvc-brightness-track {
            flex: 1;
            width: 4px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 2px;
            position: relative;
            overflow: hidden;
            min-height: 60px;
        }
        .mvc-brightness-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--mvc-color-accent);
            border-radius: 2px;
            transition: height 0.06s linear;
            box-shadow: 0 0 6px var(--mvc-color-accent-glow-strong);
        }

        .mvc-brightness-value {
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.85);
            font-variant-numeric: tabular-nums;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            flex-shrink: 0;
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
        .mvc-ui-wrap.locked .mvc-stepper-pill {
            display: none !important;
            pointer-events: none !important;
        }
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
    `;
	document.head.appendChild(style);
}
