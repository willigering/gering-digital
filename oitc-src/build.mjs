// Baut das Spiel. `npm run build` -> dist/index.html (eine einzelne Datei)
// `npm run dev` -> lokaler Server auf http://localhost:8080 mit Live-Rebuild
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, copyFileSync } from 'node:fs';

const dev = process.argv.includes('--dev');
const tpl = readFileSync('src/template.html', 'utf8');
mkdirSync('dist', { recursive: true });
if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true }); // GLB-Modelle etc.

const opts = { entryPoints: ['src/main.js'], bundle: true, format: 'iife', outfile: 'dist/bundle.js', minify: !dev, loader: { '.glb': 'binary' }, sourcemap: dev };

if (dev) {
  writeFileSync('dist/index.html', tpl.replace('<script>/*BUNDLE*/</script>', '<script src="bundle.js"></script>'));
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'dist', port: 8080 });
  console.log(`Dev-Server: http://localhost:${port}  (Strg+C beendet)`);
} else {
  const r = await esbuild.build({ ...opts, write: false });
  const code = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
  writeFileSync('dist/index.html', tpl.replace('/*BUNDLE*/', () => code));
  console.log('Fertig: dist/index.html');
  if (process.argv.includes('--oitc')) { copyFileSync('dist/index.html', '../oitc/index.html'); console.log('Kopiert nach ../oitc/index.html (Live-Datei)'); }
}
