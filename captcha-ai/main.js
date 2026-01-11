// ==UserScript==
// @name         Icegate Captcha Solver
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Solve Icegate captcha using Gemini AI
// @author       Antigravity
// @match        https://old.icegate.gov.in/*
// @match        https://enquiry.icegate.gov.in/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        apiKey: 'YOUR-API-KEY',
        model: 'gemma-3-27b-it',
        selectors: {
            captchaImage: '#capimg',
            inputField: '#captchaResp'
        }
    };

    /**
     * Convert an image element to a Base64 string using a canvas.
     * @param {HTMLImageElement} imgElement
     * @returns {string} Base64 encoded image data (without prefix)
     */
    function getBase64Image(imgElement) {
        const canvas = document.createElement("canvas");
        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imgElement, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg");
        return dataURL.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
    }

    /**
     * Call Gemini API to solve the captcha.
     * @param {string} base64Image
     * @returns {Promise<string>} Solved text
     */
    function solveCaptchaWithGemini(base64Image) {
        return new Promise((resolve, reject) => {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.model}:generateContent?key=${CONFIG.apiKey}`;

            const payload = {
                contents: [{
                    parts: [
                        { text: "Solve this captcha. Output ONLY the alphanumeric characters visible in the image. Do not include spaces or special characters." },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                }]
            };

            GM_xmlhttpRequest({
                method: "POST",
                url: apiUrl,
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(payload),
                onload: function (response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) {
                                resolve(text.trim().replace(/\s/g, '')); // Remove whitespace
                            } else {
                                reject("No text found in response");
                            }
                        } catch (e) {
                            reject("Failed to parse API response: " + e.message);
                        }
                    } else {
                        reject(`API Error: ${response.status} ${response.statusText}`);
                    }
                },
                onerror: function (error) {
                    reject("Network error: " + error);
                }
            });
        });
    }

    /**
     * Main execution function
     */
    async function runSolver() {
        const img = document.querySelector(CONFIG.selectors.captchaImage);
        const input = document.querySelector(CONFIG.selectors.inputField);

        if (!img || !input) {
            console.log("Icegate Solver: Captcha image or input not found.");
            return;
        }

        // Wait for image to load completely
        if (!img.complete || img.naturalWidth === 0) {
            await new Promise(r => img.onload = r);
        }

        console.log("Icegate Solver: Found captcha, processing...");

        // Visual indicator
        input.style.backgroundColor = "#fffae6";
        input.placeholder = "Solving...";

        try {
            const base64 = getBase64Image(img);
            const solution = await solveCaptchaWithGemini(base64);

            console.log("Icegate Solver: Solved ->", solution);
            input.value = solution;
            input.style.backgroundColor = "#e6fffa"; // Greenish tint on success

            // Trigger events to ensure JS validaters pick it up
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

        } catch (error) {
            console.error("Icegate Solver Error:", error);
            input.style.backgroundColor = "#ffe6e6"; // Red tint on error
            input.placeholder = "Error solving";
        }
    }

    // Observe logic to handle dynamic reloads (e.g. clicking refresh button)
    function init() {
        // Run initially
        runSolver();

        // If the user clicks the reload button, wait a bit and run again
        // Assuming reload button re-triggers image load. 
        // A simple MutationObserver on the image 'src' is robust.
        const img = document.querySelector(CONFIG.selectors.captchaImage);
        if (img) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        console.log("Icegate Solver: Captcha refreshed detected.");
                        // Small delay to ensure browser rendering or just let runSolver wait for load
                        setTimeout(runSolver, 500);
                    }
                });
            });
            observer.observe(img, { attributes: true });
        }

        // Add a manual trigger button just in case
        const btn = document.createElement('button');
        btn.textContent = "🤖 Solve";
        btn.type = "button";
        btn.style.cssText = "margin-left: 5px; padding: 2px 5px; cursor: pointer; font-size: 10px; background: #333; color: white; border: none; border-radius: 3px;";
        btn.onclick = (e) => { e.preventDefault(); runSolver(); };

        if (img && img.parentElement) {
            img.parentElement.appendChild(btn);
        }
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
