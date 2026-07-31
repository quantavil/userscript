// src/utils/merge.ts
//
// Timestamp-based union merge of two domain datasets. Pure so it can be
// unit-tested without touching GM storage or the network.

export interface DomainData {
    liked: string[];
    disliked: string[];
    timestamps: Record<string, number>;
}

type DomainState = 'liked' | 'disliked' | 'deleted';

/**
 * Merge `remote` into `local`: for each domain the side with the newer
 * timestamp wins. A domain absent from both lists but present in timestamps
 * is a tombstone (deleted). On timestamp ties, liked > disliked > deleted.
 */
export function mergeDomainData(local: DomainData, remote: DomainData): DomainData {
    const localTimestamps = local.timestamps || {};
    const remoteTimestamps = remote.timestamps || {};

    const allDomains = new Set([
        ...Object.keys(localTimestamps),
        ...Object.keys(remoteTimestamps),
        ...local.liked,
        ...local.disliked,
        ...remote.liked,
        ...remote.disliked,
    ]);

    const localLiked = new Set(local.liked);
    const localDisliked = new Set(local.disliked);
    const remoteLiked = new Set(remote.liked);
    const remoteDisliked = new Set(remote.disliked);

    const liked: string[] = [];
    const disliked: string[] = [];
    const timestamps: Record<string, number> = {};

    for (const d of allDomains) {
        const localTs = localTimestamps[d] || 0;
        const remoteTs = remoteTimestamps[d] || 0;

        const localState: DomainState =
            localLiked.has(d) ? 'liked' : localDisliked.has(d) ? 'disliked' : 'deleted';
        const remoteState: DomainState =
            remoteLiked.has(d) ? 'liked' : remoteDisliked.has(d) ? 'disliked' : 'deleted';

        let finalState: DomainState;
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

        timestamps[d] = finalTs;
        if (finalState === 'liked') {
            liked.push(d);
        } else if (finalState === 'disliked') {
            disliked.push(d);
        }
    }

    return { liked: liked.sort(), disliked: disliked.sort(), timestamps };
}
