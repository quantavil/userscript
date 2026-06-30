/// <reference path="../types.d.ts" />
// src/core/GistSync.ts
import { Store } from './Store';
import { SVF_CONFIG } from '../config';
import { parseJsonRobust } from '../utils/json';

export class GistSync {
    private _store: Store;
    private _pushTimer: ReturnType<typeof setTimeout> | null = null;
    private _pullInterval: ReturnType<typeof setInterval> | null = null;
    private _isSyncing = false;

    constructor(store: Store) {
        this._store = store;
        this._store.setSyncPushCallback(() => this._schedulePush());
    }

    /** Helper for GM_xmlhttpRequest wrapped in a Promise */
    private _xhr(method: string, url: string, token: string, body?: any): Promise<GM_Response> {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                reject(new Error('GM_xmlhttpRequest not available'));
                return;
            }

            const headers: Record<string, string> = {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            if (body) {
                headers['Content-Type'] = 'application/json';
            }

            GM_xmlhttpRequest({
                method,
                url,
                headers,
                data: body ? JSON.stringify(body) : undefined,
                onload: (resp) => {
                    if (resp.status >= 200 && resp.status < 300) {
                        resolve(resp);
                    } else {
                        reject(new Error(`GitHub API Error: ${resp.status} ${resp.responseText}`));
                    }
                },
                onerror: (resp) => reject(new Error(`Network error: ${resp.statusText || 'Unknown'}`)),
                ontimeout: () => reject(new Error('Request timed out')),
                timeout: 15000,
            });
        });
    }

    /** Pulls domains from Gist.
     * Mode 'replace' completely replaces local lists.
     * Mode 'union' merges remote into local lists.
     */
    async pull(mode: 'replace' | 'union' = 'replace', isInternal = false): Promise<number> {
        const token = this._store.gistToken;
        const gistId = this._store.gistId;

        if (!token) throw new Error('No GitHub token configured');
        if (!gistId) throw new Error('No Gist ID configured');

        if (this._isSyncing && !isInternal) {
            console.warn('[SVF] Pull skipped: Sync already in progress');
            return 0;
        }

        if (!isInternal) this._isSyncing = true;
        try {
            const url = `https://api.github.com/gists/${gistId}`;
            const resp = await this._xhr('GET', url, token);
            const data = JSON.parse(resp.responseText);

            const fileObj = data.files[SVF_CONFIG.GIST_FILENAME];
            if (!fileObj || !fileObj.content) {
                throw new Error(`File ${SVF_CONFIG.GIST_FILENAME} not found in Gist`);
            }

            const remote = parseJsonRobust(fileObj.content);
            const rLiked = Array.isArray(remote.liked) ? remote.liked : [];
            const rDisliked = Array.isArray(remote.disliked) ? remote.disliked : [];

            let liked = rLiked;
            let disliked = rDisliked;
            let mergedTimestamps = remote.timestamps || {};
            const local = this._store.exportDomains();

            if (mode === 'union') {
                const localTimestamps = local.timestamps || {};
                const remoteTimestamps = remote.timestamps || {};
                
                const allDomains = new Set([
                    ...Object.keys(localTimestamps),
                    ...Object.keys(remoteTimestamps),
                    ...local.liked,
                    ...local.disliked,
                    ...rLiked,
                    ...rDisliked
                ]);
                
                const mergedLikedList: string[] = [];
                const mergedDislikedList: string[] = [];
                mergedTimestamps = {};
                
                for (const d of allDomains) {
                    const localTs = localTimestamps[d] || 0;
                    const remoteTs = remoteTimestamps[d] || 0;
                    
                    let localState: 'liked' | 'disliked' | 'deleted' = 'deleted';
                    if (local.liked.includes(d)) localState = 'liked';
                    else if (local.disliked.includes(d)) localState = 'disliked';
                    
                    let remoteState: 'liked' | 'disliked' | 'deleted' = 'deleted';
                    if (rLiked.includes(d)) remoteState = 'liked';
                    else if (rDisliked.includes(d)) remoteState = 'disliked';
                    
                    let finalState: 'liked' | 'disliked' | 'deleted';
                    let finalTs: number;
                    
                    if (localTs > remoteTs) {
                        finalState = localState;
                        finalTs = localTs;
                    } else if (remoteTs > localTs) {
                        finalState = remoteState;
                        finalTs = remoteTs;
                    } else {
                        if (localState === remoteState) {
                            finalState = localState;
                        } else if (localState === 'liked' || remoteState === 'liked') {
                            finalState = 'liked';
                        } else if (localState === 'disliked' || remoteState === 'disliked') {
                            finalState = 'disliked';
                        } else {
                            finalState = 'deleted';
                        }
                        finalTs = localTs || remoteTs || Date.now();
                    }
                    
                    mergedTimestamps[d] = finalTs;
                    if (finalState === 'liked') {
                        mergedLikedList.push(d);
                    } else if (finalState === 'disliked') {
                        mergedDislikedList.push(d);
                    }
                }
                
                liked = mergedLikedList.sort();
                disliked = mergedDislikedList.sort();
            }

            this._store.replaceDomains({ liked, disliked, timestamps: mergedTimestamps });
            return mode === 'replace' ? (liked.length + disliked.length) : (liked.length + disliked.length - local.liked.length - local.disliked.length);
        } finally {
            if (!isInternal) this._isSyncing = false;
        }
    }

    /** Pushes domains to Gist. Pulls first to perform a union merge to avoid conflict.
     * Creates Gist if gistId is not set.
     */
    async push(): Promise<void> {
        const token = this._store.gistToken;
        const gistId = this._store.gistId;

        if (!token) throw new Error('No GitHub token configured');

        if (this._isSyncing) {
            console.warn('[SVF] Push skipped: Sync already in progress');
            return;
        }

        this._isSyncing = true;
        try {
            if (gistId) {
                try {
                    await this.pull('union', true);
                } catch (err) {
                    console.warn('[SVF] Pre-push pull failed, continuing push directly:', err);
                }
            }

            const localData = this._store.exportDomains();
            const body = {
                description: 'Better Search Domain Filters Backup',
                files: {
                    [SVF_CONFIG.GIST_FILENAME]: {
                        content: JSON.stringify(localData, null, 2),
                    },
                },
            };

            const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
            const method = gistId ? 'PATCH' : 'POST';
            const resp = await this._xhr(method, url, token, gistId ? body : { ...body, public: false });
            
            if (!gistId) {
                const resData = JSON.parse(resp.responseText);
                if (resData && resData.id) {
                    this._store.setGistId(resData.id);
                } else {
                    throw new Error('Gist created but no ID was returned by GitHub');
                }
            }
        } finally {
            this._isSyncing = false;
        }
    }

    /** Enable automatic periodic pull (every 1 hour) and setup change listeners */
    enableAutoSync(): void {
        this.disableAutoSync();

        if (this._store.syncEnabled && this._store.gistToken && this._store.gistId) {
            // Trigger an initial pull immediately
            (async () => {
                try {
                    console.log('[SVF] Initial auto-sync pull starting...');
                    await this.pull('union');
                    console.log('[SVF] Initial auto-sync pull successful');
                } catch (err) {
                    console.error('[SVF] Initial auto-sync pull failed:', err);
                }
            })();

            // Setup periodic pull every 1 hour (3600000 ms)
            this._pullInterval = setInterval(async () => {
                if (this._isSyncing) return;
                try {
                    console.log('[SVF] Periodic Gist pull starting...');
                    await this.pull('union');
                    console.log('[SVF] Periodic Gist pull successful');
                } catch (err) {
                    console.error('[SVF] Periodic Gist pull failed:', err);
                }
            }, 3600000);
        }
    }

    disableAutoSync(): void {
        if (this._pullInterval) {
            clearInterval(this._pullInterval);
            this._pullInterval = null;
        }
        if (this._pushTimer) {
            clearTimeout(this._pushTimer);
            this._pushTimer = null;
        }
    }

    private _schedulePush(): void {
        if (this._pushTimer) {
            clearTimeout(this._pushTimer);
        }
        this._pushTimer = setTimeout(async () => {
            if (!this._store.syncEnabled || !this._store.gistToken) return;
            if (this._isSyncing) {
                // Defer pushing since sync is currently in progress
                this._schedulePush();
                return;
            }
            try {
                console.log('[SVF] Auto Gist push starting...');
                await this.push();
                console.log('[SVF] Auto Gist push successful');
            } catch (err) {
                console.error('[SVF] Auto Gist push failed:', err);
            }
        }, SVF_CONFIG.SYNC_PUSH_DEBOUNCE_MS);
    }

    destroy(): void {
        this.disableAutoSync();
        this._store.setSyncPushCallback(undefined);
    }
}
