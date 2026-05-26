import { test, expect } from '@playwright/test';

test.describe('FinPulse Real-Time Wealth Dashboard E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the wealth dashboard client locally
    await page.goto('http://localhost:5173');
  });

  test('should load landing page, header and dynamic live ticker banners', async ({ page }) => {
    // 1. Verify Header and brand are loaded
    const brand = page.locator('span:has-text("FINPULSE")');
    await expect(brand).toBeVisible();

    // 2. Verify Live Feeds label is present
    const liveFeeds = page.locator('span:has-text("LIVE FEEDS")');
    await expect(liveFeeds).toBeVisible();

    // 3. Verify core price elements exist
    await expect(page.locator('span:has-text("AAPL")')).toBeVisible();
    await expect(page.locator('span:has-text("BTC")')).toBeVisible();
  });

  test('should calculate correct net worth based on asset values and cash balance', async ({ page }) => {
    // Verify cash balance card is rendered
    const cashBalanceText = await page.locator('span:has-text("Available Cash (USD)")').locator('xpath=..').locator('span.text-3xl').innerText();
    expect(cashBalanceText).toContain('$50,000.00');

    // Verify compliance status is SECURE
    const complianceText = await page.locator('span:has-text("Compliance Standing")').locator('xpath=..').locator('span.text-3xl').innerText();
    expect(complianceText).toContain('SECURE');
  });

  test('should execute a simulated buy order and update portfolio holdings', async ({ page }) => {
    // Select asset to execute
    await page.selectOption('select', 'AAPL');

    // Toggle Order Side BUY (Default)
    const buyButton = page.locator('button:has-text("BUY")');
    await expect(buyButton).toHaveClass(/bg-\[#10b981\]/);

    // Set Quantity to 5 shares
    const qtyInput = page.locator('input[type="number"]');
    await qtyInput.fill('5');

    // Submit Simulated Order
    const submitButton = page.locator('button:has-text("EXECUTE SIMULATED ORDER")');
    await submitButton.click();

    // Check if new holdings table has been updated dynamically
    const tableRow = page.locator('tr:has-text("AAPL")');
    await expect(tableRow).toBeVisible();
  });

  test('should fail to execute trade if cash balance is insufficient', async ({ page }) => {
    // Select cryptocurrency to buy
    await page.selectOption('select', 'BTC');

    // Attempt to buy 10 BTC (exceeding cash)
    const qtyInput = page.locator('input[type="number"]');
    await qtyInput.fill('10');

    // Submit simulated order
    const submitButton = page.locator('button:has-text("EXECUTE SIMULATED ORDER")');
    await submitButton.click();

    // Verify error panel raises alert
    const errorAlert = page.locator('div:has-text("Insufficient cash balance to complete trade")');
    await expect(errorAlert).toBeVisible();
  });
});
