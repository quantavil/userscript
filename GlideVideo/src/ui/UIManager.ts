// src/ui/UIManager.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';
import { getFullscreenContainer, preventPropagation } from '../utils';
import { SpeedStepper } from './panels/SpeedStepper';
import { SettingsSheet } from './panels/SettingsSheet';

export class UIManager {
    public wrap: HTMLDivElement | null = null;
    public stepper: SpeedStepper | null = null;
    public settingsBtn: HTMLButtonElement | null = null;
    public pipBtn: HTMLButtonElement | null = null;
    public lockBtn: HTMLButtonElement | null = null;
    public lockShield: HTMLDivElement | null = null;
    public settingsSheet: SettingsSheet | null = null;
    public backdrop: HTMLDivElement | null = null;
    public toast: HTMLDivElement | null = null;
    public gestureOverlay: HTMLDivElement | null = null;
    public doubleTapContainer: HTMLDivElement | null = null;
    public doubleTapLeftPanel: HTMLDivElement | null = null;
    public doubleTapRightPanel: HTMLDivElement | null = null;
    public doubleTapLeftText: HTMLDivElement | null = null;
    public doubleTapRightText: HTMLDivElement | null = null;

    // Volume bar
    public volumeBar:   HTMLDivElement | null = null;
    public volumeFill:  HTMLDivElement | null = null;
    public volumeIcon:  HTMLDivElement | null = null;
    public volumeValue: HTMLDivElement | null = null;

    // Brightness bar & overlay
    public brightnessOverlay: HTMLDivElement | null = null;
    public brightnessBar:     HTMLDivElement | null = null;
    public brightnessFill:    HTMLDivElement | null = null;
    public brightnessIcon:    HTMLDivElement | null = null;
    public brightnessValue:   HTMLDivElement | null = null;

    constructor(
        private readonly eventBus: EventBus,
        public readonly store: StateStore
    ) {
        this.setupSubscriptions();
    }

    public init() {
        this.createMainUI();
        this.attachGlobalListeners();
    }

    private setupSubscriptions() {
        this.eventBus.on('control:visibility-requested', ({ visible, force }) => {
            if (visible) this.showUI(force);
            else this.hideUI();
        });
        this.eventBus.on('ui:toast', ({ message }) => this.showToast(message));
        this.eventBus.on('ui:gesture-overlay', (payload) => {
            if (payload) {
                this.showGestureOverlay(payload.text, payload.subText);
            } else {
                this.hideGestureOverlay();
            }
        });
        this.eventBus.on('video:rate-changed', () => this.updateSpeedDisplay());
        this.eventBus.on('video:play-state-changed', () => this.updateSpeedDisplay());
        this.eventBus.on('video:transform-need-update', () => this.updateSettingsTransformUI());
        this.eventBus.on('video:active-changed', (video) => {
            if (video) {
                this.updateSpeedDisplay();
                this.updateSettingsTransformUI();
            }
        });
        this.eventBus.on('settings:changed', ({ key }) => {
            if (key === 'defaultSpeed' || key === 'skipSeconds' || key === 'gesturesEnabled') {
                if (this.settingsSheet) this.settingsSheet.updateUI();
            } else if (key === 'transform') {
                this.updateSettingsTransformUI();
            }
        });
        this.eventBus.on('video:double-tap-skipped', ({ side, x, y, seconds }) => {
            this.showDoubleTapOverlay(side, x, y, seconds);
        });
        this.eventBus.on('ui:volume-changed', ({ volume }) => {
            this.showVolumeBar(volume);
        });
        this.eventBus.on('ui:brightness-changed', ({ brightness }) => {
            this.showBrightness(brightness);
        });
    }

