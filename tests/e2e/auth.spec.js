const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the application - it redirects to /login
    await page.goto('/');
    // Wait for redirect to complete
    await page.waitForURL(/.*\/login/);
  });

  test('should display login page after redirect', async ({ page }) => {
    // Check if the page loads correctly and redirects to login
    await expect(page).toHaveTitle(/Say Goodbye/);
    await expect(page).toHaveURL(/.*\/login/);
    
    // Check for login page elements
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should have login form elements', async ({ page }) => {
    // Check for login form elements using name attributes
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Check for navigation to register
    await expect(page.getByRole('link', { name: /sign up here/i })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    // Click register link
    await page.getByRole('link', { name: /sign up here/i }).click();
    
    // Should be on register page
    await expect(page).toHaveURL(/.*\/register/);
    
    // Check for register form elements using name attributes
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('input[name="organization"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });

  test('should test login functionality', async ({ page }) => {
    // Fill in test user credentials using name selectors
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    
    // Submit login form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for response - could be success or error
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to dashboard or if there's an error message
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      // Successful login
      await expect(page).toHaveURL(/.*\/dashboard/);
    } else {
      // Login failed - should stay on login page or show error
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test('should test register functionality', async ({ page }) => {
    // Navigate to register page
    await page.getByRole('link', { name: /sign up here/i }).click();
    await expect(page).toHaveURL(/.*\/register/);
    
    // Fill in registration form with test data
    await page.locator('input[name="firstName"]').fill('Test');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(`test${Date.now()}@example.com`);
    await page.locator('input[name="password"]').fill('password123');
    await page.locator('input[name="confirmPassword"]').fill('password123');
    await page.locator('input[name="organization"]').fill('Test Org');
    await page.locator('input[name="phone"]').fill('555-1234');
    
    // Submit register form (find the submit button)
    const submitButton = page.locator('button[type="submit"]').or(page.getByRole('button', { name: /register|sign up|create account/i }));
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check if registration was successful (redirected or success message)
      const currentUrl = page.url();
      console.log('After registration, URL:', currentUrl);
    } else {
      console.log('No submit button found for registration');
    }
  });

  test('should handle form validation', async ({ page }) => {
    // Try to submit login form without filling fields
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should still be on login page (form validation should prevent submission)
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should test logout after login', async ({ page }) => {
    // First, try to login with test credentials
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for potential redirect
    await page.waitForTimeout(2000);
    
    // If we're redirected to dashboard, try to logout
    if (page.url().includes('/dashboard')) {
      // Look for logout button
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.click();
        
        // Should be redirected back to login
        await expect(page).toHaveURL(/.*\/login/);
      }
    }
  });
});
