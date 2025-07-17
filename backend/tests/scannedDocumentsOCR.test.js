const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Document = require('../src/models/Document');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');

describe('Scanned Documents OCR API', () => {
  let authToken;
  let testUser;
  let testImageBuffer;

  beforeAll(async () => {
    await setupTestDB();
    
    // Create a test image with sample POA text
    testImageBuffer = await createTestImage();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    
    testUser = new User({
      firstName: 'OCR',
      lastName: 'Tester',
      email: 'ocr.test@example.com',
      password: 'password123',
      tier: 'professional',
      role: 'user',
      validationsThisMonth: 0
    });
    await testUser.save();

    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/scanned-documents/supported-languages', () => {
    it('should return supported OCR languages without authentication', async () => {
      const response = await request(app)
        .get('/api/scanned-documents/supported-languages')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.languages).toBeInstanceOf(Array);
      expect(response.body.languages.length).toBeGreaterThan(0);
      expect(response.body.default).toBe('eng');
      
      // Check for expected languages
      const languageCodes = response.body.languages.map(lang => lang.code);
      expect(languageCodes).toContain('eng');
      expect(languageCodes).toContain('spa');
      expect(languageCodes).toContain('fra');
    });
  });

  describe('POST /api/scanned-documents/analyze-quality', () => {
    it('should analyze image quality successfully', async () => {
      const response = await request(app)
        .post('/api/scanned-documents/analyze-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'test-document.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.qualityAnalysis).toBeDefined();
      expect(response.body.qualityAnalysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.qualityAnalysis.overallScore).toBeLessThanOrEqual(100);
      expect(response.body.qualityAnalysis.resolution).toBeDefined();
      expect(response.body.qualityAnalysis.quality).toBeDefined();
    });

    it('should reject non-image files', async () => {
      const textBuffer = Buffer.from('This is not an image');
      
      const response = await request(app)
        .post('/api/scanned-documents/analyze-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', textBuffer, 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Invalid MIME type: text/plain');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/scanned-documents/analyze-quality')
        .attach('document', testImageBuffer, 'test-document.jpg')
        .expect(401);
    });
  });

  describe('POST /api/scanned-documents/extract-text', () => {
    it('should extract text from image successfully', async () => {
      const response = await request(app)
        .post('/api/scanned-documents/extract-text')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'test-document.jpg')
        .field('language', 'eng')
        .field('preprocess', 'true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.extractedText).toBeDefined();
      expect(response.body.confidence).toBeGreaterThanOrEqual(0);
      expect(response.body.confidence).toBeLessThanOrEqual(100);
      expect(response.body.wordCount).toBeGreaterThanOrEqual(0);
      expect(response.body.processingTime).toBeGreaterThan(0);
    });

    it('should support different languages', async () => {
      const response = await request(app)
        .post('/api/scanned-documents/extract-text')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'test-document.jpg')
        .field('language', 'spa')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.language).toBe('spa');
    });
  });

  describe('POST /api/scanned-documents/upload', () => {
    it('should upload and process scanned document successfully', async () => {
      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'test-poa.jpg')
        .field('language', 'eng')
        .field('caseId', 'TEST-001')
        .field('notes', 'Test OCR document')
        .field('tags', 'test,ocr,poa')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.document).toBeDefined();
      expect(response.body.document._id).toBeDefined();
      expect(response.body.document.originalName).toBe('test-poa.jpg');
      expect(response.body.document.status).toBe('completed');
      
      // Verify document was saved to database
      const savedDoc = await Document.findById(response.body.document._id);
      expect(savedDoc).toBeTruthy();
      expect(savedDoc.source).toBe('scanned');
      expect(savedDoc.scannedDocumentData).toBeDefined();
      expect(savedDoc.scannedDocumentData.ocrResults).toBeDefined();
    });

    it('should handle large file uploads within limits', async () => {
      // Create a larger test image (but still under 10MB limit)
      const largeImageBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .jpeg({ quality: 80 })
      .toBuffer();

      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', largeImageBuffer, 'large-test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject files over size limit', async () => {
      // Create a file that's too large (simulate with a very large buffer)
      const oversizedBuffer = Buffer.alloc(12 * 1024 * 1024); // 12MB
      
      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', oversizedBuffer, 'oversized.jpg')
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too large');
    });

    it('should validate user tier limits', async () => {
      // Set user to free tier with limited validations
      testUser.tier = 'free';
      testUser.tierLimits = { validationsPerMonth: 5 };
      testUser.validationsThisMonth = 5; // At limit
      await testUser.save();

      // Update auth token with new user data
      authToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'test.jpg')
        .expect(400);

      // Note: This test assumes tier limit checking is implemented
      // You may need to adjust based on your actual implementation
    });
  });

  describe('GET /api/scanned-documents/:id/details', () => {
    let testDocumentId;

    beforeEach(async () => {
      // Create a test scanned document
      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'test-details.jpg')
        .field('notes', 'Test document for details');
      
      testDocumentId = response.body.document._id;
    });

    it('should return detailed scanned document information', async () => {
      const response = await request(app)
        .get(`/api/scanned-documents/${testDocumentId}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.document).toBeDefined();
      expect(response.body.document._id).toBe(testDocumentId);
      expect(response.body.document.scannedDocumentData).toBeDefined();
      expect(response.body.document.scannedDocumentData.ocrResults).toBeDefined();
      expect(response.body.document.scannedDocumentData.imageQuality).toBeDefined();
    });

    it('should not return documents from other users', async () => {
      // Create another user
      const otherUser = new User({
        firstName: 'Other',
        lastName: 'User', 
        email: 'other@example.com',
        password: 'password123'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { id: otherUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/scanned-documents/${testDocumentId}/details`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });

  describe('Image Processing Service Integration', () => {
    it('should handle various image formats', async () => {
      const formats = [
        { format: 'jpeg', filename: 'test.jpg' },
        { format: 'png', filename: 'test.png' },
        { format: 'webp', filename: 'test.webp' }
      ];

      for (const { format, filename } of formats) {
        const imageBuffer = await sharp({
          create: {
            width: 800,
            height: 600,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .toFormat(format)
        .toBuffer();

        const response = await request(app)
          .post('/api/scanned-documents/analyze-quality')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('document', imageBuffer, filename)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should provide quality recommendations', async () => {
      // Create a low-quality image
      const lowQualityImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
      .blur(5) // Add blur to reduce quality
      .jpeg({ quality: 10 })
      .toBuffer();

      const response = await request(app)
        .post('/api/scanned-documents/analyze-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', lowQualityImage, 'low-quality.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.qualityAnalysis.recommendations).toBeInstanceOf(Array);
      expect(response.body.qualityAnalysis.recommendations.length).toBeGreaterThan(0);
      expect(response.body.qualityAnalysis.overallScore).toBeLessThan(80);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted image files gracefully', async () => {
      const corruptedBuffer = Buffer.from('NOT_AN_IMAGE_FILE');
      
      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', corruptedBuffer, 'corrupted.jpg')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });
  });

  describe('Performance Tests', () => {
    it('should process images within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/scanned-documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', testImageBuffer, 'performance-test.jpg')
        .expect(201);

      const processingTime = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(response.body.document.processingTime).toBeLessThan(10000); // Server processing under 10s
    });
  });
});

// Helper function to create a test image with sample text
async function createTestImage() {
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="50" y="100" font-family="Arial" font-size="24" fill="black">
        POWER OF ATTORNEY FOR CREMATION
      </text>
      <text x="50" y="150" font-family="Arial" font-size="16" fill="black">
        I, John Doe, hereby grant power of attorney
      </text>
      <text x="50" y="180" font-family="Arial" font-size="16" fill="black">
        to Jane Smith for the purpose of authorizing
      </text>
      <text x="50" y="210" font-family="Arial" font-size="16" fill="black">
        cremation services in accordance with
      </text>
      <text x="50" y="240" font-family="Arial" font-size="16" fill="black">
        California Probate Code Section 7100.
      </text>
      <text x="50" y="300" font-family="Arial" font-size="14" fill="black">
        Notarized by: Mary Johnson, Notary Public
      </text>
      <text x="50" y="330" font-family="Arial" font-size="14" fill="black">
        Commission #12345678
      </text>
      <text x="50" y="360" font-family="Arial" font-size="14" fill="black">
        Expires: December 31, 2025
      </text>
      <text x="50" y="420" font-family="Arial" font-size="14" fill="black">
        Witness 1: Robert Wilson
      </text>
      <text x="50" y="450" font-family="Arial" font-size="14" fill="black">
        Witness 2: Sarah Davis
      </text>
      <text x="50" y="520" font-family="Arial" font-size="12" fill="black">
        Date: July 16, 2025
      </text>
    </svg>
  `;

  return await sharp(Buffer.from(svg))
    .jpeg()
    .toBuffer();
}

module.exports = {
  createTestImage
};
