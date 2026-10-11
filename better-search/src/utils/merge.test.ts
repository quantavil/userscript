import { describe, it, expect } from 'vitest';
import { mergeDomainData, type DomainData } from './merge';

const data = (liked: string[], disliked: string[], timestamps: Record<string, number>): DomainData =>
    ({ liked, disliked, timestamps });

describe('mergeDomainData', () => {
    it('unions disjoint lists', () => {
        const merged = mergeDomainData(
            data(['a.com'], [], { 'a.com': 1 }),
            data(['b.com'], ['c.com'], { 'b.com': 1, 'c.com': 1 })
        );
        expect(merged.liked).toEqual(['a.com', 'b.com']);
        expect(merged.disliked).toEqual(['c.com']);
    });

    it('newer timestamp wins on conflicting state', () => {
        const merged = mergeDomainData(
            data(['x.com'], [], { 'x.com': 100 }),
            data([], ['x.com'], { 'x.com': 200 })
        );
        expect(merged.liked).toEqual([]);
        expect(merged.disliked).toEqual(['x.com']);
        expect(merged.timestamps['x.com']).toBe(200);
    });

    it('propagates deletions via newer tombstones', () => {
        const merged = mergeDomainData(
            data(['x.com'], [], { 'x.com': 100 }),
            data([], [], { 'x.com': 300 }) // remote deleted x.com later
        );
        expect(merged.liked).toEqual([]);
        expect(merged.disliked).toEqual([]);
        expect(merged.timestamps['x.com']).toBe(300);
    });

    it('does not resurrect deletions with older timestamps', () => {
        const merged = mergeDomainData(
            data([], [], { 'x.com': 300 }), // locally deleted later
            data(['x.com'], [], { 'x.com': 100 })
        );
        expect(merged.liked).toEqual([]);
    });

    it('prefers liked over disliked on exact timestamp ties', () => {
        const merged = mergeDomainData(
            data(['x.com'], [], { 'x.com': 100 }),
            data([], ['x.com'], { 'x.com': 100 })
        );
        expect(merged.liked).toEqual(['x.com']);
        expect(merged.disliked).toEqual([]);
    });
});
