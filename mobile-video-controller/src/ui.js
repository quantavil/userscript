// src/ui.js – DOM construction & menu logic for MobileVideoController
'use strict';

const MVC_UI = {
    // ── Primitive builders ──────────────────────────────────────────────────
    createEl(tag, className, props = {}) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        for (const [k, v] of Object.entries(props)) {
            if (k === 'style') Object.assign(el.style, v);
            else el[k] = v;
        }
        return el;
    },

    createSvgIcon(pathData) {
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
    },

    getIcon(name) {
        const paths = {
            rewind:   'M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z',
            forward:  'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6-8.5-6z',
            settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.22-.07.49.12.61l2.03 1.58c-.04.3-.06.61-.06.94 0 .32.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
            close:    'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
        };
        return this.createSvgIcon(paths[name] || '');
    },

    // ── Main panel ──────────────────────────────────────────────────────────
    createMainUI() {
        this.ui.wrap       = this.createEl('div', 'mvc-ui-wrap');
        this.ui.panel      = this.createEl('div', 'mvc-panel');
        this.ui.backdrop   = this.createEl('div', 'mvc-backdrop');
        this.ui.toast      = this.createEl('div', 'mvc-toast');
        this.ui.speedToast = this.createEl('div', 'mvc-speed-toast');

        this.ui.wrap.style.zIndex = '2147483647';
        document.body.append(this.ui.backdrop, this.ui.toast, this.ui.speedToast);

        const makeBtn = (content, title, extraClass) => {
            const btn = this.createEl('button', `mvc-btn ${extraClass}`);
            if (content instanceof Element) btn.appendChild(content);
            else btn.textContent = content;
            btn.title = title;
            ['touchstart', 'touchend'].forEach(ev => btn.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
            btn.addEventListener('click',       e => e.stopPropagation());
            btn.addEventListener('pointerdown', () => this.showUI(true));
            return btn;
        };

        this.ui.rewindBtn   = makeBtn(this.getIcon('rewind'),   'Rewind',          'mvc-btn-rewind');
        this.ui.speedBtn    = makeBtn('1.0',                    'Playback speed',   'mvc-btn-speed');
        this.ui.forwardBtn  = makeBtn(this.getIcon('forward'),  'Forward',          'mvc-btn-forward');
        this.ui.settingsBtn = makeBtn(this.getIcon('settings'), 'Settings',         'mvc-btn-settings');

        this.ui.panel.append(this.ui.rewindBtn, this.ui.speedBtn, this.ui.forwardBtn, this.ui.settingsBtn);
        this.ui.wrap.append(this.ui.panel);
    },

    // ── Lazy menu builders ──────────────────────────────────────────────────
    ensureSkipMenu() {
        if (this.ui.skipMenu) return;
        this.ui.skipMenu = this.createEl('div', 'mvc-menu');
        Object.assign(this.ui.skipMenu.style, {
            flexDirection: 'row', gap: '1px', padding: '1px',
            flexWrap: 'nowrap', maxWidth: 'none', justifyContent: 'center'
        });

        MVC_CONFIG.DEFAULT_SKIP_DURATIONS.forEach(duration => {
            const opt = this.createEl('button', 'mvc-skip-btn', { textContent: `${duration}s` });
            opt.onclick = (e) => {
                e.stopPropagation();
                if (this.activeVideo && this.longPressDirection) {
                    this.activeVideo.currentTime = this.clampTime(
                        this.activeVideo.currentTime + this.longPressDirection * duration
                    );
                    this.showUI(true);
                    opt.style.transform = 'scale(0.9)';
                    setTimeout(() => opt.style.transform = 'scale(1)', 100);
                    this.showToast(`Skipped ${duration}s`);
                }
            };
            this.ui.skipMenu.appendChild(opt);
        });
        document.body.appendChild(this.ui.skipMenu);
    },

    ensureSpeedMenu() {
        if (this.ui.speedMenu) return;
        this.ui.speedMenu = this.createEl('div', 'mvc-menu mvc-speed-list');

        const makeOpt = (sp) => {
            const opt = this.createEl('div', 'mvc-menu-opt');
            opt.textContent    = sp === 0 ? 'Pause' : `${sp.toFixed(2)}x`;
            opt.dataset.sp     = String(sp);
            opt.style.color      = sp === 0 ? '#89cff0' : 'white';
            opt.style.fontWeight = sp === 0 ? '600'     : 'normal';
            opt.onclick = () => {
                if (!this.activeVideo) return this.hideAllMenus();
                const spv = Number(opt.dataset.sp);
                if (spv === 0) this.handlePlayPauseClick();
                else {
                    this.setPlaybackRate(spv);
                    if (this.activeVideo.paused) this.activeVideo.play();
                }
                this.hideAllMenus();
            };
            return opt;
        };

        MVC_CONFIG.DEFAULT_SPEEDS.forEach(sp => this.ui.speedMenu.appendChild(makeOpt(sp)));

        const customOpt = this.createEl('div', 'mvc-menu-opt', {
            style: { color: '#c5a5ff', fontWeight: '600' }
        });
        const input = this.createEl('input', '', {
            type: 'number', step: 0.05, placeholder: 'Custom',
            style: { width: '80%', background: 'transparent', border: 'none', color: 'inherit', textAlign: 'center', outline: 'none', fontSize: '15px' }
        });
        input.onclick   = e => e.stopPropagation();
        input.onkeydown = e => e.stopPropagation();
        input.onchange  = () => {
            if (!this.activeVideo) return this.hideAllMenus();
            const newRate = parseFloat(input.value);
            if (!isNaN(newRate) && newRate > 0 && newRate <= 16) {
                this.setPlaybackRate(newRate);
                if (this.activeVideo.paused) this.activeVideo.play();
            } else this.showToast('Invalid speed entered.');
            this.hideAllMenus();
        };
        customOpt.appendChild(input);
        this.ui.speedMenu.appendChild(customOpt);
        document.body.appendChild(this.ui.speedMenu);
    },

    ensureSettingsMenu() {
        if (this.ui.settingsMenu) return;
        this.ui.settingsMenu = this.createEl('div', 'mvc-menu', { style: { minWidth: '280px' } });

        const addSection = (t) => {
            this.ui.settingsMenu.appendChild(
                this.createEl('div', 'mvc-settings-section-title', { textContent: t })
            );
        };

        const createSliderRow = (label, props, fmt) => {
            const row     = this.createEl('div', 'mvc-menu-opt mvc-settings-row');
            const labelEl = this.createEl('label', 'mvc-settings-label', { textContent: label });
            const slider  = this.createEl('input', 'mvc-settings-slider', Object.assign({ type: 'range' }, props));
            const valueEl = this.createEl('span',  'mvc-settings-value',  { textContent: fmt(props.value) });
            slider.oninput  = (e) => { valueEl.textContent = fmt(e.target.value); if (props.oninput)  props.oninput(e.target.value); };
            slider.onchange = (e) => { if (props.onchange) props.onchange(e.target.value); };
            row.append(labelEl, slider, valueEl);
            return { row, slider, valueEl };
        };

        // Transform section
        addSection('Transform');
        const transformRow   = this.createEl('div', 'mvc-menu-opt mvc-settings-row');
        const ratioSelect    = this.createEl('select', 'mvc-settings-select');
        ['Fit', 'Fill', 'Stretch'].forEach(r => ratioSelect.add(new Option(r, r.toLowerCase())));
        ratioSelect.value    = this.settings.transform.ratio;
        ratioSelect.onchange = () => {
            this.settings.transform.ratio = ratioSelect.value;
            this.saveSetting('transform', this.settings.transform);
            this.applyVideoTransform();
        };
        const rotateBtn = this.createEl('button', 'mvc-settings-btn', { textContent: 'Rotate ↻' });
        rotateBtn.onclick = () => {
            this.settings.transform.rotation = (this.settings.transform.rotation + 90) % 360;
            this.saveSetting('transform', this.settings.transform);
            this.applyVideoTransform();
        };
        const transformResetBtn = this.createEl('button', 'mvc-settings-btn', { textContent: 'Reset' });
        const zoomControl = createSliderRow('Zoom:', {
            min: 0.5, max: 3, step: 0.05, value: this.settings.transform.zoom,
            oninput:  (v) => { this.settings.transform.zoom = parseFloat(v); this.applyVideoTransform(); },
            onchange: ()  => this.saveSetting('transform', this.settings.transform)
        }, v => `${Math.round(v * 100)}%`);
        transformResetBtn.onclick = () => {
            this.saveSetting('transform', { ratio: 'fit', zoom: 1, rotation: 0 });
            ratioSelect.value = 'fit';
            zoomControl.slider.value    = 1;
            zoomControl.valueEl.textContent = '100%';
            this.applyVideoTransform();
        };
        transformRow.append(ratioSelect, rotateBtn, transformResetBtn);
        this.ui.settingsMenu.appendChild(transformRow);
        this.ui.settingsMenu.appendChild(zoomControl.row);

        // Filters section
        addSection('Filters');
        const filterRow1   = this.createEl('div', 'mvc-menu-opt mvc-settings-row');
        const filterSelect = this.createEl('select', 'mvc-settings-select');
        const filterConfig = {
            brightness: [0, 2, 1, v => parseFloat(v).toFixed(2)],
            contrast:   [0, 2, 1, v => parseFloat(v).toFixed(2)],
            saturate:   [0, 3, 1, v => parseFloat(v).toFixed(2)]
        };
        Object.keys(filterConfig).forEach(f =>
            filterSelect.add(new Option(f.charAt(0).toUpperCase() + f.slice(1), f))
        );
        const onFilterInput  = (v) => { this.settings.filters[filterSelect.value] = v; this.applyVideoFilters(); };
        const onFilterChange = ()  => this.saveSetting('filters', this.settings.filters);
        const filterControl  = createSliderRow('Value:', { value: 1, oninput: onFilterInput, onchange: onFilterChange }, v => v);
        const updateFilterSlider = () => {
            const filter = filterSelect.value;
            const [min, max, def, formatter] = filterConfig[filter];
            filterControl.slider.min  = min;
            filterControl.slider.max  = max;
            filterControl.slider.step = (max - min) / 100;
            const currentValue = this.settings.filters[filter] ?? def;
            filterControl.slider.value = currentValue;
            const safeValue = isNaN(parseFloat(currentValue)) ? def : currentValue;
            filterControl.valueEl.textContent = formatter(safeValue);
            filterControl.row.querySelector('.mvc-settings-label').textContent =
                `${filter.charAt(0).toUpperCase() + filter.slice(1)}:`;
        };
        filterSelect.onchange = updateFilterSlider;
        const filterResetBtn  = this.createEl('button', 'mvc-settings-btn', { textContent: 'Reset' });
        filterResetBtn.onclick = () => { this.saveSetting('filters', {}); this.applyVideoFilters(); updateFilterSlider(); };
        filterRow1.append(filterSelect, filterResetBtn);
        this.ui.settingsMenu.appendChild(filterRow1);
        this.ui.settingsMenu.appendChild(filterControl.row);
        updateFilterSlider();

        // Playback & Audio section
        addSection('Playback & Audio');

        const settingsRow2 = this.createEl('div', 'mvc-menu-opt mvc-settings-row');
        const speedLabel   = this.createEl('label', 'mvc-settings-label', { textContent: 'Default Speed:' });
        const speedInput   = this.createEl('input', 'mvc-settings-input', { type: 'number', step: 0.05, value: this.settings.defaultSpeed });
        speedInput.onchange = () => {
            const val = parseFloat(speedInput.value);
            if (!isNaN(val) && val > 0 && val <= 16) this.saveSetting('defaultSpeed', val);
            else speedInput.value = this.settings.defaultSpeed;
        };
        const skipLabel = this.createEl('label', 'mvc-settings-label', { textContent: 'Skip Time:' });
        const skipInput = this.createEl('input', 'mvc-settings-input', { type: 'number', value: this.settings.skipSeconds });
        skipInput.onchange = () => {
            const val = parseInt(skipInput.value, 10);
            if (!isNaN(val) && val > 0) { this.saveSetting('skipSeconds', val); this.updateSkipButtonText(); }
            else skipInput.value = this.settings.skipSeconds;
        };
        settingsRow2.append(speedLabel, speedInput, skipLabel, skipInput);
        this.ui.settingsMenu.appendChild(settingsRow2);
        document.body.appendChild(this.ui.settingsMenu);
    },

    updateSkipButtonText() {
        this.ui.rewindBtn.title  = `Rewind ${this.settings.skipSeconds}s`;
        this.ui.forwardBtn.title = `Forward ${this.settings.skipSeconds}s`;
    },

    updateSpeedDisplay() {
        if (!this.activeVideo || !this.ui.speedBtn) return;
        if      (this.activeVideo.ended)  this.ui.speedBtn.textContent = 'Replay';
        else if (this.activeVideo.paused) this.ui.speedBtn.textContent = '▶︎';
        else this.ui.speedBtn.textContent = `${this.activeVideo.playbackRate.toFixed(2)}`;
        this.saveSetting('last_rate', String(this.activeVideo.playbackRate));
    },

    // ── Menu placement ──────────────────────────────────────────────────────
    placeMenu(menuEl, anchorEl) {
        const { w, h } = this.showAndMeasure(menuEl);
        const rect      = anchorEl.getBoundingClientRect();
        let left        = rect.left + rect.width / 2 - w / 2;
        const openAbove = rect.top - h - 8 >= MVC_CONFIG.EDGE;
        let top         = openAbove ? rect.top - h - 8 : rect.bottom + 8;

        if (menuEl === this.ui.speedMenu || menuEl === this.ui.settingsMenu) {
            menuEl.style.flexDirection = openAbove ? 'column-reverse' : 'column';
        }

        const v             = window.visualViewport;
        const viewportWidth  = v ? v.width  : window.innerWidth;
        const viewportHeight = v ? v.height : window.innerHeight;
        left = this.clamp(left, MVC_CONFIG.EDGE, viewportWidth  - w - MVC_CONFIG.EDGE);
        top  = this.clamp(top,  MVC_CONFIG.EDGE, viewportHeight - h - MVC_CONFIG.EDGE);
        menuEl.style.left = `${Math.round(left)}px`;
        menuEl.style.top  = `${Math.round(top)}px`;
    },

    toggleMenu(menuEl, anchorEl) {
        const isOpen = getComputedStyle(menuEl).display !== 'none';
        this.hideAllMenus();
        if (isOpen) return;
        this.placeMenu(menuEl, anchorEl);
        menuEl.style.display = 'flex';
        this.showBackdrop();
        clearTimeout(this.timers.hide);
    },

    showBackdrop() {
        this.ui.backdrop.style.display       = 'block';
        this.ui.backdrop.style.pointerEvents = 'none';
        setTimeout(() => {
            if (this.ui.backdrop) this.ui.backdrop.style.pointerEvents = 'auto';
        }, MVC_CONFIG.BACKDROP_POINTER_EVENTS_DELAY);
    },

    hideAllMenus() {
        Object.values(this.ui).forEach(el => {
            if (el?.classList?.contains && el.classList.contains('mvc-menu')) el.style.display = 'none';
        });
        this.ui.backdrop.style.display = 'none';
        this.showUI(true);
    }
};
