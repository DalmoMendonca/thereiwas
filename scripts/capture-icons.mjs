import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage()

for (const size of [32, 64, 180]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`
    <!doctype html>
    <style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}svg{display:block;width:100%;height:100%}</style>
    <svg viewBox="0 0 64 64" role="img" aria-label="There I Was">
      <rect width="64" height="64" rx="15" fill="#146b4e"/>
      <path d="M14 44c0-8 6-13 14-13h8c8 0 14-5 14-13" fill="none" stroke="#fbfbf8" stroke-width="5" stroke-linecap="round"/>
      <circle cx="14" cy="44" r="6" fill="#d65332" stroke="#fbfbf8" stroke-width="3"/>
      <circle cx="50" cy="18" r="5" fill="#fbfbf8"/>
    </svg>
  `)
  const filename = size === 180 ? 'public/apple-touch-icon.png' : `public/favicon-${size}.png`
  await page.screenshot({ path: filename, omitBackground: true })
}

await browser.close()
