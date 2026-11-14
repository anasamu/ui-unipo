// Ambil screenshot setiap contoh komponen dari situs dokumentasi.
// Pakai: `npm run dev` (port 5180) lalu `node scripts/screenshots.mjs [slug...] [--dark] [--mobile] [--out=dir]`
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const dark = args.includes('--dark');
const mobile = args.includes('--mobile');
const outArg = args.find((a) => a.startsWith('--out='));
const out = outArg ? outArg.slice(6) : 'docs/screenshots';
const only = args.filter((a) => !a.startsWith('--'));
const base = process.env.DOCS_URL ?? 'http://127.0.0.1:5180/';
const theme = `?theme=${dark ? 'dark' : 'light'}`;
const suffix = `${dark ? '.dark' : ''}${mobile ? '.mobile' : ''}`;
mkdirSync(out, { recursive: true });

const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1400 },
  deviceScaleFactor: Number(process.env.DPR ?? 2),
});
await page.goto(base + theme);
await page.waitForSelector('.docs-body');
const slugs = only.length ? only : await page.$$eval('.u-docs-link', (as) => as.map((a) => a.getAttribute('href').replace('#/', '')));
for (const slug of slugs) {
  await page.goto(base + theme + `#/${slug}`);
  await page.waitForTimeout(600);
  // Bilah atas yang menempel menutupi contoh panjang saat Playwright menggulir.
  await page.addStyleTag({ content: '.docs-topbar{position:static!important}' });
  const demos = await page.$$('[data-demo]');
  for (const d of demos) {
    const id = await d.getAttribute('data-demo');
    await d.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await d.screenshot({ path: `${out}/${id}${suffix}.png`, animations: 'disabled' });
  }
  console.log(`${slug}: ${demos.length}`);
}
await browser.close();
