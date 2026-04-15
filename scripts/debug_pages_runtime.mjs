import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:4174/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (msg) => {
  console.log(`[console:${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', (error) => {
  console.log(`[pageerror] ${error.stack || error.message}`);
});

page.on('requestfailed', (request) => {
  console.log(`[requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`);
});

const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
console.log(`[goto] status=${response?.status() ?? 'n/a'} url=${page.url()}`);

await page.screenshot({ path: 'runtime-debug.png', fullPage: true });

const bodyText = await page.locator('body').innerText();
console.log('[body]');
console.log(bodyText.slice(0, 4000));

await browser.close();
