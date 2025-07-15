const fs = require('fs');
const path = require('path');

// Simple PDF generator for testing
function generateTestPDF(content = 'Test POA Document Content') {
  // Basic PDF structure with text content
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${content}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000369 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;

  return Buffer.from(pdfContent);
}

// Generate test PDF with POA content
function generatePOATestPDF() {
  const poaContent = `POWER OF ATTORNEY FOR CREMATION
I, John Doe, hereby grant power of attorney to Jane Smith 
to authorize cremation services for disposition of remains.
Notary Public: Mary Johnson
Commission Number: 12345678
Commission Expires: 12/31/2025
Witness 1: Robert Wilson
Witness 2: Susan Davis
Date: January 1, 2024`;
  
  return generateTestPDF(poaContent);
}

// Generate invalid test PDF (not POA related)
function generateNonPOATestPDF() {
  const content = `This is a regular document that does not contain 
any power of attorney or cremation authorization content.
It's just a normal document for testing purposes.`;
  
  return generateTestPDF(content);
}

module.exports = {
  generateTestPDF,
  generatePOATestPDF,
  generateNonPOATestPDF
};
