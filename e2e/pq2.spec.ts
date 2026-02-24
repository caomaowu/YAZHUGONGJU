import { expect, test } from '@playwright/test'

test('pq2 页面包含标题、导出按钮与图表 canvas', async ({ page }) => {
  await page.goto('/#/pq2')
  await expect(page).toHaveURL(/#\/pq2/, { timeout: 15_000 })

  const title = page.locator('h1').filter({ hasText: 'PQ² 图' })
  await expect(title).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '导出参数 JSON' })).toBeVisible({ timeout: 15_000 })

  await page.waitForSelector('canvas', { timeout: 15_000 })
  const canvasCount = await page.locator('canvas').count()
  expect(canvasCount).toBeGreaterThan(0)
  await expect(page.locator('canvas').first()).toBeVisible()
})
