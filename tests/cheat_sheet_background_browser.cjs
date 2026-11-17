'use strict';

const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const sheet = pathToFileURL(join(__dirname, '../dau-to-pro/cheat-sheet.html')).href;

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(sheet);
    const topics = await page.locator('.topic-card').evaluateAll(cards => cards.map(card => card.href));
    assert.equal(topics.length, 14);
    const assets = new Set();
    for (const url of topics) {
      await page.goto(url);
      const backdrop = await page.locator('#sheet-backdrop').evaluate(element => {
        const image = getComputedStyle(element, '::before').backgroundImage;
        const frame = element.getBoundingClientRect();
        return {
          image: image.match(/url\("([^"]+)"\)/)?.[1],
          position: getComputedStyle(element).position,
          coversViewport: frame.width === innerWidth && frame.height === innerHeight
        };
      });
      assert.equal(backdrop.position, 'fixed');
      assert.ok(backdrop.coversViewport, url);
      assert.ok(backdrop.image && existsSync(fileURLToPath(backdrop.image)), url);
      assets.add(backdrop.image);
    }
    assert.equal(assets.size, topics.length);
    const layer = page.locator('#sheet-backdrop');
    const transform = () => layer.evaluate(element => getComputedStyle(element, '::before').transform);
    const initial = await transform();
    await page.evaluate(() => scrollTo({ top: 1250, behavior: 'instant' }));
    await page.waitForFunction(before =>
      getComputedStyle(document.getElementById('sheet-backdrop'), '::before').transform !== before, initial);
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileImage = await layer.evaluate(element => getComputedStyle(element, '::before').backgroundImage);
    assert.ok(mobileImage.includes('-768.webp'));
    await page.locator('#sheet-jump a').nth(1).click();
    await page.waitForFunction(() => document.getElementById('swipe-count').textContent.startsWith('2 /'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),390);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await transform(), 'none');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
