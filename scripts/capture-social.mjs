import { chromium } from '@playwright/test'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })

await page.goto(baseUrl)
await page.getByRole('button', { name: 'Try with Sample Data' }).click()
await page.getByRole('heading', { name: 'Your trips' }).waitFor({ timeout: 15_000 })
await page.locator('.trip-row').first().click()
await page.locator('.map-loading').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined)
await page.locator('.map-loading').waitFor({ state: 'hidden', timeout: 60_000 })
await page.waitForTimeout(500)
await page.addStyleTag({ content: `
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  .trip-nav { height: 48px; }
  .trip-header { padding: 12px 0 14px; }
  .trip-header h1 { margin-bottom: 4px; font-size: 2.5rem; }
  .trip-replay { grid-template-columns: minmax(0, 1fr) 200px; }
  .map-stage { height: 472px; }
  .trip-photos, .trip-below-map, .story-entry, .memory-director, .trip-actions, .signature-footer { display: none !important; }
` })
await page.evaluate(() => window.dispatchEvent(new Event('resize')))
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Fit route' }).click()
await page.waitForTimeout(750)
await page.screenshot({ path: 'public/social-card.png' })
await browser.close()
