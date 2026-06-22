import { readFileSync } from 'fs';

const originalCode = readFileSync('./main.js.bak', 'utf-8');
const generatedCode = readFileSync('./dist/main.js', 'utf-8');

// Helper to extract function names
function extractFunctions(code) {
    const functions = new Set();
    
    // Match function name(...) {
    const fnRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
    let match;
    while ((match = fnRegex.exec(code)) !== null) {
        functions.add(match[1]);
    }
    
    // Match class Name {
    const classRegex = /class\s+([a-zA-Z0-9_$]+)/g;
    while ((match = classRegex.exec(code)) !== null) {
        functions.add(match[1]);
    }

    // Match const name = (...) => or let name = function
    const varFnRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)?\s*=>/g;
    while ((match = varFnRegex.exec(code)) !== null) {
        functions.add(match[1]);
    }
    
    return functions;
}

// Helper to extract registered sites
function extractRegisteredSites(code) {
    const sites = new Set();
    const siteRegex = /addSupportedChessSite\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = siteRegex.exec(code)) !== null) {
        sites.add(match[1]);
    }
    return sites;
}

const originalFns = extractFunctions(originalCode);
const generatedFns = extractFunctions(generatedCode);

const originalSites = extractRegisteredSites(originalCode);
const generatedSites = extractRegisteredSites(generatedCode);

console.log(`Original functions count: ${originalFns.size}`);
console.log(`Generated functions count: ${generatedFns.size}`);

const missingFns = [...originalFns].filter(fn => !generatedFns.has(fn));
const extraFns = [...generatedFns].filter(fn => !originalFns.has(fn));

console.log("\n--- Function Comparison ---");
if (missingFns.length === 0) {
    console.log("✓ All original functions are present in the generated bundle.");
} else {
    console.log(`✗ Missing functions in generated bundle (${missingFns.length}):`, missingFns);
}

if (extraFns.length > 0) {
    console.log(`Info: Extra helper/bound functions in generated bundle (${extraFns.length}):`, extraFns);
}

console.log("\n--- Site Adapter Comparison ---");
const missingSites = [...originalSites].filter(site => !generatedSites.has(site));
if (missingSites.length === 0) {
    console.log("✓ All original chess site registrations are present in the generated bundle.");
} else {
    console.log(`✗ Missing site registrations (${missingSites.length}):`, missingSites);
}

console.log("\nVerification finished.");
