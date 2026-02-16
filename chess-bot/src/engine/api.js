import { API_URL, MULTIPV, ANALYZE_TIMEOUT_MS } from '../config.js';
import { BotState, PositionCache } from '../state.js';
import { scoreFrom, scoreNumeric } from '../utils.js';
import { LocalEngine } from './local-engine.js';

const localEngine = new LocalEngine();

export function analyzeLocally(fen, depth) {
    // console.log(`GabiBot: 🧠 Local engine analyzing FEN: ${fen.substring(0, 20)}... | Depth: ${depth}`);
    const start = performance.now();
    const result = localEngine.analyze(fen, depth);
    const elapsed = performance.now() - start;
    // console.log(`GabiBot: 🧠 Local engine done in ${elapsed.toFixed(0)}ms | ${result.nodes} nodes | Depth: ${result.depth} | Best: ${result.bestmove}`);
    return result;
}

export function resetEngine() {
    if (localEngine && typeof localEngine.clearTT === 'function') {
        localEngine.clearTT();
        // console.log('GabiBot: Engine TT cleared.');
    }
}

// ============================================================
// API FETCHING WITH LOCAL FALLBACK
// ============================================================

async function fetchEngineData(fen, depth, signal) {
    const startTime = performance.now();
    // console.log(`GabiBot: 📡 API request for FEN: ${fen.substring(0, 20)}... | Depth: ${depth}`);

    const call = async (params) => {
        const url = `${API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}&${params}`;
        return new Promise((resolve, reject) => {
            const abortHandler = () => reject(new DOMException('Aborted', 'AbortError'));
            if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
            signal?.addEventListener('abort', abortHandler, { once: true });

            const timeoutId = setTimeout(() => {
                signal?.removeEventListener('abort', abortHandler);
                reject(new Error('timeout'));
            }, ANALYZE_TIMEOUT_MS);

            if (typeof GM_xmlhttpRequest !== 'undefined') {
                const req = GM_xmlhttpRequest({
                    method: 'GET', url, headers: { Accept: 'application/json' },
                    onload: (r) => {
                        clearTimeout(timeoutId);
                        signal?.removeEventListener('abort', abortHandler);
                        if (r.status >= 200 && r.status < 300) {
                            try {
                                const data = JSON.parse(r.responseText);
                                if (data.success === false) reject(new Error('API success=false'));
                                else {
                                    resolve(data);
                                }
                            } catch { reject(new Error('Invalid JSON')); }
                        } else reject(new Error(`API error ${r.status}`));
                    },
                    onerror: () => { clearTimeout(timeoutId); signal?.removeEventListener('abort', abortHandler); reject(new Error('Network error')); },
                    ontimeout: () => { clearTimeout(timeoutId); signal?.removeEventListener('abort', abortHandler); reject(new Error('timeout')); }
                });
                signal?.addEventListener('abort', () => req.abort(), { once: true });
            } else {
                fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal })
                    .then(async res => {
                        clearTimeout(timeoutId);
                        if (!res.ok) throw new Error(`API error ${res.status}`);
                        const data = await res.json();
                        if (data.success === false) throw new Error('API success=false');
                        resolve(data);
                    })
                    .catch(err => { clearTimeout(timeoutId); signal?.removeEventListener('abort', abortHandler); reject(err); });
            }
        });
    };

    // Single API attempt — fail fast to local engine (was triple retry, wasting up to 9s)
    return await call(`multipv=${MULTIPV}&mode=bestmove`);
}

export async function fetchAnalysis(fen, depth, signal) {
    const cached = PositionCache.get(fen);
    if (cached) {
        // console.log('GabiBot: 🗃️ Using cached analysis');
        return cached;
    }

    if (signal?.aborted || !BotState.hackEnabled) throw new DOMException('Aborted', 'AbortError');

    // Local-only mode: skip API entirely
    if (BotState.analysisMode === 'local') {
        // console.log('GabiBot: 🔒 Local-only mode enforced');
        const res = analyzeLocally(fen, depth);
        // Simulate minimal async delay to not block UI
        await new Promise(r => setTimeout(r, 10));
        return res;
    }

    // Fire API call (non-blocking — network I/O runs in background)
    const apiPromise = fetchEngineData(fen, depth, signal)
        .then(data => ({ ok: true, data }))
        .catch(err => ({ ok: false, error: err }));

    // Run local engine speculatively while API is in-flight (~200-500ms)
    BotState.statusInfo = '🧠 Analyzing...';
    const localResult = analyzeLocally(fen, depth);

    // Yield to event loop so any already-arrived API response can settle
    const apiSettled = await Promise.race([
        apiPromise,
        new Promise(r => setTimeout(r, 10)).then(() => null)
    ]);

    // If API already returned successfully, prefer it (higher quality)
    if (apiSettled?.ok) {
        PositionCache.set(fen, apiSettled.data);
        return apiSettled.data;
    }

    // Use local result immediately, let API update cache in background
    if (localResult.success) {
        PositionCache.set(fen, localResult);
        // Fire-and-forget: API result silently upgrades cache for future lookups
        apiPromise.then(r => {
            if (r.ok) {
                PositionCache.set(fen, r.data);
            }
        });
        return localResult;
    }

    // Local failed — wait for API as last resort
    const apiResult = await apiPromise;
    if (apiResult.ok) {
        PositionCache.set(fen, apiResult.data);
        return apiResult.data;
    }
    if (apiResult.error?.name === 'AbortError') throw apiResult.error;
    throw new Error('Both API and local engine failed');
}

// ============================================================
// MOVE PARSING & ANALYSIS LOGIC
// ============================================================

export function parseBestLine(data) {
    const lines = [];
    const pushLine = (uci, pv, score) => {
        if (!uci || uci.length < 4) return;
        lines.push({ uci: uci.trim(), pv: (pv || '').trim(), score: score || {} });
    };
    const addFromArray = (arr) => arr.forEach(item => {
        const pv = item.pv || item.line || item.moves || '';
        const uci = item.uci || (pv ? pv.split(' ')[0] : '');
        const score = scoreFrom(item.score || item.evaluation || item.eval);
        pushLine(uci, pv, score);
    });

    if (Array.isArray(data.analysis)) addFromArray(data.analysis);
    else if (Array.isArray(data.lines)) addFromArray(data.lines);
    else if (Array.isArray(data.pvs)) addFromArray(data.pvs);

    if (!lines.length && typeof data.bestmove === 'string') {
        const parts = data.bestmove.split(' ');
        let uci = parts.length > 1 ? parts[1] : parts[0];
        if (uci === 'bestmove' && parts[1]) uci = parts[1];
        const pv = data.pv || data.continuation || uci;
        const score = scoreFrom(data.evaluation);
        pushLine(uci, pv, score);
    }
    lines.sort((a, b) => scoreNumeric(b.score) - scoreNumeric(a.score));
    return lines[0] || null;
}
