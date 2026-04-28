export function beautifyMarkdown(markdown: string): string {
    let result = markdown;

    // 1. Replace specific Testbook placeholder images with formatted text
    result = result.replace(/!\[.*?\]\(https:\/\/cdn\.testbook\.com\/images\/production\/quesImages\/quesImage37\.png\)/g, '**ALTERNATE METHOD**');
    result = result.replace(/!\[.*?\]\(https:\/\/storage\.googleapis\.com\/tb-img\/production\/21\/08\/60c6e105dc004150078ccd08_16298247021121\.png\)/g, '**💡IMPORTANT POINT**');
    result = result.replace(/_?!\[.*?\]\(https:\/\/lh6\.googleusercontent\.com\/z65abjZdgDuGx4tuXXlusQDIeyCCmOiNCJWG3XiTuSsddAprFHSwW4HR2TdTYnMe73n5kgaTcUZYR9G38EcnxmPnK0SZgvEsGj6zGluwSjH8O1Xs0F-Un9IoZifdXgHRAmTPhFpV\)_?/g, '✅ EMOJI');

    // Deduplicate if the original text already existed right below/above the image
    result = result.replace(/(\*\*ALTERNATE METHOD\*\*)\s*\n\s*\1/g, '$1');
    result = result.replace(/(\*\*💡IMPORTANT POINT\*\*)\s*\n\s*\1/g, '$1');
    result = result.replace(/(✅)\s*\n\s*\1/g, '$1');

    // 2. Normalize common Testbook headings
    result = result.replace(/\*\*\s*GIVEN\s*:\s*\*\*/gi, '**Given:**');
    result = result.replace(/\*\*\s*CONCEPT\s*:\s*\*\*/gi, '**Concept:**');
    result = result.replace(/\*\*\s*FORMULA USED\s*:\s*\*\*/gi, '**Formula Used:**');
    result = result.replace(/\*\*\s*CALCULATION\s*:\s*\*\*/gi, '**Calculation:**');
    result = result.replace(/\*\*\s*CALCULATIONS\s*:\s*\*\*/gi, '**Calculations:**');
    result = result.replace(/\*\*\s*SOLUTION\s*:\s*\*\*/gi, '**Solution:**');

    // 3. Remove redundant multiple blank lines
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
}
