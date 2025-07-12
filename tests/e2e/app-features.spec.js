const { test, expect } = require('@playwright/test');

test.describe('Application Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    // Login with test credentials
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
  });

  test('should display dashboard after login', async ({ page }) => {
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check for welcome message
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    
    // Check for main dashboard sections
    await expect(page.getByRole('heading', { name: /upload document/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /my documents/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /monthly usage/i })).toBeVisible();
  });

  test('should show user profile information', async ({ page }) => {
    // Check for user profile elements (user initials button)
    await expect(page.getByRole('button', { name: /TU/i })).toBeVisible();
    
    // Check for user name display
    await expect(page.getByText(/test user/i)).toBeVisible();
  });

  test('should display document upload section', async ({ page }) => {
    // Check for upload document section
    await expect(page.getByRole('heading', { name: /upload document/i })).toBeVisible();
    
    // Check for upload button
    await expect(page.getByRole('button', { name: /upload first document/i })).toBeVisible();
  });

  test('should show plan and usage information', async ({ page }) => {
    // Check for upgrade plan section
    await expect(page.getByRole('heading', { name: /upgrade plan/i })).toBeVisible();
    
    // Check for monthly usage section
    await expect(page.getByRole('heading', { name: /monthly usage/i })).toBeVisible();
    
    // Check for document summary
    await expect(page.getByRole('heading', { name: /document summary/i })).toBeVisible();
  });

  test('should display onboarding tour', async ({ page }) => {
    // Check for welcome tour elements
    await expect(page.getByRole('heading', { name: /welcome to say goodbye/i })).toBeVisible();
    
    // Check for tour navigation buttons
    await expect(page.getByRole('button', { name: /skip tour/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible();
  });

  test('should handle tour navigation', async ({ page }) => {
    // Test skipping the tour
    const skipButton = page.getByRole('button', { name: /skip tour/i });
    if (await skipButton.isVisible()) {
      await skipButton.click();
      // Wait for tour to close
      await page.waitForTimeout(1000);
    }
  });

  test('should navigate through tour steps', async ({ page }) => {
    // Test next button in tour
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Wait for tour step change
      await page.waitForTimeout(1000);
    }
  });

  test('should show empty state for documents', async ({ page }) => {
    // Since this is a new user, should show empty state
    // Check for get started message
    await expect(page.getByRole('heading', { name: /get started with document validation/i })).toBeVisible();
  });

  test('should have responsive navigation', async ({ page }) => {
    // Check that main navigation exists
    const navigation = page.locator('nav, [role="navigation"]');
    await expect(navigation).toBeVisible();
  });

  test('should handle logout functionality', async ({ page }) => {
    // Try to find and click logout button/link
    // This might be in a dropdown menu triggered by the user profile button
    const userButton = page.getByRole('button', { name: /TU/i });
    
    if (await userButton.isVisible()) {
      await userButton.click();
      
      // Wait for dropdown/menu to appear
      await page.waitForTimeout(1000);
      
      // Look for logout option
      const logoutOption = page.getByRole('button', { name: /logout|sign out/i }).or(
        page.getByRole('link', { name: /logout|sign out/i })
      );
      
      if (await logoutOption.count() > 0) {
        await logoutOption.click();
        
        // Should be redirected to login page
        await expect(page).toHaveURL(/.*\/login/);
      }
    }
  });

  test('should display correct user tier (free)', async ({ page }) => {
    // The test user should be on free tier
    // This information might be visible in profile or upgrade section
    await expect(page.getByText(/free/i)).toBeVisible();
  });

  test('should show usage statistics', async ({ page }) => {
    // Check for usage counters (should be 0 for new test user)
    const usageCounters = page.locator('h4').filter({ hasText: '0' });
    await expect(usageCounters.first()).toBeVisible();
  });

  test('should handle document upload button interaction', async ({ page }) => {
    // Click the upload first document button
    const uploadButton = page.getByRole('button', { name: /upload first document/i });
    await uploadButton.click();
    
    // Wait for any response (file picker, modal, navigation, etc.)
    await page.waitForTimeout(1000);
    
    // Note: File picker interaction is limited in automated tests
    // This test mainly verifies the button is interactive
  });
});
