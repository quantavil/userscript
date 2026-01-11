// ==UserScript==
// @name         Icegate Captcha Solver
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Solve Icegate captcha using Gemini AI with generalized support and UI
// @author       Antigravity
// @match        https://old.icegate.gov.in/*
// @match        https://enquiry.icegate.gov.in/*
// @match        https://foservices.icegate.gov.in/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        apiKey: 'AIzaSyDp4Ldwi-Pr4E3dfQiT2lyRa0-S57W0b5E',
        model: 'gemma-3-27b-it',
    };

    const SITES = [
        {
            name: 'Old Icegate / Enquiry',
            test: (url) => /old\.icegate\.gov\.in|enquiry\.icegate\.gov\.in/.test(url),
            selectors: {
                captchaSource: '#capimg', // Image element
                inputField: '#captchaResp',
                refreshBtn: '#refresh' // Assuming they have one, optional
            },
            type: 'image'
        },
        {
            name: 'FOServices',
            test: (url) => /foservices\.icegate\.gov\.in/.test(url),
            selectors: {
                captchaSource: '#canvas', // Canvas element
                inputField: 'input[formcontrolname="captcha"]',
                refreshBtn: '#reload-button'
            },
            type: 'canvas'
        }
    ];

    // --- Aesthetic UI Styles ---
    const STYLES = `
        .ice-solver-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            background: rgba(18, 18, 18, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            transform: translateY(0);
        }

        .ice-solver-widget.hidden {
            transform: translateY(120%);
        }

        .ice-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #666;
            transition: background 0.3s ease;
        }

        .ice-status-text {
            font-size: 13px;
            font-weight: 500;
            color: #e0e0e0;
            white-space: nowrap;
        }

        .ice-action-btn {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            border: none;
            border-radius: 6px;
            color: white;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .ice-action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }

        .ice-action-btn:active {
            transform: translateY(0);
        }

        .ice-action-btn.loading {
            opacity: 0.7;
            cursor: wait;
        }

        /* Status colors */
        .status-idle .ice-status-dot { background: #9ca3af; box-shadow: 0 0 8px rgba(156, 163, 175, 0.4); }
        .status-solving .ice-status-dot { background: #fbbf24; box-shadow: 0 0 12px rgba(251, 191, 36, 0.6); animation: pulse 1.5s infinite; }
        .status-success .ice-status-dot { background: #34d399; box-shadow: 0 0 12px rgba(52, 211, 153, 0.6); }
        .status-error .ice-status-dot { background: #f87171; box-shadow: 0 0 12px rgba(248, 113, 113, 0.6); }

        @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }
    `;

    // --- Solver Logic ---
    class IcegateSolver {
        constructor() {
            this.site = this.detectSite();
            if (!this.site) {
                console.log('Icegate Solver: No matching configuration for this site.');
                return;
            }
            this.injectStyles();
            this.createUI();
            this.init();
        }

        detectSite() {
            return SITES.find(s => s.test(window.location.href));
        }

        injectStyles() {
            if (typeof GM_addStyle !== 'undefined') {
                GM_addStyle(STYLES);
            } else {
                const style = document.createElement('style');
                style.textContent = STYLES;
                document.head.appendChild(style);
            }
        }

        createUI() {
            this.widget = document.createElement('div');
            this.widget.className = 'ice-solver-widget status-idle';
            this.widget.innerHTML = `
                <div class="ice-status-dot"></div>
                <span class="ice-status-text">Ready</span>
                <button class="ice-action-btn">Solve</button>
            `;

            this.statusDot = this.widget.querySelector('.ice-status-dot');
            this.statusText = this.widget.querySelector('.ice-status-text');
            this.solveBtn = this.widget.querySelector('.ice-action-btn');

            this.solveBtn.addEventListener('click', () => this.run());

            document.body.appendChild(this.widget);
        }

        updateStatus(status, text) {
            this.widget.className = `ice-solver-widget status-${status}`;
            this.statusText.textContent = text;
            if (status === 'solving') {
                this.solveBtn.textContent = '...';
                this.solveBtn.classList.add('loading');
            } else {
                this.solveBtn.textContent = 'Retry';
                this.solveBtn.classList.remove('loading');
            }
        }

        async getCaptchaImageBase64() {
            const el = document.querySelector(this.site.selectors.captchaSource);
            if (!el) throw new Error('Captcha element not found');

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (this.site.type === 'canvas') {
                // If the source is already a canvas
                if (el.tagName !== 'CANVAS') throw new Error('Expected Canvas element');
                // We need to clone it because we can't get data from a tainted canvas if it was tainted, 
                // but usually these are drawn by JS so we can just toDataURL on the original if allowed, 
                // OR we have to rely on the fact that we can read it.
                // If it's a Canvas element in DOM, we can just call toDataURL on it directly.
                return el.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '');

            } else {
                // Image element
                if (el.tagName !== 'IMG') throw new Error('Expected Image element');
                if (!el.complete || el.naturalWidth === 0) {
                    await new Promise(r => el.onload = r);
                }
                canvas.width = el.naturalWidth || el.width;
                canvas.height = el.naturalHeight || el.height;
                ctx.drawImage(el, 0, 0);
                return canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '');
            }
        }

        async solveWithGemini(base64Image) {
            return new Promise((resolve, reject) => {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;
                const payload = {
                    contents: [{
                        parts: [
                            { text: "Solve this captcha. Output ONLY the alphanumeric characters visible in the image. Do not include spaces or special characters." },
                            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                        ]
                    }]
                };

                GM_xmlhttpRequest({
                    method: "POST",
                    url: apiUrl,
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(payload),
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) resolve(text.trim().replace(/\s/g, ''));
                                else reject("No text in response");
                            } catch (e) { reject("Parse Error: " + e.message); }
                        } else {
                            reject(`API Error ${response.status}`);
                        }
                    },
                    onerror: (err) => reject("Network Error")
                });
            });
        }

        async run() {
            try {
                this.updateStatus('solving', 'Solving...');
                const base64 = await this.getCaptchaImageBase64();
                const solution = await this.solveWithGemini(base64);

                this.fillInput(solution);
                this.updateStatus('success', 'Solved');
                console.log('Icegate Solver: Solved ->', solution);

            } catch (error) {
                console.error('Icegate Solver:', error);
                this.updateStatus('error', 'Failed');
            }
        }

        fillInput(text) {
            const input = document.querySelector(this.site.selectors.inputField);
            if (!input) {
                console.warn('Input field not found to fill');
                return;
            }
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        init() {
            // Auto-run on load after a slight delay to ensure render
            setTimeout(() => this.run(), 1000);

            // Observe for refresh
            if (this.site.selectors.refreshBtn) {
                const btn = document.querySelector(this.site.selectors.refreshBtn);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.updateStatus('idle', 'Refreshed');
                        setTimeout(() => this.run(), 1000); // Wait for new captcha
                    });
                }
            }

            // Also monitor DOM for captcha replacement if possible
            // For Canvas, it's harder to watch src, so we might need a MutationObserver on the parent or just rely on the button.
            // For Image, we can watch src.
            if (this.site.selectors.captchaSource) {
                const el = document.querySelector(this.site.selectors.captchaSource);
                if (el && el.tagName === 'IMG') {
                    const observer = new MutationObserver((mutations) => {
                        for (const m of mutations) {
                            if (m.type === 'attributes' && m.attributeName === 'src') {
                                console.log('Captcha source changed, re-solving...');
                                setTimeout(() => this.run(), 500);
                            }
                        }
                    });
                    observer.observe(el, { attributes: true });
                }
            }
        }
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new IcegateSolver());
    } else {
        new IcegateSolver();
    }

})();
