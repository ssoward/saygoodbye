const { test, expect, devices } = require('@playwright/test');

test.describe('Responsive Design and Cross-Browser', () => {
  test('should display correctly on mobile devices', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Check if page loads and is responsive
    await expect(page).toHaveTitle(/Say Goodbye/);
    
    // Check that login form is visible and usable on mobile
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Check that text is readable (not too small)
    const emailInput = page.locator('input[name="email"]');
    const inputBounds = await emailInput.boundingBox();
    expect(inputBounds.height).toBeGreaterThan(30); // Reasonable touch target
    
    await context.close();
  });

  test('should display correctly on tablet devices', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad'],
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Check if page loads correctly
    await expect(page).toHaveTitle(/Say Goodbye/);
    
    // Verify layout adapts to tablet size
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    
    await context.close();
  });

  test('should display correctly on desktop', async ({ page }) => {
    // Test with default desktop viewport
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    await expect(page).toHaveTitle(/Say Goodbye/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    
    // Check that layout uses available space efficiently
    const viewport = page.viewportSize();
    expect(viewport.width).toBeGreaterThan(1000); // Desktop width
  });

  test('should handle different screen orientations', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 } // Portrait tablet
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Check portrait layout
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    // Change to landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);
    
    // Check landscape layout still works
    await expect(page.locator('input[name="email"]')).toBeVisible();
    
    await context.close();
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Test tab navigation through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
    
    // Test form submission with Enter
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.keyboard.press('Enter');
    
    // Should attempt to submit form
    await page.waitForTimeout(1000);
  });

  test('should handle touch interactions on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Test touch interactions
    await page.locator('input[name="email"]').tap();
    await expect(page.locator('input[name="email"]')).toBeFocused();
    
    await page.locator('input[name="email"]').fill('test@example.com');
    
    await page.locator('input[name="password"]').tap();
    await expect(page.locator('input[name="password"]')).toBeFocused();
    
    await page.locator('input[name="password"]').fill('password123');
    
    await page.getByRole('button', { name: /sign in/i }).tap();
    
    await context.close();
  });

  test('should test dashboard responsiveness after login', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Login on mobile
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).tap();
    
    // Wait for dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
    
    // Check that dashboard elements are visible on mobile
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /TU/i })).toBeVisible();
    
    await context.close();
  });

  test('should handle various screen sizes', async ({ browser }) => {
    const screenSizes = [
      { width: 320, height: 568 },  // Small mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 } // Desktop
    ];
    
    for (const size of screenSizes) {
      const context = await browser.newContext({
        viewport: size
      });
      const page = await context.newPage();
      
      await page.goto('/');
      await page.waitForURL(/.*\/login/);
      
      // Check that essential content is visible at each size
      await expect(page).toHaveTitle(/Say Goodbye/);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      
      await context.close();
    }
  });

  test('should load performance test', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Check that all critical elements are loaded
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