    // ── Primitive builders ──────────────────────────────────────────────────
    public createEl<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className?: string,
        props: Record<string, any> = {}
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        if (className) el.className = className;
        for (const [k, v] of Object.entries(props)) {
            if (k === 'style') {
                Object.assign(el.style, v);
            } else if (k === 'role' || k.startsWith('aria-')) {
                el.setAttribute(k, v);
            } else {
                (el as any)[k] = v;
            }
        }
        return el;
    }

    private createSvgIcon(pathData: string): SVGSVGElement {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg  = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width',  '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('fill',   'currentColor');
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        return svg;
    }

    public getIcon(name: 'settings' | 'close' | 'rotate' | 'reset' | 'pip' | 'lock' | 'unlock'): SVGSVGElement {
        const paths = {
            settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.22-.07.49.12.61l2.03 1.58c-.04.3-.06.61-.06.94 0 .32.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
            close:    'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
            rotate:   'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',
            reset:    'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
            pip:      'M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z',
            lock:     'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
            unlock:   'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z'
        };
        return this.createSvgIcon(paths[name] || '');
    }

    public isAnyMenuOpen(): boolean {
        return this.settingsSheet !== null && this.settingsSheet.dom.classList.contains('visible');
    }

    // ── Main UI layout ────────────────────────────────────────────────────────
    public createMainUI() {
        const wrap           = this.createEl('div', 'mvc-ui-wrap');
        const backdrop       = this.createEl('div', 'mvc-backdrop');
        const toast          = this.createEl('div', 'mvc-toast', { role: 'status', 'aria-live': 'polite' });
        const gestureOverlay = this.createEl('div', 'mvc-gesture-overlay', { role: 'status', 'aria-live': 'polite' });

        this.wrap           = wrap;
        this.backdrop       = backdrop;
        this.toast          = toast;
        this.gestureOverlay = gestureOverlay;

        preventPropagation(backdrop);

        // Make sure wrap doesn't swallow touches for standard video control gestures
        wrap.style.cssText = 'position:fixed; inset:0; z-index:2147483647; pointer-events:none; display:none; opacity:0; transition:opacity .35s ease;';
        
        // Append full-screen components directly
        const container = getFullscreenContainer();
        container.append(backdrop, toast, gestureOverlay);

        // Volume bar (right-side vertical pill)
        const volumeBar   = this.createEl('div', 'mvc-volume-bar');
        const volumeIcon  = this.createEl('div', 'mvc-volume-icon');
        const volumeTrack = this.createEl('div', 'mvc-volume-track');
        const volumeFill  = this.createEl('div', 'mvc-volume-fill');
        const volumeValue = this.createEl('div', 'mvc-volume-value');
        volumeTrack.appendChild(volumeFill);
        volumeBar.append(volumeIcon, volumeTrack, volumeValue);
        container.appendChild(volumeBar);
        this.volumeBar   = volumeBar;
        this.volumeFill  = volumeFill;
        this.volumeIcon  = volumeIcon;
        this.volumeValue = volumeValue;

        // Brightness Overlay (black backdrop with variable opacity)
        const brightnessOverlay = this.createEl('div', 'mvc-brightness-overlay');
        container.appendChild(brightnessOverlay);
        this.brightnessOverlay = brightnessOverlay;

        // Brightness bar (left-side vertical pill)
        const brightnessBar   = this.createEl('div', 'mvc-brightness-bar');
        const brightnessIcon  = this.createEl('div', 'mvc-brightness-icon');
        const brightnessTrack = this.createEl('div', 'mvc-brightness-track');
        const brightnessFill  = this.createEl('div', 'mvc-brightness-fill');
        const brightnessValue = this.createEl('div', 'mvc-brightness-value');
        brightnessTrack.appendChild(brightnessFill);
        brightnessBar.append(brightnessIcon, brightnessTrack, brightnessValue);
        container.appendChild(brightnessBar);
        this.brightnessBar   = brightnessBar;
        this.brightnessFill  = brightnessFill;
        this.brightnessIcon  = brightnessIcon;
        this.brightnessValue = brightnessValue;

        // Create Double Tap UI Elements — YouTube style
        const doubleTapContainer = this.createEl('div', 'mvc-doubletap-container');
        this.doubleTapContainer = doubleTapContainer;
        doubleTapContainer.style.cssText = 'position:fixed; pointer-events:none; display:none; z-index:2147483646; overflow:hidden;';

        const buildPanel = (dir: 'left' | 'right') => {
            const panel    = this.createEl('div', `mvc-doubletap-panel ${dir}`);
            const inner    = this.createEl('div', 'mvc-doubletap-inner');
            const chevrons = this.createEl('div', 'mvc-doubletap-chevrons');
            const icon     = dir === 'left' ? '❮' : '❯';
            for (let i = 0; i < 3; i++) {
                const ch = this.createEl('span', 'mvc-doubletap-chevron');
                ch.textContent = icon;
                chevrons.appendChild(ch);
            }
            const text = this.createEl('div', 'mvc-doubletap-text');
            // Left: ❮❮❮ 10s | Right: 10s ❯❯❯
            if (dir === 'left') {
                inner.append(chevrons, text);
            } else {
                inner.append(text, chevrons);
            }
            panel.appendChild(inner);
            return { panel, text };
        };

        const { panel: leftPanel,  text: leftText  } = buildPanel('left');
        const { panel: rightPanel, text: rightText } = buildPanel('right');

        doubleTapContainer.append(leftPanel, rightPanel);
        container.append(doubleTapContainer);

        this.doubleTapLeftPanel  = leftPanel;
        this.doubleTapRightPanel = rightPanel;
        this.doubleTapLeftText   = leftText;
        this.doubleTapRightText  = rightText;

        // Mount modular Stepper & PiP / Settings Buttons
        this.stepper = new SpeedStepper(this.eventBus, this);
        this.stepper.dom.style.pointerEvents = 'auto'; // allow clicks
        preventPropagation(this.stepper.dom);
        wrap.appendChild(this.stepper.dom);

        // Check PiP support (either native Picture-in-Picture API or iOS Webkit Presentation Mode)
        const isPipSupported = !!(document.pictureInPictureEnabled || ('webkitSupportsPresentationMode' in HTMLVideoElement.prototype));
        if (isPipSupported) {
            this.pipBtn = document.createElement('button');
            this.pipBtn.className = 'mvc-pip-btn';
            this.pipBtn.style.pointerEvents = 'auto';
            this.pipBtn.appendChild(this.getIcon('pip'));
            this.pipBtn.onclick = (e) => {
                e.stopPropagation();
                this.togglePiP();
            };
            preventPropagation(this.pipBtn);
            wrap.appendChild(this.pipBtn);
        }

        this.settingsBtn = document.createElement('button');
        this.settingsBtn.className = 'mvc-settings-btn';
        this.settingsBtn.style.pointerEvents = 'auto';
        this.settingsBtn.appendChild(this.getIcon('settings'));
        this.settingsBtn.onclick = (e) => {
            e.stopPropagation();
            this.ensureSettingsSheet();
            if (this.settingsSheet) {
                this.toggleMenu(this.settingsSheet.dom, this.settingsBtn!);
            }
        };
        preventPropagation(this.settingsBtn);
        wrap.appendChild(this.settingsBtn);

        // Lock Shield
        const lockShield = this.createEl('div', 'mvc-lock-shield');
        lockShield.style.display = 'none';
        const blk = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.showUI(true);
        };
        ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'touchstart', 'touchend'].forEach(evt => {
            lockShield.addEventListener(evt, blk, { capture: true, passive: false });
        });
        wrap.appendChild(lockShield);
        this.lockShield = lockShield;

        // Lock Button
        this.lockBtn = document.createElement('button');
        this.lockBtn.className = 'mvc-lock-btn';
        this.lockBtn.style.pointerEvents = 'auto';
        this.lockBtn.appendChild(this.getIcon('unlock'));
        this.lockBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleScreenLock();
        };
        const rightOffset = isPipSupported ? 120 : 68;
        this.lockBtn.style.right = `${rightOffset}px`;
        preventPropagation(this.lockBtn);
        wrap.appendChild(this.lockBtn);

        container.appendChild(wrap);
    }

    public ensureSettingsSheet() {
        if (this.settingsSheet) return;
        this.settingsSheet = new SettingsSheet(this.eventBus, this.store, this);
        preventPropagation(this.settingsSheet.dom);
        
        const container = getFullscreenContainer();
        container.appendChild(this.settingsSheet.dom);
    }

    public updateSpeedDisplay() {
        if (this.stepper) {
            this.stepper.updateSpeedDisplay();
        }
    }

    public toggleMenu(menuEl: HTMLElement, anchorEl: HTMLElement) {
        const isOpen = menuEl.classList.contains('visible');
        this.hideAllMenus();
        if (isOpen) return;

        menuEl.classList.add('visible');
        anchorEl.classList.add('visible');
        this.showBackdrop();
        
        clearTimeout(this.store.timers.hide);
    }

    public showBackdrop() {
        if (!this.backdrop) return;
        this.backdrop.classList.add('visible');
    }

    public hideAllMenus() {
        if (this.settingsSheet && this.settingsSheet.dom.classList.contains('visible')) {
            this.settingsSheet.dom.classList.remove('visible');
            this.settingsBtn?.classList.remove('visible');
        }
        if (this.backdrop) this.backdrop.classList.remove('visible');
        this.eventBus.emit('control:visibility-requested', { visible: true });
    }

    public updateSettingsTransformUI() {
        if (!this.settingsSheet || !this.settingsSheet.dom.classList.contains('visible')) return;
        this.settingsSheet.updateUI();
    }

    public showToast(message: string) {
        if (!this.toast) return;
        this.toast.textContent = message;
        this.toast.classList.add('visible');
        clearTimeout(this.store.timers.toast);
        this.store.timers.toast = setTimeout(() => {
            if (this.toast) this.toast.classList.remove('visible');
        }, 1500) as any;
    }

    public showGestureOverlay(text: string, subText?: string) {
        if (!this.gestureOverlay) return;
        this.gestureOverlay.textContent = text;
        if (subText) {
            const span = document.createElement('span');
            Object.assign(span.style, { fontSize: '11px', opacity: '0.8', display: 'block', marginTop: '2px' });
            span.textContent = subText;
            this.gestureOverlay.appendChild(span);
        }
        this.gestureOverlay.style.display = 'block';
    }

    public hideGestureOverlay() {
        if (!this.gestureOverlay) return;
        this.gestureOverlay.style.display = 'none';
        this.gestureOverlay.textContent = '';
    }

    private attachGlobalListeners() {
        ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
            window.addEventListener(ev, e => {
                if (!e.isTrusted) return;
                this.store.lastRealUserEvent = Date.now();
                if (e.type === 'keydown' || (this.wrap && e.target && this.wrap.contains(e.target as Node))) {
                    this.showUI(true);
                }
            }, { passive: true, signal: this.store.abortController.signal })
        );

        if (this.backdrop) {
            this.backdrop.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.hideAllMenus();
            });
        }
    }

    public showUI(force = false) {
        if (!this.wrap || !this.store.activeVideo || this.store.savedPlaybackRate !== undefined) return;
        
        // Timeout fade guard
        const now = Date.now();
        if (!force && (now - this.store.lastRealUserEvent >= 4500)) return;

        this.wrap.style.display = 'block';
        // Force reflow
        this.wrap.offsetHeight;
        this.wrap.style.opacity = '1';
        
        clearTimeout(this.store.timers.hide);

        const isInteracting = this.isAnyMenuOpen() || this.store.isSpeedSliding;

        if (!isInteracting && !this.store.activeVideo.paused) {
            this.store.timers.hide = setTimeout(() => this.hideUI(), 3500) as any;
        }
    }

    public hideUI() {
        if (!this.wrap) return;
        const isInteracting = this.isAnyMenuOpen() || this.store.isSpeedSliding;
        if (this.store.activeVideo?.paused || isInteracting) return;

        this.wrap.style.opacity = '0';
        clearTimeout(this.store.timers.hide);
        this.store.timers.hide = setTimeout(() => {
            if (this.wrap && this.wrap.style.opacity === '0') {
                this.wrap.style.display = 'none';
            }
        }, 350) as any;
    }

    public togglePiP() {
        const video = this.store.activeVideo;
        if (!video) return;

        try {
            if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function') {
                const isPip = video.webkitPresentationMode === 'picture-in-picture';
                video.webkitSetPresentationMode(isPip ? 'inline' : 'picture-in-picture');
            } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
                if (document.pictureInPictureElement === video) {
                    document.exitPictureInPicture().catch(() => {});
                } else {
                    video.requestPictureInPicture().catch(() => {});
                }
            } else {
                this.showToast('PiP not supported on this browser');
            }
        } catch (err) {
            console.error('[MVC] PiP error:', err);
            this.showToast('Failed to toggle PiP mode');
        }
    }
    public toggleScreenLock() {
        const locked = !this.store.isScreenLocked;
        this.store.isScreenLocked = locked;
        if (this.wrap) this.wrap.classList.toggle('locked', locked);
        if (this.lockShield) this.lockShield.style.display = locked ? 'block' : 'none';
        if (this.lockBtn) this.lockBtn.replaceChildren(this.getIcon(locked ? 'lock' : 'unlock'));
        if (locked) this.hideAllMenus();
        this.showToast(locked ? 'Gestures locked' : 'Gestures unlocked');
        this.showUI(true);
    }

    public showDoubleTapOverlay(side: 'left' | 'right', x: number, y: number, seconds: number) {
        if (!this.doubleTapContainer || !this.store.activeVideo) return;

        const rect = this.store.activeVideo.getBoundingClientRect();
        Object.assign(this.doubleTapContainer.style, {
            top:    `${rect.top}px`,
            left:   `${rect.left}px`,
            width:  `${rect.width}px`,
            height: `${rect.height}px`,
            display: 'block'
        });

        const activePanel   = side === 'left' ? this.doubleTapLeftPanel   : this.doubleTapRightPanel;
        const inactivePanel = side === 'left' ? this.doubleTapRightPanel  : this.doubleTapLeftPanel;
        const activeText    = side === 'left' ? this.doubleTapLeftText    : this.doubleTapRightText;

        if (inactivePanel) inactivePanel.classList.remove('visible');
        if (activeText)    activeText.textContent = `${seconds}s`;

        if (activePanel) {
            activePanel.classList.add('visible');
        }

        clearTimeout(this.store.timers.doubleTapUIHide);
        this.store.timers.doubleTapUIHide = setTimeout(() => {
            if (this.doubleTapLeftPanel)  this.doubleTapLeftPanel.classList.remove('visible');
            if (this.doubleTapRightPanel) this.doubleTapRightPanel.classList.remove('visible');
            if (this.doubleTapContainer)  this.doubleTapContainer.style.display = 'none';
        }, 800);
    }

    public showVolumeBar(volume: number) {
        if (!this.volumeBar || !this.volumeFill || !this.volumeIcon || !this.volumeValue) return;
        if (!this.store.activeVideo) return;

        const rect   = this.store.activeVideo.getBoundingClientRect();
        const barH   = Math.min(Math.max(rect.height * 0.55, 120), 220);
        const top    = rect.top  + (rect.height - barH) / 2;
        const right  = window.innerWidth - rect.right + 14;

        Object.assign(this.volumeBar.style, {
            top:   `${top}px`,
            right: `${right}px`,
            height: `${barH}px`
        });

        const pct = Math.round(volume * 100);
        this.volumeFill.style.height  = `${Math.min(pct, 100)}%`;
        this.volumeValue.textContent  = `${pct}%`;
        
        if (volume > 1.0) {
            this.volumeFill.style.background = '#ff9f0a';
            this.volumeFill.style.boxShadow = '0 0 8px rgba(255, 159, 10, 0.6)';
            this.volumeIcon.textContent = '🔊⚡';
        } else {
            this.volumeFill.style.background = '';
            this.volumeFill.style.boxShadow = '';
            this.volumeIcon.textContent = volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.7 ? '🔉' : '🔊';
        }

        this.volumeBar.classList.add('visible');

        clearTimeout(this.store.timers.volumeBarHide);
        this.store.timers.volumeBarHide = setTimeout(() => {
            if (this.volumeBar) this.volumeBar.classList.remove('visible');
        }, 1200) as any;
    }

    public showBrightness(brightness: number) {
        if (!this.brightnessOverlay || !this.brightnessBar || !this.brightnessFill || !this.brightnessIcon || !this.brightnessValue) return;
        if (!this.store.activeVideo) return;

        const opacity = 1 - brightness;
        this.brightnessOverlay.style.opacity = `${opacity}`;

        const rect   = this.store.activeVideo.getBoundingClientRect();
        const barH   = Math.min(Math.max(rect.height * 0.55, 120), 220);
        const top    = rect.top  + (rect.height - barH) / 2;
        const left   = rect.left + 14;

        Object.assign(this.brightnessBar.style, {
            top:   `${top}px`,
            left:  `${left}px`,
            height: `${barH}px`
        });

        const pct = Math.round(brightness * 100);
        this.brightnessFill.style.height  = `${pct}%`;
        this.brightnessValue.textContent  = `${pct}%`;
        this.brightnessIcon.textContent   = brightness < 0.4 ? '🌑' : brightness < 0.7 ? '🌓' : '☀️';

        this.brightnessBar.classList.add('visible');

        clearTimeout(this.store.timers.brightnessBarHide);
        this.store.timers.brightnessBarHide = setTimeout(() => {
            if (this.brightnessBar) this.brightnessBar.classList.remove('visible');
        }, 1200) as any;
    }
}
