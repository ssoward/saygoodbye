const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/poa-documents.spec.js',
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for POA tests
  reporter: [
    ['html', { outputFolder: '/Users/ssoward/saygoodbye/test-results/poa-documents/html-report' }],
    ['json', { outputFile: '/Users/ssoward/saygoodbye/test-results/poa-documents/poa-results-20250714-201006.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://34.235.117.235',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true
  },
  projects: [
    {
      name: 'POA Document Tests',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome']
      },
    },
  ],
  outputDir: '/Users/ssoward/saygoodbye/test-results/poa-documents/playwright-output'
});
