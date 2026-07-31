// src/utils/json.ts

/**
 * A robust JSON parser that handles trailing commas and comments (// and /* *\/)
 * Often needed for user-authored lists (e.g. Github Gists).
 */
export function parseJsonRobust(text: string): any {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    
    let inString = false, escape = false, out = '', lastCommaIdx = -1;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            out += char;
            if (escape) escape = false;
            else if (char === '\\') escape = true;
            else if (char === '"') inString = false;
        } else if (char === '/' && text[i + 1] === '/') {
            while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
            out += '\n';
        } else if (char === '/' && text[i + 1] === '*') {
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
            i++;
        } else {
            if (char === '"') inString = true;
            
            if (char === ',') {
                lastCommaIdx = out.length;
            } else if ((char === '}' || char === ']') && lastCommaIdx !== -1) {
                if (!/\S/.test(out.slice(lastCommaIdx + 1))) {
                    out = out.slice(0, lastCommaIdx) + out.slice(lastCommaIdx + 1);
                }
                lastCommaIdx = -1;
            } else if (!/\s/.test(char)) {
                lastCommaIdx = -1;
            }
            out += char;
        }
    }
    return JSON.parse(out);
}
