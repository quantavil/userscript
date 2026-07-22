export function beautifyMarkdown(markdown: string): string {
    // 0. Protect fenced code blocks from global transformations
    const blocks: string[] = [];
    let result = markdown.replace(/```[\s\S]*?```/g, (m) => {
        blocks.push(m);
        return `\x00TB_CODE_${blocks.length - 1}\x00`;
    });

    // 1. Deduplicate placeholder text if the original text already existed right below/above the image
    result = result.replace(/(\*\*ALTERNATE METHOD\*\*)\s*\n\s*\1/g, '$1');
    result = result.replace(/(\*\*💡IMPORTANT POINT\*\*)\s*\n\s*\1/g, '$1');
    result = result.replace(/(✅)\s*\n\s*\1/g, '$1');

    // 2. Replace non-breaking spaces with regular spaces and remove zero-width spaces
    result = result.replace(/\u00A0/g, ' ');
    result = result.replace(/\u200B/g, '');

    // 3. Remove leading spaces from lines unless they start with a list indicator
    result = result.replace(/^[ \t]+(?![*\-+] |\d+\. |[A-E]\. |> )/gm, '');

    // 4. Normalize common Testbook headings
    const headings = [
        'Given', 'Concept', 'Formula Used', 'Calculation', 'Calculations', 'Solution', 'Given Series'
    ];
    headings.forEach(heading => {
        const regex = new RegExp(`^(?:\\*\\*)?\\s*${heading}\\s*:(?:\\*\\*)?\\s*$`, 'gmi');
        result = result.replace(regex, `**${heading}:**`);
    });

    // 5. Compact options list (remove blank lines between A., B., C., etc.)
    result = result.replace(/^([A-E]\. .+)\n+(?=[A-E]\. )/gm, '$1\n');

    // 6. Unescape markdown characters that shouldn't be escaped
    result = result.replace(/\\=/g, '=');
    result = result.replace(/\\\[/g, '[');
    result = result.replace(/\\\]/g, ']');

    // 7. Remove redundant multiple blank lines
    result = result.replace(/\n{3,}/g, '\n\n');

    // Restore protected blocks
    result = result.replace(/\x00TB_CODE_(\d+)\x00/g, (_, i) => blocks[parseInt(i)]);

    return result.trim();
}
