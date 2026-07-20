import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const privateTimeline = resolve('.testing-data/location-history.json')

test('landing is a single, minimal import screen', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'There I Was' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import Timeline JSON' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try with Sample Data' })).toBeVisible()
  await expect(page.getByText('Google Maps app > Settings > Location & privacy > Export Timeline data')).toBeVisible()
  await expect(page.getByText('Build with')).toBeVisible()
  await expect(page.getByText('There I Was', { exact: true })).toHaveCount(1)

  const dimensions = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight }))
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight + 1)
})

test('real sample data detects exactly the requested three trips', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Try with Sample Data' }).click()
  await expect(page.getByRole('heading', { name: 'Your trips' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.trip-row')).toHaveCount(3)
  await expect(page.locator('.trip-row-copy strong')).toHaveText(['California', 'New York', 'Italy'])
  await expect(page.locator('.trip-row-copy small')).toHaveText([
    '06/19/26 - 07/12/26',
    '10/30/25 - 11/22/25',
    '06/29/25 - 08/02/25',
  ])

  await page.locator('.trip-row').first().click()
  await expect(page.getByRole('heading', { name: 'California' })).toBeVisible()
  await expect(page.locator('.maplibregl-map')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.map-loading')).toBeHidden({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Play trip' })).toBeEnabled()
  await expect(page.getByText(/mi$/).first()).toBeVisible()
})

test('private Timeline acceptance: named, unique trips and a complete route replay', async ({ page }) => {
  test.skip(!existsSync(privateTimeline), 'Private acceptance export is intentionally not committed.')
  test.setTimeout(90_000)

  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(privateTimeline)
  await expect(page.getByRole('heading', { name: 'Your trips' })).toBeVisible({ timeout: 30_000 })

  await expect(page.getByText('28 found between')).toBeVisible()
  await expect(page.getByText('California', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Oklahoma City', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Italy', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Unnamed stop', { exact: false })).toHaveCount(0)

  const dateRanges = await page.locator('.trip-row-copy small').allTextContents()
  expect(new Set(dateRanges).size).toBe(dateRanges.length)

  await page.locator('.trip-row').first().click()
  await expect(page.getByRole('heading', { name: 'California' })).toBeVisible()
  await expect(page.locator('.maplibregl-map')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/mi$/).first()).toBeVisible()
  await expect(page.getByText('Journey thread', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Unnamed stop', { exact: false })).toHaveCount(0)

  await page.getByRole('button', { name: 'Play trip' }).click()
  await expect(page.getByRole('button', { name: 'Pause replay' })).toBeVisible()
  await expect.poll(async () => Number(await page.getByRole('slider', { name: 'Replay position' }).inputValue())).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause replay' }).click()
})
