const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const { auth, checkValidationLimit } = require('../src/middleware/auth');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');

describe('Middleware Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    await setupTestDB();
    
    app = express();
    app.use(express.json());
    
    // Test routes
    app.get('/protected', auth, (req, res) => {
      res.json({ user: req.user.email });
    });
    
    app.post('/validate-limit', auth, checkValidationLimit, (req, res) => {
      res.json({ message: 'validation allowed' });
    });
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
      tier: 'free',
      role: 'user',
      validationsThisMonth: 0
    });
    await testUser.save();
  });

  describe('Auth Middleware', () => {
    it('should allow access with valid token', async () => {
      const token = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toBe('test@example.com');
    });

    it('should reject access without token', async () => {
      await request(app)
        .get('/protected')
        .expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject access with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Validation Limit Middleware', () => {
    it('should allow validation for free user under limit', async () => {
      testUser.validationsThisMonth = 3;
      await testUser.save();

      const token = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .post('/validate-limit')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should reject validation for free user at limit', async () => {
      testUser.validationsThisMonth = 5;
      await testUser.save();

      const token = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/validate-limit')
        .set('Authorization', `Bearer ${token}`)
        .expect(429);

      expect(response.body.error).toContain('Validation limit exceeded');
    });

    it('should allow validation for professional user', async () => {
      testUser.tier = 'professional';
      testUser.validationsThisMonth = 100;
      await testUser.save();

      const token = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .post('/validate-limit')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should allow validation for admin user', async () => {
      testUser.role = 'admin';
      testUser.validationsThisMonth = 100;
      await testUser.save();

      const token = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .post('/validate-limit')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
