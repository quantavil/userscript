import { debounce } from './utils.js';
import { GAME_CACHE_TTL } from './config.js';
import type { BotState as BotStateInterface, SettingsData } from './types/chess';

// Encapsulated state (avoid global pollution)
export const BotState: BotStateInterface = {
    hackEnabled: 0,
    botPower: 12,      // Depth (default 12)
    moveTime: 1000,    // Max Think Time (ms)
    autoMove: 1,
    currentEvaluation: '-',
    bestMove: '-',
    principalVariation: '-',
    statusInfo: 'Ready',
    premoveEnabled: 0,
    autoRematch: 0,
    moveMethod: 'click', // 'click' or 'drag'
    jitter: 0 // Random delay (ms)
};

// Position cache system (LRU)
class LRUCache<K, V> {
    limit: number;
    cache: Map<K, V>;

    constructor(limit = 2000) {
        this.limit = limit;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        const val = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.limit) {
            this.cache.delete(this.cache.keys().next().value!);
        }
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }
}

export const PositionCache = new LRUCache<string, any>(2000);

// Settings persistence
export const Settings = {
    save: debounce(() => {
        try {
            const menuWrap = document.querySelector('#menuWrap') as HTMLElement | null;
            const settings: SettingsData = {
                hackEnabled: BotState.hackEnabled,
                botPower: BotState.botPower,
                moveTime: BotState.moveTime,
                autoMove: BotState.autoMove,
                premoveEnabled: BotState.premoveEnabled,
                autoRematch: BotState.autoRematch,
                moveMethod: BotState.moveMethod,
                jitter: BotState.jitter,
                menuPosition: menuWrap ? { top: menuWrap.style.top, left: menuWrap.style.left } : null
            };
            localStorage.setItem('gabibot_settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }, 200),
    load(): SettingsData | null {
        try {
            const saved = localStorage.getItem('gabibot_settings');
            if (!saved) return null;
            const s = JSON.parse(saved) as Partial<SettingsData>;
            BotState.hackEnabled = s.hackEnabled ?? 0;
            BotState.botPower = s.botPower ?? 12;
            BotState.moveTime = s.moveTime ?? 1000;
            BotState.autoMove = s.autoMove ?? 1;
            BotState.premoveEnabled = s.premoveEnabled ?? 0;
            BotState.autoRematch = s.autoRematch ?? 0;
            BotState.moveMethod = s.moveMethod ?? 'click';
            BotState.jitter = s.jitter ?? 0;
            return s as SettingsData;
        } catch (e) {
            console.error('Failed to load settings:', e);
            return null;
        }
    }
};

// Game helpers & Cache
let cachedGame: any = null;
let cachedGameTimestamp = 0;

let cachedBoardFlipped = false;
let cachedFlipTimestamp = 0;

// Need a way to inject board access or generic way to get board
export const getBoard = (): HTMLElement | null => 
    document.querySelector('chess-board') || 
    document.querySelector('.board') || 
    document.querySelector('[class*="board"]') as HTMLElement | null;

export const getGame = (): any => {
    const now = Date.now();
    if (cachedGame && (now - cachedGameTimestamp) < GAME_CACHE_TTL) {
        return cachedGame;
    }
    const board = getBoard();
    cachedGame = board ? (board as any).game || null : null;
    cachedGameTimestamp = now;
    return cachedGame;
};

export const getFen = (g: any): string | null => { try { return g?.getFEN ? g.getFEN() : null; } catch { return null; } };
export const getPlayerColor = (g: any): string => { try { const v = g?.getPlayingAs?.(); return v === 2 ? 'b' : 'w'; } catch { return 'w'; } };
export const getSideToMove = (g: any): string | null => { const fen = getFen(g); return fen ? (fen.split(' ')[1] || null) : null; };
export const isPlayersTurn = (g: any): boolean => { const me = getPlayerColor(g), stm = getSideToMove(g); return !!me && !!stm && me === stm; };
export const pa = (): number => (getGame()?.getPlayingAs ? getGame().getPlayingAs() : 1);

export function isBoardFlipped(): boolean {
    const now = Date.now();
    if ((now - cachedFlipTimestamp) < 1000) return cachedBoardFlipped;

    const el = getBoard();
    let flipped = false;

    try {
        const attr = el?.getAttribute?.('orientation');
        if (attr === 'black') flipped = true;
        else if (attr === 'white') flipped = false;
        else if (el?.classList?.contains('flipped')) flipped = true;
        else if (getGame()?.getPlayingAs?.() === 2) flipped = true;
    } catch { }

    cachedBoardFlipped = flipped;
    cachedFlipTimestamp = now;
    return flipped;
}

export function invalidateGameCache(): void {
    cachedGame = null;
    cachedGameTimestamp = 0;
}
