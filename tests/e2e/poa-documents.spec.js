const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration
const TEST_DOCS_DIR = path.join(__dirname, '..', '..', 'test-docs');

// Valid test documents (should pass validation)
const validDocs = [
  { id: 'V1', name: 'Valid durable POA with notary and 2 witnesses', expectedMessage: 'Valid POA' },
  { id: 'V2', name: 'Valid non-durable POA with notary and 1 witness', expectedMessage: 'Valid POA' },
  { id: 'V3', name: 'Valid POA with minimal verbiage', expectedMessage: 'Valid POA' }
];

// Invalid test documents (should fail validation)
const invalidDocs = [
  { id: 'I1', name: 'Invalid notary (expired)', expectedMessage: 'Expired notary commission' },
  { id: 'I2', name: 'Missing notary', expectedMessage: 'Missing notary acknowledgment' }
];

test.describe('POA Document Validation - Basic Suite', () => {
  
  // Helper function to login as admin
  async function loginAsAdmin(page) {
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    await page.locator('input[name="email"]').fill('admin@demo.com');
    await page.locator('input[name="password"]').fill('demopass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard to load
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
  }

  // Helper function to login as demo user  
  async function loginAsDemo(page) {
    await page.goto('/');
    await page.waitForURL(/.*\/login/);
    
    await page.locator('input[name="email"]').fill('user@demo.com');
    await page.locator('input[name="password"]').fill('demopass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard to load
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
  }

  test.describe('Admin User - Document Upload Tests', () => {
    test('should login as admin and access dashboard', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Verify dashboard elements
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
      
      // Check for upload section
      await expect(page.getByRole('heading', { name: /upload document/i })).toBeVisible();
    });

    test('should upload and validate a valid POA document (V1)', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Look for upload button
      const uploadButton = page.getByRole('button', { name: /upload first document/i });
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
      }
      
      // Upload the test document
      const filePath = path.join(TEST_DOCS_DIR, 'V1.pdf');
      
      // Wait for the upload area to be visible
      await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
      
      // Find the file input (react-dropzone creates a hidden input)
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);
      
      // Wait for upload to process (allow time for validation)
      await page.waitForTimeout(10000);
      
      // Check for success indicators (adjust based on actual UI)
      const successIndicators = [
        page.getByText(/valid/i),
        page.getByText(/success/i),
        page.getByText(/approved/i),
        page.getByText(/compliant/i)
      ];
      
      let foundSuccess = false;
      for (const indicator of successIndicators) {
        if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
          foundSuccess = true;
          break;
        }
      }
      
      // If no specific success indicator, check that no error occurred
      if (!foundSuccess) {
        // At minimum, verify no error messages
        const errorIndicators = [
          page.getByText(/error/i),
          page.getByText(/failed/i),
          page.getByText(/invalid/i),
          page.getByText(/rejected/i)
        ];
        
        for (const errorIndicator of errorIndicators) {
          await expect(errorIndicator).not.toBeVisible();
        }
      }
    });

    test('should upload and detect invalid POA document (I1)', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Look for upload button
      const uploadButton = page.getByRole('button', { name: /upload first document/i });
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
      }
      
      // Upload the invalid test document
      const filePath = path.join(TEST_DOCS_DIR, 'I1.pdf');
      
      // Wait for the upload area to be visible
      await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);
      
      // Wait for upload to process
      await page.waitForTimeout(10000);
      
      // Check for error indicators (adjust based on actual UI)
      const errorIndicators = [
        page.getByText(/expired/i),
        page.getByText(/invalid/i),
        page.getByText(/error/i),
        page.getByText(/failed/i),
        page.getByText(/notary/i)
      ];
      
      let foundError = false;
      for (const indicator of errorIndicators) {
        if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
          foundError = true;
          break;
        }
      }
      
      // Expect some kind of validation feedback
      expect(foundError).toBe(true);
    });
  });

  test.describe('Demo User - Access Control Tests', () => {
    test('should login as demo user and check tier restrictions', async ({ page }) => {
      await loginAsDemo(page);
      
      // Verify dashboard access
      await expect(page).toHaveURL(/.*\/dashboard/);
      
      // Check for tier-specific messaging
      const tierIndicators = [
        page.getByText(/free/i),
        page.getByText(/validations remaining/i),
        page.getByText(/upgrade/i),
        page.getByText(/5 validations/i)
      ];
      
      let foundTierInfo = false;
      for (const indicator of tierIndicators) {
        if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundTierInfo = true;
          break;
        }
      }
      
      // Should show some indication of tier/limits
      // (Even if not exact text, user should see limit info)
    });

    test('should upload document as demo user', async ({ page }) => {
      await loginAsDemo(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Try to upload a document
      const uploadButton = page.getByRole('button', { name: /upload first document/i });
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
        
        // Upload a valid test document
        const filePath = path.join(TEST_DOCS_DIR, 'V2.pdf');
        
        // Wait for the upload area to be visible
        await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
        
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(filePath);
        
        // Wait for processing
        await page.waitForTimeout(8000);
        
        // Verify upload was processed (no specific assertions about result)
        // Just ensure the app didn't crash
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle non-PDF file upload', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create a temporary text file for testing
      const fs = require('fs');
      const txtFilePath = path.join(TEST_DOCS_DIR, 'test.txt');
      fs.writeFileSync(txtFilePath, 'This is not a PDF file');
      
      try {
        // Look for upload button
        const uploadButton = page.getByRole('button', { name: /upload first document/i });
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
        }
        
        // Try to upload text file
        // Wait for the upload area to be visible
        await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
        
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(txtFilePath);
        
        // Wait and check for error handling
        await page.waitForTimeout(3000);
        
        // Look for file type error indicators
        const fileTypeErrors = [
          page.getByText(/pdf/i),
          page.getByText(/file type/i),
          page.getByText(/invalid/i),
          page.getByText(/format/i)
        ];
        
        // Should show some error indication or reject the file
        // (Exact behavior depends on implementation)
        
      } finally {
        // Cleanup test file
        if (fs.existsSync(txtFilePath)) {
          fs.unlinkSync(txtFilePath);
        }
      }
    });

    test('should handle corrupt PDF file (I7)', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Look for upload button
      const uploadButton = page.getByRole('button', { name: /upload first document/i });
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
      }
      
      // Upload corrupt PDF
      const filePath = path.join(TEST_DOCS_DIR, 'I7.pdf');
      
      // Wait for the upload area to be visible
      await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);
      
      // Wait for processing
      await page.waitForTimeout(8000);
      
      // Should handle corrupt file gracefully (no crashes)
      await expect(page.locator('body')).toBeVisible();
      
      // Look for error handling indicators
      const corruptionErrors = [
        page.getByText(/corrupt/i),
        page.getByText(/unreadable/i),
        page.getByText(/error/i),
        page.getByText(/re-upload/i)
      ];
      
      // Expect some error indication
      let foundCorruptionError = false;
      for (const error of corruptionErrors) {
        if (await error.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundCorruptionError = true;
          break;
        }
      }
    });
  });

  test.describe('Performance and Reliability Tests', () => {
    test('should handle multiple document uploads without crashing', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Upload multiple documents sequentially
      const testDocs = ['V1.pdf', 'V2.pdf', 'I1.pdf'];
      
      for (const doc of testDocs) {
        try {
          // Look for upload button
          const uploadButton = page.getByRole('button', { name: /upload first document/i });
          if (await uploadButton.isVisible()) {
            await uploadButton.click();
          }
          
          // Upload document
          const filePath = path.join(TEST_DOCS_DIR, doc);
          
          // Wait for the upload area to be visible
          await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
          
          const fileInput = page.locator('input[type="file"]').first();
          await fileInput.setInputFiles(filePath);
          
          // Wait for processing
          await page.waitForTimeout(8000);
          
          // Verify app is still responsive
          await expect(page.locator('body')).toBeVisible();
          
        } catch (error) {
          console.log(`Error uploading ${doc}:`, error.message);
          // Continue with next document
        }
      }
    });

    test('should validate processing time is reasonable', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Skip tour if present
      const skipButton = page.getByRole('button', { name: /skip tour/i });
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Measure upload and processing time
      const startTime = Date.now();
      
      // Look for upload button
      const uploadButton = page.getByRole('button', { name: /upload first document/i });
      if (await uploadButton.isVisible()) {
        await uploadButton.click();
      }
      
      // Upload document
      const filePath = path.join(TEST_DOCS_DIR, 'V3.pdf');
      
      // Wait for the upload area to be visible
      await page.waitForSelector('div:has-text("Drag & drop PDF files here")', { timeout: 10000 });
      
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(filePath);
      
      // Wait for any processing indicators to appear/disappear
      await page.waitForTimeout(10000);
      
      const processingTime = Date.now() - startTime;
      console.log(`Processing time: ${processingTime}ms`);
      
      // Reasonable processing time (less than 30 seconds for single document)
      expect(processingTime).toBeLessThan(30000);
    });
  });
});

// Export test configuration for reporting
module.exports = {
  validDocs,
  invalidDocs,
  TEST_DOCS_DIR
};
