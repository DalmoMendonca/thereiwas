import { chromium, type Page } from '@playwright/test'
import { mkdir, readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'

const baseUrl = process.env.DEMO_URL ?? 'https://thereiwas.dalmo.ai'
const recordingDir = 'output/video/raw'
const assetDir = 'docs/assets'

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function settle(page: Page, milliseconds = 900) {
  await page.waitForLoadState('domcontentloaded')
  await wait(milliseconds)
}

async function main() {
  await mkdir(recordingDir, { recursive: true })
  await mkdir(assetDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    recordVideo: { dir: recordingDir, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()
  const started = Date.now()
  const pace = async (second: number) => wait(Math.max(0, second * 1000 - (Date.now() - started)))

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(assetDir, 'there-i-was-home.png') })
  await pace(8)

  await page.getByRole('button', { name: 'Try a sample journey' }).click()
  await page.getByRole('heading', { name: '1 trip found in the record' }).waitFor()
  await settle(page)
  await page.getByRole('button', { name: /Import complete/ }).click()
  await wait(1200)
  await page.screenshot({ path: join(assetDir, 'there-i-was-trip-detection.png') })
  await pace(24)

  await page.getByRole('button', { name: /Import complete/ }).click()
  await page.getByRole('button', { name: 'Open journey' }).click()
  await page.getByRole('heading', { name: 'Reykjavík to Jökulsárlón' }).waitFor()
  await settle(page)
  await page.locator('.evidence-explanation').scrollIntoViewIfNeeded()
  await pace(36)

  await page.locator('.cinematic-map').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Play journey' }).click()
  await wait(5000)
  await page.screenshot({ path: join(assetDir, 'there-i-was-replay.png') })
  await pace(61)

  await page.locator('.trip-titlebar').getByRole('button', { name: 'Direct my memory' }).click()
  await page.getByRole('heading', { name: 'The road kept opening east' }).waitFor()
  await settle(page)
  await page.locator('.memory-director').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(assetDir, 'there-i-was-memory-director.png') })
  await pace(73)

  await page.getByRole('button', { name: /What was sent/ }).click()
  await page.locator('.privacy-inspector').scrollIntoViewIfNeeded()
  await pace(83)

  await page.getByRole('button', { name: 'Answer this' }).first().click()
  await page.getByPlaceholder('Write what you remember…').fill('The wind kept pushing the car sideways, and the road kept disappearing into mist.')
  await pace(91)
  await page.getByRole('button', { name: 'Add to story' }).click()
  await page.getByText('user-supplied', { exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'One-line memory' }).scrollIntoViewIfNeeded()
  await pace(105)

  await page.goto('https://github.com/DalmoMendonca/thereiwas', { waitUntil: 'domcontentloaded' })
  await settle(page, 1700)
  await page.locator('article.markdown-body').scrollIntoViewIfNeeded().catch(() => undefined)
  await pace(124)

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const openJourneys = page.getByRole('button', { name: 'Open my journeys' })
  if (await openJourneys.isVisible()) await openJourneys.click()
  await page.getByRole('button', { name: 'Create trip' }).waitFor()
  await page.getByRole('button', { name: 'Create trip' }).click()
  await page.getByLabel('Start date').fill('2026-07-04')
  await page.getByLabel('End date').fill('2026-07-07')
  await page.getByPlaceholder('Give these days a name').fill('The south coast days')
  await pace(134)
  await page.getByRole('button', { name: 'Save trip' }).click()
  await page.getByRole('heading', { name: 'The south coast days' }).waitFor()
  await pace(139)

  await page.getByRole('button', { name: 'Edit trip' }).click()
  await page.getByLabel('Title').fill('South coast, remembered')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('heading', { name: 'South coast, remembered' }).waitFor()
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByText('South coast, remembered', { exact: true }).waitFor()
  await pace(148)

  const video = page.video()
  await context.close()
  const videoPath = await video?.path()
  await browser.close()

  if (!videoPath) throw new Error('Playwright did not create a recording.')
  const target = 'output/video/there-i-was-screen-recording.webm'
  await rename(videoPath, target)

  for (const file of await readdir(recordingDir)) {
    if (file.endsWith('.webm')) throw new Error(`Unexpected leftover recording: ${file}`)
  }
  console.log(`Recorded ${target}`)
}

await main()
