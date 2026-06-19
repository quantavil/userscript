// src/ui/components/Slider.ts
import { vibrate } from '../../utils';

export class Slider {
    private element!: HTMLDivElement;
    public slider!: HTMLInputElement;
    public valueEl!: HTMLSpanElement;

    constructor(
        private label: string,
        private props: Record<string, any>,
        private valFmt: (v: any) => string
    ) {
        this.element = this.render();
    }

    private render(): HTMLDivElement {
        const row = document.createElement('div');
        row.className = 'mvc-settings-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'mvc-settings-label';
        labelEl.textContent = this.label;

        const sliderWrap = document.createElement('div');
        sliderWrap.className = 'mvc-settings-slider-wrap';

        this.slider = document.createElement('input');
        this.slider.className = 'mvc-settings-slider';
        this.slider.type = 'range';
        
        for (const [k, v] of Object.entries(this.props)) {
            if (k !== 'oninput' && k !== 'onchange') {
                this.slider.setAttribute(k, String(v));
            }
        }

        this.valueEl = document.createElement('span');
        this.valueEl.className = 'mvc-settings-value';
        this.valueEl.textContent = this.valFmt(this.props.value);

        this.slider.addEventListener('pointerdown', () => vibrate(10));
        
        this.slider.oninput = (e) => {
            const val = (e.target as HTMLInputElement).value;
            this.valueEl.textContent = this.valFmt(val);
            if (this.props.oninput) this.props.oninput(val);
        };

        this.slider.onchange = (e) => {
            if (this.props.onchange) this.props.onchange((e.target as HTMLInputElement).value);
        };

        sliderWrap.append(this.slider, this.valueEl);
        row.append(labelEl, sliderWrap);
        return row;
    }

    public updateValue(v: any): void {
        this.slider.value = String(v);
        this.valueEl.textContent = this.valFmt(v);
    }

    public get dom(): HTMLDivElement {
        return this.element;
    }
}
