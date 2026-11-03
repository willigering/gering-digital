/* Real Chromium regression for fresh entry into all nine learning modules. */
'use strict';
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const modules = JSON.parse(fs.readFileSync(path.join(root, 'lernmodule/manifest.json'), 'utf8')).modules;

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.basename(new URL(req.url, 'http://localhost').pathname);
    if (!modules.some(m => m.file === file)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(root, 'lernmodule', file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const module of modules) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const url = 'http://127.0.0.1:' + server.address().port + '/' + module.file;

      await page.goto(url);
      await page.locator('#tab-exam').click();
      assert.equal(await page.locator('#tab-exam').getAttribute('aria-selected'), 'true',
        module.slug + ': normal in-session tab switching works');
      await page.evaluate(() => {
        localStorage.setItem('dtp-test-progress', '{"stage":2,"mastered":true}');
        window.scrollTo(0, 1000);
      });
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#tab-path')?.getAttribute('aria-selected') === 'true' && scrollY === 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('dtp-test-progress')),
        '{"stage":2,"mastered":true}', module.slug + ': progress survives re-entry');

      // Coming from outside via an obsolete deep link should also open the learning path.
      await page.goto('about:blank');
      await page.goto(url + '#examTop');
      await page.waitForFunction(() => document.querySelector('#tab-path')?.getAttribute('aria-selected') === 'true' && scrollY === 0);
      assert.equal(await page.evaluate(() => location.hash), '', module.slug + ': old deep link cleared');

      // Browser Back may restore a document from the back-forward cache.
      await page.locator('#tab-train').click();
      await page.evaluate(() => window.scrollTo(0, 900));
      await page.goto('about:blank');
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('#tab-path')?.getAttribute('aria-selected') === 'true' && scrollY === 0);
      await context.close();
    }
    console.log('Module entry browser: all nine modules start on Lernpfad at scroll 0 (reload, old anchor, back), progress retained.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
