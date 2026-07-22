const metadata = await Bun.file('./src/metadata.txt').text();

const buildResult = await Bun.build({
  entrypoints: ['./src/entry.js'],
  minify: false,
  target: 'browser',
});

if (!buildResult.success) {
  console.error("Build failed:", buildResult.logs);
  process.exit(1);
}

const bundledCode = await buildResult.outputs[0].text();

const finalCode = `${metadata}

(async () => { try {
${bundledCode}
} catch(e) {
  console.error("OmniChess Error:", e);
}})();
`;

await Bun.write('./dist/main.js', finalCode);
console.log("Build successful! dist/main.js has been generated.");
