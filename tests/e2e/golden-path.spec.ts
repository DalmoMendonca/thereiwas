import { expect, test } from '@playwright/test'

test('judge golden path works without private setup and persists human authority', async ({ page }) => {
  const nonGetRequests: Array<{ url: string; body: string | null }> = []
  page.on('request', (request) => {
    if (request.method() !== 'GET') nonGetRequests.push({ url: request.url(), body: request.postData() })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Turn your location history into the stories of your life.' })).toBeVisible()
  await page.getByRole('button', { name: 'Try a sample journey' }).click()

  await expect(page.getByRole('heading', { name: '1 trip found in the record' })).toBeVisible()
  await expect(page.getByText('Timeline records')).toBeVisible()
  await page.getByRole('button', { name: 'Open journey' }).click()

  await expect(page.getByRole('heading', { name: 'Reykjavík to Jökulsárlón' })).toBeVisible()
  await expect(page.getByText('There is enough evidence to call this a journey.')).toBeVisible()

  await page.getByRole('button', { name: 'Play journey' }).click()
  await expect(page.getByRole('button', { name: 'Pause replay' })).toBeVisible()
  await expect.poll(async () => Number(await page.getByRole('slider', { name: 'Replay position' }).inputValue())).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause replay' }).click()

  await page.locator('.trip-titlebar').getByRole('button', { name: 'Direct my memory' }).click()
  await expect(page.getByRole('heading', { name: 'The road kept opening east' })).toBeVisible()
  await expect(page.getByText('The Timeline records the route and duration, but not what made that stretch memorable to you.')).toBeVisible()

  await page.getByRole('button', { name: 'Answer this' }).first().click()
  const answer = 'The wind kept pushing the car sideways, and the road kept disappearing into mist.'
  await page.getByPlaceholder('Write what you remember…').fill(answer)
  await page.getByRole('button', { name: 'Add to story' }).click()
  await expect(page.getByRole('textbox', { name: 'One-line memory' })).toHaveValue(answer)
  await expect(page.getByText('user-supplied', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'All journeys' }).click()
  await page.getByRole('button', { name: 'Create trip' }).click()
  await page.getByLabel('Start date').fill('2026-07-04')
  await page.getByLabel('End date').fill('2026-07-07')
  await page.getByPlaceholder('Give these days a name').fill('The south coast days')
  await page.getByRole('button', { name: 'Save trip' }).click()

  await expect(page.getByRole('heading', { name: 'The south coast days' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit trip' }).click()
  await page.getByLabel('Title').fill('South coast, remembered')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'South coast, remembered' })).toBeVisible()

  await page.reload()
  await expect(page.getByText('South coast, remembered', { exact: true })).toBeVisible()

  expect(nonGetRequests.some((request) => request.body?.includes('sample-home') && !request.url.includes('direct-memory'))).toBe(false)
  const memoryRequest = nonGetRequests.find((request) => request.url.includes('direct-memory'))
  if (memoryRequest?.body) {
    expect(memoryRequest.body).not.toContain('33.749')
    expect(memoryRequest.body).not.toContain('observedPath')
  }
})
