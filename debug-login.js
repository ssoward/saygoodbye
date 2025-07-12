const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Listen to all network requests
  context.route('**/*', (route, request) => {
    console.log(`${request.method()} ${request.url()}`);
    if (request.method() === 'POST' && request.url().includes('/api/auth/login')) {
      console.log('LOGIN REQUEST DETAILS:');
      console.log('Headers:', request.headers());
      console.log('Post data:', request.postData());
    }
    route.continue();
  });

  // Listen to all responses
  context.on('response', response => {
    console.log(`RESPONSE: ${response.status()} ${response.url()}`);
    if (response.status() >= 400) {
      response.text().then(text => console.log('Error response body:', text));
    }
    if (response.url().includes('/api/')) {
      response.text().then(text => console.log('API Response body:', text));
    }
  });

  const page = await context.newPage();
  
  try {
    console.log('Navigating to the application...');
    await page.goto('http://3.89.161.178/', { waitUntil: 'load' });
    
    console.log('Waiting for login page...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    console.log('Filling login form...');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait a bit to see the response
    await page.waitForTimeout(5000);
    
    // Look for any error messages on the page
    const errorElements = await page.locator('.error, .alert-error, [role="alert"]').all();
    for (const element of errorElements) {
      const text = await element.textContent();
      console.log('Error on page:', text);
    }
    
    // Check if we're still on login page or redirected
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
  } catch (error) {
    console.error('Error during test:', error);
  }
  
  await browser.close();
})();
