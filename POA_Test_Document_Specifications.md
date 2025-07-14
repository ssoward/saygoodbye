# Say Goodbye POA App: Test Document Specifications

## 1. Overview

This document specifies 25 sample Power of Attorney (POA) documents for testing the Say Goodbye POA App, designed to validate POA documents for cremation processes in California. The documents include a mix of valid and invalid cases to test the app's validation of notary acknowledgments, witness signatures, and required verbiage, per California Probate Code (§4050, §4121-4128) and Civil Code (§1180-1207).

### 1.1 Purpose

- Provide a comprehensive set of test documents to validate the app's core functionality
- Test edge cases, error handling, and compliance with California legal requirements
- Support automated testing (e.g., via Playwright) and manual validation in production

### 1.2 Scope

- **Format**: PDF documents (generated or mocked)
- **Quantity**: 25 documents (13 valid, 12 invalid)
- **Validation Criteria**:
  - **Notary**: Valid commission, not expired, not the agent (Probate Code §4128)
  - **Witness Signatures**: At least one valid witness, not a prohibited party (Probate Code §4121-4122)
  - **Verbiage**: Explicit cremation authorization (Probate Code §4050)

## 2. Test Document Specifications

### 2.1 Valid Documents (13)

| ID | Description | Content Outline | Validity | Expected App Behavior |
|----|-------------|----------------|----------|----------------------|
| V1 | Valid durable POA with notary and 2 witnesses | Durable POA, explicit cremation authority<br>Notary: Valid name, commission #, active date<br>2 witnesses (unrelated)<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V2 | Valid non-durable POA with notary and 1 witness | Non-durable POA, cremation authority<br>Notary: Valid, active<br>1 witness (valid)<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V3 | Valid POA with minimal verbiage | Durable POA, minimal cremation verbiage<br>Notary: Valid<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V4 | Valid POA with complex verbiage | Durable POA, detailed cremation verbiage<br>Notary: Valid<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V5 | Valid POA with manual notary input | Durable POA, cremation authority<br>Notary: Valid details (manual input)<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" (manual notary) |
| V6 | Valid POA with e-signature | Durable POA, cremation authority<br>Notary: Valid e-notary<br>2 e-witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V7 | Valid POA with single witness | Durable POA, cremation authority<br>Notary: Valid<br>1 witness (valid)<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V8 | Valid POA with recent notary | Durable POA, cremation authority<br>Notary: Recently commissioned (2025)<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V9 | Valid POA with multiple agents | Durable POA, cremation authority, multiple agents<br>Notary: Valid<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V10 | Valid POA with scanned signature | Durable POA, cremation authority<br>Notary: Valid, scanned signature<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V11 | Valid POA with minimal notary details | Durable POA, cremation authority<br>Notary: Minimal details (name, commission #)<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V12 | Valid POA with non-standard format | Durable POA, cremation authority, custom format<br>Notary: Valid<br>2 witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |
| V13 | Valid POA with typed signatures | Durable POA, cremation authority<br>Notary: Valid, typed signature<br>2 typed witnesses<br>Signed 2025 | Valid | Pass: "Valid POA" |

### 2.2 Invalid Documents (12)

| ID | Description | Content Outline | Validity | Expected App Behavior |
|----|-------------|----------------|----------|----------------------|
| I1 | Invalid notary (expired) | Durable POA, cremation authority<br>Notary: Expired commission (2023)<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Expired notary commission" |
| I2 | Missing notary | Durable POA, cremation authority<br>No notary section<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Missing notary acknowledgment" |
| I3 | Notary is agent | Durable POA, cremation authority<br>Notary: Same as agent<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Notary cannot be agent" |
| I4 | No witness signatures | Durable POA, cremation authority<br>Notary: Valid<br>No witnesses<br>Signed 2025 | Invalid | Fail: "Missing witness signature" |
| I5 | Witness is agent | Durable POA, cremation authority<br>Notary: Valid<br>Witness: Same as agent<br>Signed 2025 | Invalid | Fail: "Witness cannot be agent" |
| I6 | Missing cremation verbiage | Durable POA, no cremation authority<br>Notary: Valid<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Missing cremation authorization" |
| I7 | Unreadable PDF (corrupt) | Corrupt PDF file<br>Unreadable content | Invalid | Fail: "Unreadable PDF, please re-upload" |
| I8 | Invalid notary commission # | Durable POA, cremation authority<br>Notary: Invalid commission #<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Invalid notary commission number" |
| I9 | Expired POA (past end date) | Non-durable POA, expired 2024<br>Notary: Valid<br>2 witnesses<br>Signed 2023 | Invalid | Fail: "POA expired" |
| I10 | Incomplete notary details | Durable POA, cremation authority<br>Notary: Missing commission #<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Incomplete notary details" |
| I11 | Non-compliant verbiage | Durable POA, vague verbiage<br>Notary: Valid<br>2 witnesses<br>Signed 2025 | Invalid | Fail: "Non-compliant verbiage" |
| I12 | Scanned but illegible signatures | Durable POA, cremation authority<br>Notary: Valid but illegible<br>2 illegible witnesses<br>Signed 2025 | Invalid | Fail: "Illegible signatures, please verify" |

## 3. Test Case Details

### 3.1 Validation Criteria

#### Notary Validation
- Must be a valid California notary (active commission)
- Not the agent or a prohibited party (Probate Code §4128)
- Includes name, commission number, and active date

#### Witness Signatures
- At least one witness (per Probate Code §4121-4122)
- Witnesses must not be the agent or prohibited parties

#### Verbiage
- Must include explicit cremation authorization (Probate Code §4050)
- Durable POAs must specify durability (Probate Code §4124)

#### Error Handling
- Handle corrupt/unreadable PDFs with clear error messages
- Support manual notary input if API fails

### 3.2 Test Scenarios

- **Valid Cases**: Test successful validation, report generation, and UI display
- **Invalid Cases**: Test error messages, user prompts, and report accuracy
- **Edge Cases**: Test unreadable PDFs, illegible signatures, minimal verbiage
- **Performance**: Test processing time (<10 seconds for 5MB PDFs)
- **Security**: Test access controls (Free Tier limits, admin privileges)

## 4. Implementation Guide

### 4.1 PDF Generation

Use Node.js with pdfkit to generate test PDFs:

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');

function generateTestPDF(id, content) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(`test-docs/${id}.pdf`));
  
  doc.font('Times-Roman')
     .fontSize(16)
     .text('POWER OF ATTORNEY FOR CREMATION', { align: 'center' })
     .fontSize(12)
     .text('\nState of California\n\n')
     .text(content.principal)
     .text(content.agent)
     .text(content.cremationAuthority)
     .text(content.notary)
     .text(content.witnesses);
  
  doc.end();
}
```

### 4.2 Mock Notary API

```javascript
const express = require('express');
const app = express();

