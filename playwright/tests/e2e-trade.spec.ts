import { test, expect } from '@playwright/test';

test.describe('FinPulse Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local frontend instance
    await page.goto('http://localhost:5173'); // Vite default port
  });

  test('should load the dashboard and verify key elements', async ({ page }) => {
    // Verify Header
    await expect(page.locator('h1')).toContainText('BTC/USD');

    // Verify Sidebar
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.sidebar h2')).toHaveText('FinPulse');

    // Verify Chart presence
    await expect(page.locator('.recharts-responsive-container')).toBeVisible();

    // Verify Order Book rendering
    await expect(page.locator('.order-book')).toBeVisible();
    await expect(page.locator('.order-book h3')).toHaveText('Order Book');
  });

  test('should be able to click the Buy and Sell buttons', async ({ page }) => {
    const buyButton = page.locator('button:has-text("Buy")');
    const sellButton = page.locator('button:has-text("Sell")');

    await expect(buyButton).toBeVisible();
    await expect(sellButton).toBeVisible();

    // Simulate clicks
    await buyButton.click();
    await sellButton.click();
  });
});
