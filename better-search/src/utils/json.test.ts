import { describe, it, expect } from 'vitest';
import { parseJsonRobust } from './json';

describe('parseJsonRobust', () => {
    it('parses plain JSON', () => {
        expect(parseJsonRobust('{"a": 1}')).toEqual({ a: 1 });
    });

    it('strips a BOM', () => {
        expect(parseJsonRobust('﻿{"a": 1}')).toEqual({ a: 1 });
    });

    it('removes line and block comments', () => {
        expect(parseJsonRobust('{\n// comment\n"a": 1 /* block */\n}')).toEqual({ a: 1 });
    });

    it('removes trailing commas in objects and arrays', () => {
        expect(parseJsonRobust('{"a": [1, 2, ], }')).toEqual({ a: [1, 2] });
        expect(parseJsonRobust('{"a": 1,\n}')).toEqual({ a: 1 });
    });

    it('does not mangle comment-like or comma content inside strings', () => {
        expect(parseJsonRobust('{"url": "https://x.com", "s": "a,{}"}')).toEqual({ url: 'https://x.com', s: 'a,{}' });
        expect(parseJsonRobust('{"s": "tricky \\" , }"}')).toEqual({ s: 'tricky " , }' });
    });

    it('throws on invalid JSON', () => {
        expect(() => parseJsonRobust('{nope}')).toThrow();
    });
});
