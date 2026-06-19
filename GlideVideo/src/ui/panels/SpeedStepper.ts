// src/ui/panels/SpeedStepper.ts
import { EventBus } from '../../events/EventBus';
import { UIManager } from '../UIManager';
import { MVC_CONFIG } from '../../config';
import { clamp, vibrate } from '../../utils';

export class SpeedStepper {
    private element!: HTMLDivElement;
    private decBtn!: HTMLButtonElement;
    private incBtn!: HTMLButtonElement;
    private valEl!: HTMLSpanElement;
    private inputEl: HTMLInputElement | null = null;

    private holdTimeout?: any;
    private holdInterval?: any;
    private longPressTimeout?: any;
    private wasLongPress = false;

    constructor(
        private readonly eventBus: EventBus,
        private readonly ui: UIManager
    ) {
        this.element = this.render();
    }

    private render(): HTMLDivElement {
        const stepper = document.createElement('div');
        stepper.className = 'mvc-stepper-pill';

        // Dec Button (-)
        this.decBtn = document.createElement('button');
        this.decBtn.className = 'mvc-stepper-pill-btn mvc-btn-dec';
        this.decBtn.textContent = '−';
        this.setupButtonHold(this.decBtn, -1);

        // Val Span (1.00x)
        this.valEl = document.createElement('span');
        this.valEl.className = 'mvc-stepper-pill-val';
        this.setupValHandlers(this.valEl);

        // Inc Button (+)
        this.incBtn = document.createElement('button');
        this.incBtn.className = 'mvc-stepper-pill-btn mvc-btn-inc';
        this.incBtn.textContent = '+';
        this.setupButtonHold(this.incBtn, 1);

        stepper.append(this.decBtn, this.valEl, this.incBtn);

        // Initial update
        this.updateSpeedDisplay();

        return stepper;
    }

    public get dom(): HTMLDivElement {
        return this.element;
    }

    public updateSpeedDisplay() {
        if (this.inputEl) return; // Keep input active
        const video = this.ui.store.activeVideo;
        if (!video) {
            this.valEl.textContent = '1.00x';
            return;
        }
        if (video.ended) {
            this.valEl.textContent = 'Replay';
        } else if (video.paused) {
            this.valEl.textContent = '▶︎';
        } else {
            this.valEl.textContent = `${video.playbackRate.toFixed(2)}x`;
        }
    }

    private adjustSpeed(delta: number, saveToSettings: boolean) {
        const video = this.ui.store.activeVideo;
        if (!video) return;

        const currentRate = video.playbackRate;
        const newRate = clamp(currentRate + delta, 0.1, 16.0);
        
        this.eventBus.emit('video:rate-change-requested', { rate: newRate, saveToSettings });
        this.updateSpeedDisplay();
        
        if (saveToSettings) {
            this.ui.showToast(`Speed: ${newRate.toFixed(2)}x`);
        }
    }

    private setupButtonHold(btn: HTMLButtonElement, dir: number) {
        let isHolding = false;
        let elapsed = 0;

        const startHold = (e: PointerEvent) => {
            e.stopPropagation();
            e.preventDefault();
            this.ui.showUI(true);
            vibrate(10);

            isHolding = false;
            elapsed = 0;

            this.holdTimeout = setTimeout(() => {
                isHolding = true;
                this.holdInterval = setInterval(() => {
                    elapsed += MVC_CONFIG.SPEED_HOLD_INTERVAL_MS;
                    // Accelerate to 0.10x step after 1 second of holding
                    const step = elapsed > 1000 ? 0.10 : MVC_CONFIG.SPEED_HOLD_STEP;
                    this.adjustSpeed(dir * step, false);
                    vibrate(5);
                }, MVC_CONFIG.SPEED_HOLD_INTERVAL_MS);
            }, MVC_CONFIG.SPEED_HOLD_INITIAL_DELAY_MS);
        };

        const endHold = (e: PointerEvent) => {
            e.stopPropagation();
            clearTimeout(this.holdTimeout);
            clearInterval(this.holdInterval);

            if (!isHolding && e.type === 'pointerup') {
                // Short tap -> coarse step
                this.adjustSpeed(dir * MVC_CONFIG.SPEED_TAP_STEP, true);
            } else if (isHolding) {
                // Finished holding -> save final speed to settings
                const video = this.ui.store.activeVideo;
                if (video) {
                    this.ui.store.saveSetting('lastRate', video.playbackRate);
                    this.ui.showToast(`Speed: ${video.playbackRate.toFixed(2)}x`);
                }
            }

            isHolding = false;
            clearTimeout(this.ui.store.timers.hide);
            this.ui.store.timers.hide = setTimeout(() => this.ui.hideUI(), MVC_CONFIG.UI_FADE_TIMEOUT) as any;
        };

        btn.addEventListener('pointerdown', startHold);
        btn.addEventListener('pointerup', endHold);
        btn.addEventListener('pointerleave', endHold);
        btn.addEventListener('pointercancel', endHold);
    }

    private setupValHandlers(el: HTMLSpanElement) {
        el.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.ui.showUI(true);
            this.wasLongPress = false;

            this.longPressTimeout = setTimeout(() => {
                const video = this.ui.store.activeVideo;
                if (video) {
                    this.wasLongPress = true;
                    vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
                    this.eventBus.emit('video:rate-change-requested', { rate: 1.0, saveToSettings: true });
                    this.updateSpeedDisplay();
                    this.ui.showToast('Speed reset to 1.00x');
                }
            }, MVC_CONFIG.LONG_PRESS_DURATION_MS);
        });

        const cancelLongPress = () => {
            clearTimeout(this.longPressTimeout);
        };

        el.addEventListener('pointerup', (e) => {
            e.stopPropagation();
            cancelLongPress();
            if (this.wasLongPress) {
                this.wasLongPress = false;
                return;
            }
            const video = this.ui.store.activeVideo;
            if (video) {
                this.eventBus.emit('video:play-pause-requested', undefined);
                vibrate(10);
            }
        });

        el.addEventListener('pointerleave', cancelLongPress);
        el.addEventListener('pointercancel', cancelLongPress);
    }
}
