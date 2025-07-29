const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard Tests', () => {
  // Helper function to login as admin
  async function loginAsAdmin(page) {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[name="email"]').fill('admin@example.com');
    await page.locator('input[name="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  }

  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean slate
    await page.goto('http://localhost:3000');
  });

  test('should login as admin and navigate to admin dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    
    // Check if admin dashboard loads without JavaScript errors
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    
    // Wait a moment for any async operations
    await page.waitForTimeout(2000);
    
    // Check for the presence of admin dashboard elements
    await expect(page.locator('h4:has-text("Admin Dashboard")')).toBeVisible({ timeout: 10000 });
    
    // Report any JavaScript errors
    if (pageErrors.length > 0) {
      console.error('JavaScript errors on admin dashboard:', pageErrors);
      throw new Error(`JavaScript errors found: ${pageErrors.join(', ')}`);
    }
  });

  test('should display admin statistics without errors', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    
    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for stats to load
    await page.waitForTimeout(3000);
    
    // Check for specific stats cards
    const statCards = [
      'Total Users',
      'Total Documents', 
      'Total Revenue',
      'Total Validations'
    ];
    
    for (const cardTitle of statCards) {
      await expect(page.locator(`text=${cardTitle}`)).toBeVisible({ timeout: 5000 });
    }
    
    // Check for console errors related to map function
    const mapErrors = consoleErrors.filter(error => 
      error.includes('map is not a function') || 
      error.includes('recentUsers.map') ||
      error.includes('recentDocuments.map')
    );
    
    if (mapErrors.length > 0) {
      console.error('Map function errors found:', mapErrors);
      throw new Error(`Map function errors: ${mapErrors.join(', ')}`);
    }
    
    console.log('All console messages:', consoleErrors);
  });

  test('should display recent users table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Check for recent users section
    await expect(page.locator('h6:has-text("Recent Users")')).toBeVisible({ timeout: 5000 });
    
    // Check if the table or "No recent users" message is displayed
    const hasTable = await page.locator('table').count() > 0;
    const hasNoUsersMessage = await page.locator('text=No recent users').count() > 0;
    
    expect(hasTable || hasNoUsersMessage).toBe(true);
    
    if (hasTable) {
      // If table exists, check for headers
      await expect(page.locator('th:has-text("Email")')).toBeVisible();
      await expect(page.locator('th:has-text("Role")')).toBeVisible();
      await expect(page.locator('th:has-text("Tier")')).toBeVisible();
    }
  });

  test('should display recent documents table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Check for recent documents section
    await expect(page.locator('h6:has-text("Recent Documents")')).toBeVisible({ timeout: 5000 });
    
    // Check if the table or "No recent documents" message is displayed
    const hasTable = await page.locator('table').count() > 1; // More than 1 because users table might exist
    const hasNoDocsMessage = await page.locator('text=No recent documents').count() > 0;
    
    expect(hasTable || hasNoDocsMessage).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Intercept admin API calls and simulate errors
    await page.route('**/api/admin/stats', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.route('**/api/admin/recent-users', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.route('**/api/admin/recent-documents', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    
    // Should still show the dashboard structure even with API errors
    await expect(page.locator('h4:has-text("Admin Dashboard")')).toBeVisible({ timeout: 10000 });
    
    // Check for error handling
    await page.waitForTimeout(3000);
    
    // The page should still be functional, not completely broken
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('should check API response structure', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Intercept and log API responses
    const apiResponses = {};
    
    page.on('response', async response => {
      if (response.url().includes('/api/admin/')) {
        const endpoint = response.url().split('/api/admin/')[1];
        try {
          const responseData = await response.json();
          apiResponses[endpoint] = responseData;
          console.log(`API Response for ${endpoint}:`, JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log(`Failed to parse JSON for ${endpoint}:`, e.message);
        }
      }
    });
    
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Verify API response structures
    if (apiResponses['recent-users']) {
      console.log('Recent users response structure:', typeof apiResponses['recent-users']);
      console.log('Has users property:', 'users' in apiResponses['recent-users']);
      if ('users' in apiResponses['recent-users']) {
        console.log('Users is array:', Array.isArray(apiResponses['recent-users'].users));
      }
    }
    
    if (apiResponses['recent-documents']) {
      console.log('Recent documents response structure:', typeof apiResponses['recent-documents']);
      console.log('Has documents property:', 'documents' in apiResponses['recent-documents']);
      if ('documents' in apiResponses['recent-documents']) {
        console.log('Documents is array:', Array.isArray(apiResponses['recent-documents'].documents));
      }
    }
  });
});
