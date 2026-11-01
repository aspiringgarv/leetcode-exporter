// Builds dist/chrome.zip and dist/firefox.zip (Node only, no dependencies; uses the system `zip`).
const fs = require('fs');
const { execSync } = require('child_process');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const FILES = ['lib.js', 'content.js', 'icons'];
fs.rmSync('dist', { recursive: true, force: true });
for (const target of ['chrome', 'firefox']) {
  const dir = `dist/${target}`;
  fs.mkdirSync(dir, { recursive: true });
  for (const f of FILES) fs.cpSync(f, `${dir}/${f}`, { recursive: true });
  const m = JSON.parse(JSON.stringify(manifest));
  if (target === 'chrome') delete m.browser_specific_settings; // Firefox-only key
  fs.writeFileSync(`${dir}/manifest.json`, JSON.stringify(m, null, 2) + '\n');
  execSync(`cd ${dir} && zip -qr ../${target}.zip .`);
  console.log(`built dist/${target}.zip`);
}
