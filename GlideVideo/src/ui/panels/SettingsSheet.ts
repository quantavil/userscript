// src/ui/panels/SettingsSheet.ts
import { EventBus } from '../../events/EventBus';
import { StateStore } from '../../core/StateStore';
import { UIManager } from '../UIManager';
import { Stepper } from '../components/Stepper';
import { Switch } from '../components/Switch';
import { SegmentedControl } from '../components/SegmentedControl';
import { Slider } from '../components/Slider';
import { vibrate, clamp } from '../../utils';

export class SettingsSheet {
    private element!: HTMLDivElement;
    public defaultSpeedStepper!: Stepper;
    public skipStepper!: Stepper;
    public ratioControl!: SegmentedControl;
    public zoomSlider!: Slider;
    public gestureSwitch!: Switch;
    public preloadSwitch!: Switch;
    public volumeBoostSwitch!: Switch;
    public scrollCompSwitch!: Switch;

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore,
        private readonly ui: UIManager
    ) {
        this.element = this.render();
    }

    private render(): HTMLDivElement {
        const sheet = document.createElement('div');
        sheet.className = 'mvc-settings-sheet';

        // Header
        const header = document.createElement('div');
        header.className = 'mvc-settings-header';

        const title = document.createElement('div');
        title.className = 'mvc-settings-title';
        title.textContent = 'Settings';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'mvc-settings-close-btn';
        closeBtn.appendChild(this.ui.getIcon('close'));
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            vibrate(10);
            this.ui.hideAllMenus();
        };

        header.append(title, closeBtn);
        sheet.appendChild(header);

        // Card Container
        const card = document.createElement('div');
        card.className = 'mvc-settings-card';
        sheet.appendChild(card);

        // 1. Default Speed Stepper
        this.defaultSpeedStepper = new Stepper(
            'Default Speed:',
            v => `${v.toFixed(2)}x`,
            () => this.store.settings.defaultSpeed,
            (dir) => {
                const step = 0.05;
                const next = clamp(this.store.settings.defaultSpeed + dir * step, 0.1, 16.0);
                this.store.saveSetting('defaultSpeed', next);
            }
        );
        card.appendChild(this.defaultSpeedStepper.dom);

        // 2. Skip Duration Stepper
        this.skipStepper = new Stepper(
            'Skip Duration:',
            v => `${v}s`,
            () => this.store.settings.skipSeconds,
            (dir) => {
                const step = 5;
                const next = clamp(this.store.settings.skipSeconds + dir * step, 5, 300);
                this.store.saveSetting('skipSeconds', next);
            }
        );
        card.appendChild(this.skipStepper.dom);

        // 3. Aspect Ratio Segmented Control
        this.ratioControl = new SegmentedControl(
            ['fit', 'fill', 'stretch'],
            this.store.settings.transform.ratio,
            (selected) => {
                this.store.settings.transform.ratio = selected;
                this.store.saveSetting('transform', this.store.settings.transform);
                this.eventBus.emit('video:transform-need-update', undefined);
            }
        );
        const ratioRow = document.createElement('div');
        ratioRow.className = 'mvc-settings-row';
        const ratioLabel = document.createElement('label');
        ratioLabel.className = 'mvc-settings-label';
        ratioLabel.textContent = 'Aspect Ratio:';
        ratioRow.append(ratioLabel, this.ratioControl.dom);
        card.appendChild(ratioRow);

        // 4. Zoom Level Slider Row
        this.zoomSlider = new Slider(
            'Zoom Level:',
            {
                min: 0.5, max: 3, step: 0.05, value: this.store.settings.transform.zoom,
                oninput: (v: string) => {
                    this.store.settings.transform.zoom = parseFloat(v);
                    this.eventBus.emit('video:transform-need-update', undefined);
                },
                onchange: () => this.store.saveSetting('transform', this.store.settings.transform)
            },
            v => `${Math.round(parseFloat(v) * 100)}%`
        );
        card.appendChild(this.zoomSlider.dom);

        // 5. Rotation & Reset grid
        const gridContainer = document.createElement('div');
        gridContainer.className = 'mvc-settings-grid';
        
        const rotateBtn = document.createElement('button');
        rotateBtn.className = 'mvc-grid-btn';
        rotateBtn.appendChild(this.ui.getIcon('rotate'));
        const rotateLabel = document.createElement('span');
        rotateLabel.textContent = 'Rotate';
        rotateBtn.appendChild(rotateLabel);
        rotateBtn.onclick = (e) => {
            e.stopPropagation();
            vibrate(10);
            this.store.settings.transform.rotation = (this.store.settings.transform.rotation + 90) % 360;
            this.store.saveSetting('transform', this.store.settings.transform);
            this.eventBus.emit('video:transform-need-update', undefined);
        };

        const transformResetBtn = document.createElement('button');
        transformResetBtn.className = 'mvc-grid-btn';
        transformResetBtn.appendChild(this.ui.getIcon('reset'));
        const resetLabel = document.createElement('span');
        resetLabel.textContent = 'Reset All';
        transformResetBtn.appendChild(resetLabel);
        transformResetBtn.onclick = (e) => {
            e.stopPropagation();
            vibrate(10);
            this.store.saveSetting('transform', { ratio: 'fit', zoom: 1, rotation: 0 });
            this.ratioControl.setSelected('fit');
            this.zoomSlider.updateValue('1');
            
            this.store.saveSetting('defaultSpeed', 1.0);
            this.store.saveSetting('skipSeconds', 10);
            this.store.saveSetting('gesturesEnabled', true);
            this.store.saveSetting('preloadEnhanced', false);
            this.store.saveSetting('volumeBoostEnabled', true);
            this.store.saveSetting('scrollCompatibility', true);
            this.updateUI();

            this.eventBus.emit('video:transform-need-update', undefined);
            this.ui.showToast('Reset settings to default');
        };
        
        gridContainer.append(rotateBtn, transformResetBtn);
        card.appendChild(gridContainer);

        // 6. Swipe & Hold Gestures Switch
        this.gestureSwitch = new Switch(
            'Gestures:',
            this.store.settings.gesturesEnabled,
            (isChecked) => {
                this.store.saveSetting('gesturesEnabled', isChecked);
            }
        );
        card.appendChild(this.gestureSwitch.dom);

        // 7. Aggressive Preloading Switch
        this.preloadSwitch = new Switch(
            'Preloading:',
            this.store.settings.preloadEnhanced,
            (isChecked) => {
                this.store.saveSetting('preloadEnhanced', isChecked);
            }
        );
        card.appendChild(this.preloadSwitch.dom);

        // 8. Volume Boost Switch
        this.volumeBoostSwitch = new Switch(
            'Volume Boost:',
            this.store.settings.volumeBoostEnabled,
            (isChecked) => {
                this.store.saveSetting('volumeBoostEnabled', isChecked);
            }
        );
        card.appendChild(this.volumeBoostSwitch.dom);

        // 9. Scroll Compatibility Switch
        this.scrollCompSwitch = new Switch(
            'Scroll Feed Compat:',
            this.store.settings.scrollCompatibility,
            (isChecked) => {
                this.store.saveSetting('scrollCompatibility', isChecked);
            }
        );
        card.appendChild(this.scrollCompSwitch.dom);

        return sheet;
    }

    public get dom(): HTMLDivElement {
        return this.element;
    }

    public updateUI(): void {
        this.defaultSpeedStepper.update();
        this.skipStepper.update();
        this.ratioControl.setSelected(this.store.settings.transform.ratio);
        this.zoomSlider.updateValue(this.store.settings.transform.zoom);
        this.gestureSwitch.setChecked(this.store.settings.gesturesEnabled);
        this.preloadSwitch.setChecked(this.store.settings.preloadEnhanced);
        this.volumeBoostSwitch.setChecked(this.store.settings.volumeBoostEnabled);
        this.scrollCompSwitch.setChecked(this.store.settings.scrollCompatibility);
    }
}
