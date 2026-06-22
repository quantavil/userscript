import { readFileSync } from 'fs';
import * as acorn from 'acorn';

function traverse(node, visitor) {
    if (!node) return;
    visitor(node);
    for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
                node[key].forEach(child => {
                    if (child && typeof child.type === 'string') {
                        traverse(child, visitor);
                    }
                });
            } else if (typeof node[key].type === 'string') {
                traverse(node[key], visitor);
            }
        }
    }
}

function extractSignaturesFromAST(filePath) {
    const code = readFileSync(filePath, 'utf-8');
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    const signatures = new Set();

    traverse(ast, (node) => {
        // 1. Function Declarations: function foo() {}
        if (node.type === 'FunctionDeclaration' && node.id) {
            signatures.add(node.id.name);
        }
        // 2. Class Declarations: class Foo {}
        else if (node.type === 'ClassDeclaration' && node.id) {
            signatures.add(node.id.name);
        }
        // 3. Variable Declarations binding a function (const foo = () => {} or const foo = function() {})
        else if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier') {
            if (node.init && (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
                signatures.add(node.id.name);
            }
        }
    });

    return signatures;
}

const originalPath = './main.js.bak';
const generatedPath = './dist/main.js';

console.log("Analyzing AST of original backup vs generated bundle...");

try {
    const originalSigs = extractSignaturesFromAST(originalPath);
    const generatedSigs = extractSignaturesFromAST(generatedPath);

    console.log(`Original AST declarations count: ${originalSigs.size}`);
    console.log(`Generated AST declarations count: ${generatedSigs.size}`);

    const missing = [...originalSigs].filter(sig => !generatedSigs.has(sig));
    const extra = [...generatedSigs].filter(sig => !originalSigs.has(sig));

    console.log("\n--- AST Parity Report ---");
    if (missing.length === 0) {
        console.log("✓ SUCCESS: All original functions & classes are present in the AST of the generated bundle.");
    } else {
        console.error(`✗ FAILURE: Missing functions/classes in generated AST (${missing.length}):`, missing);
        process.exit(1);
    }

    if (extra.length > 0) {
        console.log(`Info: Extra AST declarations in generated bundle (${extra.length}):`, extra);
    }
} catch (e) {
    console.error("Error during AST verification:", e);
    process.exit(1);
}
