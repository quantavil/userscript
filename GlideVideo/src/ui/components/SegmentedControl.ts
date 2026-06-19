// src/ui/components/SegmentedControl.ts
import { vibrate } from '../../utils';

export class SegmentedControl {
    private element!: HTMLDivElement;
    private indicator!: HTMLDivElement;
    private buttons: HTMLButtonElement[] = [];

    constructor(
        private options: string[],
        private selected: string,
        private onSelect: (selected: string) => void
    ) {
        this.element = this.render();
        this.updateUI();
    }

    private render(): HTMLDivElement {
        const control = document.createElement('div');
        control.className = 'mvc-segmented-control';

        this.indicator = document.createElement('div');
        this.indicator.className = 'mvc-segmented-indicator';
        control.appendChild(this.indicator);

        this.options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'mvc-segment-btn';
            btn.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            btn.onclick = (e) => {
                e.stopPropagation();
                vibrate(10);
                this.selected = opt;
                this.updateUI();
                this.onSelect(opt);
            };
            control.appendChild(btn);
            this.buttons.push(btn);
        });

        return control;
    }

    private updateUI(): void {
        const idx = this.options.indexOf(this.selected);
        if (idx !== -1) {
            this.indicator.style.transform = `translateX(${idx * 100}%)`;
            this.buttons.forEach((btn, i) => {
                btn.classList.toggle('active', i === idx);
            });
        }
    }

    public get dom(): HTMLDivElement {
        return this.element;
    }

    public setSelected(selected: string): void {
        this.selected = selected;
        this.updateUI();
    }
}
