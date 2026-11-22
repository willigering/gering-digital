const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');

function install(command) {
  const result = spawnSync(process.execPath, [cli, command, 'chromium'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Playwright ${command} failed (${result.status ?? result.signal})`);
}

async function checkBrowser() {
  const browser = await chromium.launch();
  await browser.close();
}

(async () => {
  install('install');
  try {
    await checkBrowser();
  } catch (error) {
    if (!/missing dependencies|error while loading shared libraries/i.test(error.message)) throw error;
    install('install-deps');
    await checkBrowser();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
