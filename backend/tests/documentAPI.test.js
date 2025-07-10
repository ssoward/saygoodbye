const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Document = require('../src/models/Document');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');

describe('Document API', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    
    testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
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

  describe('POST /api/documents/validate', () => {
    it('should accept valid PDF upload', async () => {
      // Create a mock PDF file
      const mockPDFBuffer = Buffer.from('%PDF-1.4\nMock PDF content');
      
      const response = await request(app)
        .post('/api/documents/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', mockPDFBuffer, 'test-document.pdf')
        .field('caseId', 'TEST001')
        .field('notes', 'Test upload')
        .expect(202);

      expect(response.body).toHaveProperty('message', 'Document uploaded successfully and validation started');
      expect(response.body).toHaveProperty('documentId');
      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should reject non-PDF files', async () => {
      const mockTextBuffer = Buffer.from('This is not a PDF file');
      
      const response = await request(app)
        .post('/api/documents/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', mockTextBuffer, 'test-document.txt')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject upload without authentication', async () => {
      const mockPDFBuffer = Buffer.from('%PDF-1.4\nMock PDF content');
      
      const response = await request(app)
        .post('/api/documents/validate')
        .attach('document', mockPDFBuffer, 'test-document.pdf')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });

    it('should enforce validation limits for free tier', async () => {
      // Update user to free tier with max validations
      await User.findByIdAndUpdate(testUser._id, {
        tier: 'free',
        validationsThisMonth: 5 // Assuming free tier limit is 5
      });

      const mockPDFBuffer = Buffer.from('%PDF-1.4\nMock PDF content');
      
      const response = await request(app)
        .post('/api/documents/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('document', mockPDFBuffer, 'test-document.pdf')
        .expect(429);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/documents/:documentId', () => {
    let testDocument;

    beforeEach(async () => {
      testDocument = new Document({
        userId: testUser._id,
        filename: 'test-doc.pdf',
        originalName: 'test-document.pdf',
        fileSize: 1024,
        filePath: '/fake/path/test.pdf',
        mimeType: 'application/pdf',
        status: 'completed',
        validationResults: {
          overall: 'pass',
          notaryValidation: { status: 'pass' },
          witnessValidation: { status: 'pass' },
          verbiageValidation: { status: 'pass' }
        }
      });
      await testDocument.save();
    });

    it('should return document details for owner', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testDocument._id.toString());
      expect(response.body).toHaveProperty('filename', 'test-document.pdf');
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('validationResults');
    });

    it('should not return document for non-owner', async () => {
      // Create another user
      const otherUser = new User({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@example.com',
        password: 'password123',
        tier: 'free',
        role: 'user'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { id: otherUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get(`/api/documents/${testDocument._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Document not found');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });
  });

  describe('GET /api/documents', () => {
    beforeEach(async () => {
      // Create multiple test documents
      const documents = [
        {
          userId: testUser._id,
          filename: 'doc1.pdf',
          originalName: 'document1.pdf',
          fileSize: 1024,
          filePath: '/fake/path/doc1.pdf',
          mimeType: 'application/pdf',
          status: 'completed'
        },
        {
          userId: testUser._id,
          filename: 'doc2.pdf',
          originalName: 'document2.pdf',
          fileSize: 2048,
          filePath: '/fake/path/doc2.pdf',
          mimeType: 'application/pdf',
          status: 'processing'
        }
      ];

      await Document.insertMany(documents);
    });

    it('should return paginated documents for user', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('documents');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.documents).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('should filter documents by status', async () => {
      const response = await request(app)
        .get('/api/documents?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0]).toHaveProperty('status', 'completed');
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/documents?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.documents).toHaveLength(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
    });
  });

  describe('GET /api/documents/:documentId/report', () => {
    let testDocument;

    beforeEach(async () => {
      testDocument = new Document({
        userId: testUser._id,
        filename: 'test-doc.pdf',
        originalName: 'test-document.pdf',
        fileSize: 1024,
        filePath: '/fake/path/test.pdf',
        mimeType: 'application/pdf',
        status: 'completed',
        validationResults: {
          overall: 'pass',
          notaryValidation: { status: 'pass' },
          witnessValidation: { status: 'pass' },
          verbiageValidation: { status: 'pass' }
        }
      });
      await testDocument.save();
    });

    it('should generate and return PDF report', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument._id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('validation-report');
    });

    it('should reject report for incomplete validation', async () => {
      const incompleteDoc = new Document({
        userId: testUser._id,
        filename: 'incomplete.pdf',
        originalName: 'incomplete-document.pdf',
        fileSize: 1024,
        filePath: '/fake/path/incomplete.pdf',
        mimeType: 'application/pdf',
        status: 'processing'
      });
      await incompleteDoc.save();

      const response = await request(app)
        .get(`/api/documents/${incompleteDoc._id}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Document validation not completed');
    });
  });
});
