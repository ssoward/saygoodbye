# POA Test Documents - Say Goodbye App

This directory contains 25 comprehensive test documents for validating the Say Goodbye POA App's document processing capabilities.

## 📋 Test Document Overview

### Valid Documents (13 total)
Documents that should pass all validation checks:

| ID | Document Type | Test Focus | Expected Result |
|----|---------------|------------|-----------------|
| V1 | Durable POA with notary + 2 witnesses | Standard valid document | ✅ Valid POA |
| V2 | Non-durable POA with notary + 1 witness | Minimal witness requirement | ✅ Valid POA |
| V3 | Durable POA with minimal verbiage | Minimal compliance | ✅ Valid POA |
| V4 | Durable POA with complex verbiage | Detailed legal language | ✅ Valid POA |
| V5 | Durable POA with manual notary input | Manual notary verification | ✅ Valid POA |
| V6 | Durable POA with e-signature | Electronic signatures | ✅ Valid POA |
| V7 | Durable POA with single witness | Single witness scenario | ✅ Valid POA |
| V8 | Durable POA with recent notary | Recently commissioned notary | ✅ Valid POA |
| V9 | Durable POA with multiple agents | Multiple agent appointment | ✅ Valid POA |
| V10 | Durable POA with scanned signature | Scanned signature handling | ✅ Valid POA |
| V11 | Durable POA with minimal notary details | Minimal notary information | ✅ Valid POA |
| V12 | Durable POA with non-standard format | Custom document formatting | ✅ Valid POA |
| V13 | Durable POA with typed signatures | Typed signature validation | ✅ Valid POA |

### Invalid Documents (12 total)
Documents that should fail validation with specific error messages:

| ID | Document Type | Test Focus | Expected Result |
|----|---------------|------------|-----------------|
| I1 | Expired notary commission | Notary validation | ❌ Expired notary commission |
| I2 | Missing notary acknowledgment | Required notary section | ❌ Missing notary acknowledgment |
| I3 | Notary same as agent | Conflict of interest | ❌ Notary cannot be agent |
| I4 | No witness signatures | Required witness validation | ❌ Missing witness signature |
| I5 | Witness same as agent | Conflict of interest | ❌ Witness cannot be agent |
| I6 | Missing cremation verbiage | Required cremation authority | ❌ Missing cremation authorization |
| I7 | Corrupt/unreadable PDF | File corruption handling | ❌ Unreadable PDF, please re-upload |
| I8 | Invalid notary commission # | Commission number validation | ❌ Invalid notary commission number |
| I9 | Expired POA document | Document expiration check | ❌ POA expired |
| I10 | Incomplete notary details | Missing notary information | ❌ Incomplete notary details |
| I11 | Non-compliant verbiage | Vague cremation language | ❌ Non-compliant verbiage |
| I12 | Illegible signatures | Signature readability | ❌ Illegible signatures, please verify |

## 🚀 Quick Start

### Generate Test Documents
```bash
# Install required dependencies
npm install pdfkit --save-dev

# Generate all 25 test PDFs
node generate-test-pdfs.js
```

### Run Test Suite
```bash
# Quick test (5 documents)
./run-poa-tests.sh 1

# Full test suite (all 25 documents)
./run-poa-tests.sh 2

# Valid documents only
./run-poa-tests.sh 3

# Invalid documents only
./run-poa-tests.sh 4

# Performance tests
./run-poa-tests.sh 5

# Security tests
./run-poa-tests.sh 6

# Batch processing tests
./run-poa-tests.sh 7
```

### Manual Testing
1. Navigate to: http://34.235.117.235
2. Login with admin credentials: admin@demo.com / demopass123
3. Upload any test document from this directory
4. Verify the expected validation result

## 📊 Test Categories

### 1. Validation Tests
- **Notary Validation**: Commission status, expiration, conflicts
- **Witness Validation**: Signature requirements, conflicts
- **Verbiage Validation**: Cremation authority compliance
- **Document Integrity**: PDF readability, completeness

### 2. Performance Tests
- **Single Document**: < 10 seconds processing time
- **Batch Processing**: < 30 seconds for 10 documents
- **Large Files**: Handles documents up to 5MB

### 3. Security Tests
- **Tier Restrictions**: Free tier limits (3 validations)
- **Admin Access**: Unlimited validations for admin users
- **File Type Validation**: PDF-only uploads
- **Access Control**: User authentication requirements

### 4. Error Handling Tests
- **Corrupt Files**: Graceful handling of unreadable PDFs
- **Missing Elements**: Clear error messages for incomplete documents
- **Edge Cases**: Empty files, non-PDF uploads, oversized files

## 🔧 Technical Implementation

### PDF Generation
- Uses `pdfkit` library for consistent PDF creation
- Includes realistic legal content and formatting
- Supports various signature types (handwritten, typed, scanned, electronic)
- Implements controlled corruption for negative testing

### Test Framework
- **Playwright**: End-to-end browser automation
- **Node.js**: Test script execution and PDF generation
- **JSON Reports**: Structured test results and metrics
- **HTML Reports**: Visual test result dashboards

### Document Structure
Each test document includes:
- Principal information and agent appointment
- Specific cremation authority language
- Notary acknowledgment section
- Witness signature sections
- Legal compliance elements (durability clauses, etc.)

## 📈 Success Metrics

### Accuracy Targets
- **95% Overall Accuracy**: 24/25 documents correctly identified
- **100% Valid Detection**: All 13 valid documents pass
- **100% Invalid Detection**: All 12 invalid documents fail with correct error messages

### Performance Targets
- **Single Document**: < 10 seconds processing
- **Batch (10 docs)**: < 30 seconds total processing
- **Error Rate**: < 1% false positives/negatives

### User Experience Targets
- **Clear Error Messages**: Specific, actionable feedback
- **Progress Indicators**: Real-time processing status
- **Report Generation**: Downloadable validation reports

## 🐛 Known Issues & Workarounds

### Current Limitations
1. **Manual Notary Verification**: Some notary APIs may not have complete databases
2. **Signature Recognition**: OCR accuracy varies with scan quality
3. **Legal Interpretation**: Complex legal language may require manual review

### Testing Considerations
1. **Network Dependencies**: Tests require internet access for notary API calls
2. **Production Environment**: Tests run against live production server
3. **Rate Limiting**: Batch tests may trigger API rate limits

## 📚 Related Documentation

- **Main Project**: [../README.md](../README.md)
- **Product Requirements**: [../PRD.md](../PRD.md)
- **Test Specifications**: [../POA_Test_Document_Specifications.md](../POA_Test_Document_Specifications.md)
- **Deployment Guide**: [../deploy-enhanced.sh](../deploy-enhanced.sh)
- **Health Monitoring**: [../health-monitor-comprehensive.sh](../health-monitor-comprehensive.sh)

## 🤝 Contributing

### Adding New Test Cases
1. Update `POA_Test_Document_Specifications.md` with new test case details
2. Add new document generation logic to `generate-test-pdfs.js`
3. Add corresponding test cases to `tests/e2e/poa-documents.spec.js`
4. Update this README with the new test case information

### Reporting Issues
- Include test document ID and expected vs. actual behavior
- Provide logs from the HTML test reports
- Include production environment details (URL, timestamp)

## 📞 Support

For issues with test documents or testing framework:
- Review test reports in `../test-results/poa-documents/`
- Check production health with `../health-check-quick.sh`
- Contact development team with specific test case details
