import { PositionCache } from '../state.js';
import { scoreFrom, scoreNumeric } from '../utils.js';
import { LocalEngine } from './local-engine.js';

const localEngine = new LocalEngine();

export function analyzeLocally(fen, depth, timeLimit) {
    // console.log(`GabiBot: 🧠 Local engine analyzing FEN: ${fen.substring(0, 20)}... | Depth: ${depth} | Time: ${timeLimit}ms`);
    const start = performance.now();
    // Pass timeLimit to local engine if supported, otherwise just rely on depth/cutoff
    // (Assuming localEngine.analyze doesn't support timeLimit yet, we might need to update it too, 
    // but for now we follow the plan to just pass it in case)
    const result = localEngine.analyze(fen, depth, timeLimit);
    const elapsed = performance.now() - start;
    return result;
}

export function resetEngine() {
    if (localEngine && typeof localEngine.reset === 'function') {
        localEngine.reset();
    } else if (localEngine && typeof localEngine.clearTT === 'function') {
        localEngine.clearTT();
    }
}

// ============================================================
// ANALYSIS LOGIC (LOCAL ONLY)
// ============================================================

export async function getAnalysis(fen, depth, timeLimit, signal) {
    const cached = PositionCache.get(fen);
    if (cached) {
        return cached;
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // Local-only mode
    const res = analyzeLocally(fen, depth, timeLimit);

    // Minimal async delay to not block UI/event loop completely if sync
    await new Promise(r => setTimeout(r, 0));

    if (res.success && res.depth >= 1) {
        PositionCache.set(fen, res);
    }

    return res;
}

// ============================================================
// MOVE PARSING & ANALYSIS LOGIC
// ============================================================

export function parseBestLine(data) {
    const lines = [];
    const pushLine = (uci, pv, score) => {
        if (!uci || uci.length < 4 || uci === '(none)' || !/^[a-h]/.test(uci)) return;
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
