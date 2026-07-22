import { UIComponent } from '../UIComponent';
import { vibrate } from '../../utils';

export class Stepper extends UIComponent {
    private valEl!: HTMLSpanElement;

    constructor(
        private label: string,
        private valFmt: (v: number) => string,
        private getVal: () => number,
        private onAdjust: (dir: number) => void
    ) {
        super();
        this.element = this.render();
    }

    protected render(): HTMLDivElement {
        const row = document.createElement('div');
        row.className = 'mvc-settings-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'mvc-settings-label';
        labelEl.textContent = this.label;

        const stepper = document.createElement('div');
        stepper.className = 'mvc-stepper';

        const decBtn = document.createElement('button');
        decBtn.className = 'mvc-stepper-btn';
        decBtn.textContent = '-';

        this.valEl = document.createElement('span');
        this.valEl.className = 'mvc-stepper-val';
        this.valEl.textContent = this.valFmt(this.getVal());

        const incBtn = document.createElement('button');
        incBtn.className = 'mvc-stepper-btn';
        incBtn.textContent = '+';

        decBtn.onclick = (e) => {
            e.stopPropagation();
            vibrate(10);
            this.onAdjust(-1);
            this.update();
        };

        incBtn.onclick = (e) => {
            e.stopPropagation();
            vibrate(10);
            this.onAdjust(1);
            this.update();
        };

        stepper.append(decBtn, this.valEl, incBtn);
        row.append(labelEl, stepper);
        return row;
    }

    public update(): void {
        this.valEl.textContent = this.valFmt(this.getVal());
    }
}