app.get('/api/notary/:commission', (req, res) => {
  const validCommissions = ['123456', '789012', '345678'];
  const expiredCommissions = ['999999'];
  
  if (validCommissions.includes(req.params.commission)) {
    res.json({ valid: true, status: 'active', expires: '2026-12-31' });
  } else if (expiredCommissions.includes(req.params.commission)) {
    res.json({ valid: false, status: 'expired', expires: '2023-12-31' });
  } else {
    res.json({ valid: false, status: 'not_found' });
  }
});
```

### 4.3 Playwright Test Integration

```javascript
const { test, expect } = require('@playwright/test');

test.describe('POA Document Validation', () => {
  test('Valid POA V1 - should pass validation', async ({ page }) => {
    await page.goto('http://34.235.117.235');
    await page.locator('[data-testid="login-email"]').fill('admin@demo.com');
    await page.locator('[data-testid="login-password"]').fill('demopass123');
    await page.locator('[data-testid="login-submit"]').click();
    
    await page.setInputFiles('input[type="file"]', 'test-docs/V1.pdf');
    await page.locator('[data-testid="upload-submit"]').click();
    
    await expect(page.locator('text=Valid POA')).toBeVisible();
  });
  
  test('Invalid POA I1 - should fail with expired notary', async ({ page }) => {
    await page.goto('http://34.235.117.235');
    await page.locator('[data-testid="login-email"]').fill('admin@demo.com');
    await page.locator('[data-testid="login-password"]').fill('demopass123');
    await page.locator('[data-testid="login-submit"]').click();
    
    await page.setInputFiles('input[type="file"]', 'test-docs/I1.pdf');
    await page.locator('[data-testid="upload-submit"]').click();
    
    await expect(page.locator('text=Expired notary commission')).toBeVisible();
  });
});
```

## 5. Success Metrics

- **Accuracy**: 95% correct validation (24/25 documents correctly identified)
- **Performance**: <10 seconds for single PDF, <30 seconds for 10-PDF batch
- **Error Handling**: 100% of corrupt/illegible PDFs prompt re-upload
- **Usability**: 90% of test users complete upload/validation in <1 minute
- **Security**: No unauthorized access to tier-restricted features

## 6. Testing Instructions

### 6.1 Setup
1. Deploy to production environment (34.235.117.235)
2. Generate test PDFs using the provided scripts
3. Configure mock notary API for testing
4. Set up test users for different tiers

### 6.2 Execution
1. Upload each test document via the frontend
2. Validate expected behaviors match specifications
3. Record processing times and error handling
4. Test batch processing for Professional/Enterprise tiers
5. Verify security restrictions for each user tier

### 6.3 Reporting
- Generate validation reports for each test case
- Document any discrepancies from expected behavior
- Performance metrics for processing times
- Security audit results for tier restrictions
