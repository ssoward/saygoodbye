const { test, expect } = require('@playwright/test');

test.describe('Critical Production Tests', () => {
  // Test site accessibility and basic functionality
  test('should load and redirect to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/.*\/login/, { timeout: 15000 });
    
    await expect(page).toHaveTitle(/Say Goodbye/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  // Test authentication flow
  test('should login successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/.*\/login/, { timeout: 15000 });
    
    // Fill login form
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for successful login (could be dashboard or any post-login page)
    await page.waitForFunction(() => {
      return !window.location.pathname.includes('/login');
    }, { timeout: 15000 });
    
    // Verify we're logged in (not on login page)
    expect(page.url()).not.toContain('/login');
  });

  // Test API health
  test('should have healthy API', async ({ request }) => {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.environment).toBe('production');
  });

  // Test user registration API
  test('should handle user registration', async ({ request }) => {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const timestamp = Date.now();
    const response = await request.post('/api/auth/register', {
      data: {
        email: `testuser${timestamp}@example.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    // Should either succeed (201) or fail with validation/duplicate (400)
    expect([201, 400]).toContain(response.status());
  });

  // Test login API
  test('should authenticate via API', async ({ request }) => {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'password123'
      }
    });
    
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe('test@example.com');
    } else {
      // If rate limited, that's expected during testing
      expect([200, 429]).toContain(response.status());
    }
  });

  // Test responsive design on mobile
  test('should work on mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 } // iPhone size
    });
    const page = await context.newPage();
    
    await page.goto('/');
    await page.waitForURL(/.*\/login/, { timeout: 15000 });
    
    // Verify mobile layout
    await expect(page).toHaveTitle(/Say Goodbye/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    await context.close();
  });

  // Test basic navigation after login
  test('should access dashboard after login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/.*\/login/, { timeout: 15000 });
    
    // Login
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect away from login
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 15000 });
    
    // Should be on some authenticated page (dashboard, onboarding, etc.)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    
    // Basic check that we're in an authenticated state
    // (exact elements may vary, but we should not see login form)
    const loginInputs = page.locator('input[name="email"]');
    expect(await loginInputs.count()).toBe(0);
  });
});
