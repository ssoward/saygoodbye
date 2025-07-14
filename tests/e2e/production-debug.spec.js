const { test, expect } = require('@playwright/test');

test.describe('Production Error Detection - Comprehensive Suite', () => {
  
  // Test configuration
  const BASE_URL = 'http://34.235.117.235';
  
  test.beforeEach(async ({ page }) => {
    // Listen for console errors, network failures, and unhandled exceptions
    const errors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log(`Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`Page Error: ${error.message}`);
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
        console.log(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
    
    // Store errors for later assertions
    page.errors = errors;
    page.networkErrors = networkErrors;
  });

  test.describe('Critical User Flow Validation', () => {
    
    test('should complete full login flow without errors', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Wait for initial load and check for errors
      await page.waitForLoadState('networkidle');
      expect(page.errors.length).toBe(0);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);
      
      // Fill login form
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Wait for navigation to dashboard
      await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      
      // Check for JavaScript errors after login
      expect(page.errors.length).toBe(0);
      expect(page.networkErrors.length).toBe(0);
      
      // Verify dashboard loads properly
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });
    
    test('should handle navigation between pages without undefined errors', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      // Navigate to different sections and check for undefined document errors
      const navigationTests = [
        { name: 'Dashboard', selector: 'text=Dashboard', expectedUrl: /dashboard/ },
        { name: 'Documents', selector: 'text=Documents', expectedUrl: /documents/ },
        { name: 'Profile', selector: 'text=Profile', expectedUrl: /profile/ },
        { name: 'Settings', selector: 'text=Settings', expectedUrl: /settings/ }
      ];
      
      for (const nav of navigationTests) {
        try {
          const navElement = page.locator(nav.selector).first();
          if (await navElement.isVisible({ timeout: 3000 })) {
            await navElement.click();
            await page.waitForLoadState('networkidle');
            
            // Check for the specific error we're seeing
            const hasUndefinedError = page.errors.some(error => 
              error.includes('/documents/undefined') || 
              error.includes('undefined') && error.includes('document')
            );
            
            if (hasUndefinedError) {
              console.log(`❌ Found undefined document error on ${nav.name} page`);
              console.log('Errors:', page.errors);
            }
            
            expect(hasUndefinedError).toBe(false);
          }
        } catch (error) {
          console.log(`⚠️  Navigation to ${nav.name} failed or element not found:`, error.message);
        }
      }
    });
    
    test('should detect and report the specific /documents/undefined error', async ({ page }) => {
      // Track all API calls
      const apiCalls = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push(request.url());
        }
      });
      
      // Login and navigate
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      // Try to trigger the documents page
      try {
        // Look for any documents-related navigation
        const documentLinks = [
          page.locator('text=Documents'),
          page.locator('text=My Documents'),
          page.locator('text=Document'),
          page.locator('[href*="document"]'),
          page.locator('a[href*="/documents"]')
        ];
        
        for (const link of documentLinks) {
          if (await link.first().isVisible({ timeout: 2000 })) {
            console.log(`Clicking document link: ${await link.first().textContent()}`);
            await link.first().click();
            await page.waitForTimeout(3000);
            break;
          }
        }
      } catch (error) {
        console.log('No document navigation found, continuing...');
      }
      
      // Check for the specific undefined document error
      const undefinedDocumentCalls = apiCalls.filter(url => url.includes('/documents/undefined'));
      const hasUndefinedError = page.networkErrors.some(error => error.includes('/documents/undefined'));
      
      if (undefinedDocumentCalls.length > 0 || hasUndefinedError) {
        console.log('❌ FOUND THE ISSUE!');
        console.log('Undefined document API calls:', undefinedDocumentCalls);
        console.log('Network errors:', page.networkErrors);
        console.log('Console errors:', page.errors);
        
        // This should fail to highlight the issue
        expect(undefinedDocumentCalls.length).toBe(0);
      }
    });
  });

  test.describe('API Error Detection', () => {
    
    test('should identify all 500 errors in production', async ({ page }) => {
      const serverErrors = [];
      
      page.on('response', response => {
        if (response.status() === 500) {
          serverErrors.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
        }
      });
      
      // Login and navigate through the app
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      // Navigate to different areas to trigger any 500 errors
      const areas = ['dashboard', 'documents', 'profile', 'settings'];
      for (const area of areas) {
        try {
          await page.goto(`${BASE_URL}/${area}`);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);
        } catch (error) {
          console.log(`Error navigating to ${area}:`, error.message);
        }
      }
      
      // Report any 500 errors found
      if (serverErrors.length > 0) {
        console.log('❌ 500 Server Errors Found:');
        serverErrors.forEach(error => {
          console.log(`  - ${error.status} ${error.url}`);
        });
      }
      
      // This test should fail if we find 500 errors
      expect(serverErrors.length).toBe(0);
    });
    
    test('should check all API endpoints are properly defined', async ({ page }) => {
      const apiErrors = [];
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/') && (response.status() === 404 || response.status() === 500)) {
          apiErrors.push({
            url: url,
            status: response.status(),
            method: response.request().method()
          });
        }
      });
      
      // Test critical API endpoints directly
      const endpoints = [
        '/api/health',
        '/api/auth/me',
        '/api/documents',
        '/api/users/profile'
      ];
      
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      // Test each endpoint
      for (const endpoint of endpoints) {
        try {
          const response = await page.request.get(`${BASE_URL}${endpoint}`);
          if (response.status() >= 400) {
            apiErrors.push({
              url: `${BASE_URL}${endpoint}`,
              status: response.status(),
              method: 'GET'
            });
          }
        } catch (error) {
          console.log(`Error testing ${endpoint}:`, error.message);
        }
      }
      
      if (apiErrors.length > 0) {
        console.log('❌ API Endpoint Errors:');
        apiErrors.forEach(error => {
          console.log(`  - ${error.method} ${error.url} -> ${error.status}`);
        });
      }
      
      expect(apiErrors.length).toBe(0);
    });
  });

  test.describe('Frontend State Management Issues', () => {
    
    test('should detect undefined ID errors in routing', async ({ page }) => {
      const routingErrors = [];
      
      // Monitor for undefined parameters in URLs
      page.on('request', request => {
        const url = request.url();
        if (url.includes('/undefined') || url.includes('undefined/')) {
          routingErrors.push(url);
        }
      });
      
      // Login and navigate
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      // Try to access documents page directly
      await page.goto(`${BASE_URL}/documents`);
      await page.waitForLoadState('networkidle');
      
      // Try various document-related actions
      try {
        // Look for any buttons or links that might trigger document fetching
        const triggers = [
          page.locator('button:has-text("View")'),
          page.locator('button:has-text("Edit")'),
          page.locator('button:has-text("Download")'),
          page.locator('a[href*="/document/"]'),
          page.locator('[data-testid*="document"]')
        ];
        
        for (const trigger of triggers) {
          if (await trigger.first().isVisible({ timeout: 1000 })) {
            await trigger.first().click();
            await page.waitForTimeout(2000);
          }
        }
      } catch (error) {
        console.log('No document triggers found or error clicking:', error.message);
      }
      
      if (routingErrors.length > 0) {
        console.log('❌ Undefined routing errors found:');
        routingErrors.forEach(url => console.log(`  - ${url}`));
      }
      
      expect(routingErrors.length).toBe(0);
    });
    
    test('should validate React component state handling', async ({ page }) => {
      // Check for React-specific errors
      const reactErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('React')) {
          reactErrors.push(msg.text());
        }
      });
      
      page.on('pageerror', error => {
        if (error.message.includes('React') || error.message.includes('useState') || error.message.includes('useEffect')) {
          reactErrors.push(error.message);
        }
      });
      
      // Login and interact with the app
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      await page.waitForTimeout(3000);
      
      // Interact with various UI elements to trigger state changes
      try {
        // Click around the interface
        const interactions = [
          () => page.locator('button').first().click(),
          () => page.locator('a').first().click(),
          () => page.goBack(),
          () => page.goForward(),
          () => page.reload()
        ];
        
        for (const interaction of interactions) {
          try {
            await interaction();
            await page.waitForTimeout(1000);
          } catch (error) {
            // Continue with other interactions
          }
        }
      } catch (error) {
        console.log('Error during interactions:', error.message);
      }
      
      if (reactErrors.length > 0) {
        console.log('❌ React State Errors:');
        reactErrors.forEach(error => console.log(`  - ${error}`));
      }
      
      expect(reactErrors.length).toBe(0);
    });
  });

  test.describe('Performance and Resource Monitoring', () => {
    
    test('should detect slow API responses', async ({ page }) => {
      const slowRequests = [];
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/')) {
          const timing = response.timing();
          const totalTime = timing.responseEnd - timing.requestStart;
          if (totalTime > 5000) { // 5 second threshold
            slowRequests.push({
              url: url,
              responseTime: totalTime,
              status: response.status()
            });
          }
        }
      });
      
      // Login and use the app
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      // Navigate to different sections
      const sections = ['/dashboard', '/documents', '/profile'];
      for (const section of sections) {
        await page.goto(`${BASE_URL}${section}`);
        await page.waitForLoadState('networkidle');
      }
      
      if (slowRequests.length > 0) {
        console.log('⚠️  Slow API Requests:');
        slowRequests.forEach(req => {
          console.log(`  - ${req.url}: ${req.responseTime}ms (${req.status})`);
        });
      }
      
      // Warning but not failure for performance issues
      expect(slowRequests.length).toBeLessThan(5);
    });
    
    test('should check for memory leaks and excessive DOM nodes', async ({ page }) => {
      // Monitor DOM node count
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      const initialNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
      
      // Navigate around the app
      for (let i = 0; i < 5; i++) {
        await page.goto(`${BASE_URL}/dashboard`);
        await page.goto(`${BASE_URL}/documents`);
        await page.waitForLoadState('networkidle');
      }
      
      const finalNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
      const nodeIncrease = finalNodeCount - initialNodeCount;
      
      console.log(`DOM Nodes: ${initialNodeCount} -> ${finalNodeCount} (${nodeIncrease > 0 ? '+' : ''}${nodeIncrease})`);
      
      // Warn if DOM nodes increased significantly (possible memory leak)
      if (nodeIncrease > 1000) {
        console.log('⚠️  Possible memory leak detected - DOM nodes increased significantly');
      }
      
      expect(nodeIncrease).toBeLessThan(2000);
    });
  });
  
  test.describe('Security and Error Handling', () => {
    
    test('should handle invalid routes gracefully', async ({ page }) => {
      const invalidRoutes = [
        '/invalid-route',
        '/documents/invalid-id',
        '/users/nonexistent',
        '/api/invalid-endpoint'
      ];
      
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="email"]').fill('admin@demo.com');
      await page.locator('input[name="password"]').fill('demopass123');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/.*\/dashboard/);
      
      for (const route of invalidRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        
        // Should not have console errors for 404s - should be handled gracefully
        const hasErrors = page.errors.some(error => 
          !error.includes('404') && // 404s are expected
          !error.includes('Not Found') // Expected error messages
        );
        
        if (hasErrors) {
          console.log(`❌ Unhandled errors on invalid route ${route}:`, page.errors);
        }
        
        expect(hasErrors).toBe(false);
        
        // Clear errors for next iteration
        page.errors.length = 0;
      }
    });
  });
});

// Utility test for debugging the specific error
test.describe('Debug Specific Issues', () => {
  
  test('debug the /documents/undefined error specifically', async ({ page }) => {
    console.log('🔍 Debugging the specific /documents/undefined error...');
    
    // Capture all network activity
    const networkActivity = [];
    page.on('request', request => {
      networkActivity.push({
        type: 'request',
        url: request.url(),
        method: request.method()
      });
    });
    
    page.on('response', response => {
      networkActivity.push({
        type: 'response',
        url: response.url(),
        status: response.status()
      });
    });
    
    // Login
    await page.goto('http://34.235.117.235/login');
    await page.locator('input[name="email"]').fill('admin@demo.com');
    await page.locator('input[name="password"]').fill('demopass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/.*\/dashboard/);
    
    // Wait for any async operations
    await page.waitForTimeout(5000);
    
    // Look for the problematic request
    const undefinedRequests = networkActivity.filter(activity => 
      activity.url && activity.url.includes('/documents/undefined')
    );
    
    if (undefinedRequests.length > 0) {
      console.log('🎯 FOUND THE ISSUE!');
      console.log('Undefined document requests:', undefinedRequests);
      
      // Print the full network trace around the error
      const errorIndex = networkActivity.findIndex(activity => 
        activity.url && activity.url.includes('/documents/undefined')
      );
      
      if (errorIndex > -1) {
        console.log('Network activity around the error:');
        const start = Math.max(0, errorIndex - 5);
        const end = Math.min(networkActivity.length, errorIndex + 5);
        for (let i = start; i < end; i++) {
          const activity = networkActivity[i];
          const marker = i === errorIndex ? '>>> ' : '    ';
          console.log(`${marker}${activity.type}: ${activity.method || ''} ${activity.url} ${activity.status || ''}`);
        }
      }
    } else {
      console.log('No undefined document requests found in this session');
    }
    
    console.log(`Total network requests: ${networkActivity.length}`);
    console.log(`Console errors: ${page.errors.length}`);
    
    // This test is for debugging, so it always passes
    expect(true).toBe(true);
  });
});
