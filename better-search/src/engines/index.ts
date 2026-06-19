// src/engines/index.ts
import type { EngineConfig } from '../types';
import { googleEngine } from './google';
import { bingEngine } from './bing';
import { ddgEngine } from './ddg';
import { braveEngine } from './brave';
import { yandexEngine } from './yandex';

const ENGINES: Array<{ pattern: RegExp; config: EngineConfig }> = [
    { pattern: /(?:^|\.)google\.[a-z]{2,6}(?:\.[a-z]{2,3})?$/i, config: googleEngine },
    { pattern: /(?:^|\.)bing\.com$/i, config: bingEngine },
    { pattern: /(?:^|\.)duckduckgo\.com$/i, config: ddgEngine },
    { pattern: /(?:^|\.)search\.brave\.com$/i, config: braveEngine },
    { pattern: /(?:^|\.)(?:yandex\.[a-z]{2,}|ya\.ru)$/i, config: yandexEngine },
];

export function detectEngine(): EngineConfig | null {
    const host = (import.meta.env.DEV ? (window as any).__svf_mock_host : null) || window.location.hostname;
    for (const { pattern, config } of ENGINES) {
        if (pattern.test(host)) {
            if (config.shouldActivate && !config.shouldActivate(new URL(window.location.href))) {
                continue;
            }
            return config;
        }
    }
    return null;
}
