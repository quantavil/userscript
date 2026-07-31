import { PositionCache } from '../state.js';
import { scoreFrom, scoreNumeric } from '../utils.js';
import { LocalEngine } from './local-engine.js';

const localEngine = new LocalEngine();

export function analyzeLocally(fen: string, depth: number, timeLimit: number): any {
    const result = localEngine.analyze(fen, depth, timeLimit);
    return result;
}

export function resetEngine(): void {
    if (localEngine && typeof localEngine.reset === 'function') {
        localEngine.reset();
    } else if (localEngine && typeof localEngine.clearTT === 'function') {
        localEngine.clearTT();
    }
}

// ============================================================
// ANALYSIS LOGIC (LOCAL ONLY)
// ============================================================

export async function getAnalysis(fen: string, depth: number, timeLimit: number, signal?: AbortSignal): Promise<any> {
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

export interface BestLine {
    uci: string;
    pv: string;
    score: any;
}

export function parseBestLine(data: any): BestLine | null {
    const lines: BestLine[] = [];
    const pushLine = (uci: string | undefined, pv: string | undefined, score: any) => {
        if (!uci || uci.length < 4 || uci === '(none)' || !/^[a-h]/.test(uci)) return;
        lines.push({ uci: uci.trim(), pv: (pv || '').trim(), score: score || {} });
    };
    const addFromArray = (arr: any[]) => arr.forEach(item => {
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
