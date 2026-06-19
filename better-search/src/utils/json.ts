// src/utils/json.ts

/**
 * A robust JSON parser that handles trailing commas and comments (// and /* *\/)
 * Often needed for user-authored lists (e.g. Github Gists).
 */
export function parseJsonRobust(text: string): any {
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    
    let inString = false;
    let escape = false;
    let out = '';
    let lastCommaIdx = -1;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            out += char;
            if (escape) {
                escape = false;
            } else if (char === '\\') {
                escape = true;
            } else if (char === '"') {
                inString = false;
            }
        } else {
            // Check for comment starts
            if (char === '/' && text[i + 1] === '/') {
                // skip to end of line
                while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
                    i++;
                }
                out += '\n';
            } else if (char === '/' && text[i + 1] === '*') {
                // skip to block comment end
                i += 2;
                while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
                    i++;
                }
                i++; // skip /
            } else {
                if (char === '"') {
                    inString = true;
                }
                
                // Track comma index to remove trailing commas
                if (char === ',') {
                    lastCommaIdx = out.length;
                    out += char;
                } else if ((char === '}' || char === ']') && lastCommaIdx !== -1) {
                    // Check if there is only whitespace between the comma and the closing bracket
                    let onlyWhitespace = true;
                    for (let j = lastCommaIdx + 1; j < out.length; j++) {
                        if (!/\s/.test(out[j])) {
                            onlyWhitespace = false;
                            break;
                        }
                    }
                    if (onlyWhitespace) {
                        // Remove the comma
                        out = out.slice(0, lastCommaIdx) + out.slice(lastCommaIdx + 1);
                    }
                    lastCommaIdx = -1;
                    out += char;
                } else {
                    if (!/\s/.test(char)) {
                        lastCommaIdx = -1;
                    }
                    out += char;
                }
            }
        }
    }
    return JSON.parse(out);
}
