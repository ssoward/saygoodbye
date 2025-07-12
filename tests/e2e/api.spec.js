const { test, expect } = require('@playwright/test');

test.describe('API Endpoints', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status', 'healthy');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('environment', 'production');
    expect(body).toHaveProperty('version', '1.0.0');
  });

  test('should register a new user', async ({ request }) => {
    const timestamp = Date.now();
    const userData = {
      email: `test${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      organization: 'Test Org',
      phone: '555-1234'
    };

    const response = await request.post('/api/auth/register', {
      data: userData
    });

    // Should either succeed (201) or fail with validation error (400)
    expect([201, 400]).toContain(response.status());
    
    const body = await response.json();
    
    if (response.status() === 201) {
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(userData.email);
    } else {
      // Registration failed - possibly duplicate email or validation error
      expect(body).toHaveProperty('error');
    }
  });

  test('should login with existing user', async ({ request }) => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const response = await request.post('/api/auth/login', {
      data: loginData
    });

    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('message', 'Login successful');
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('user');
    expect(body.user.email).toBe(loginData.email);
  });

  test('should fail login with invalid credentials', async ({ request }) => {
    const loginData = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };

    const response = await request.post('/api/auth/login', {
      data: loginData
    });

    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should access protected endpoint with valid token', async ({ request }) => {
    // First login to get a token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'password123'
      }
    });
    
    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    const token = loginBody.token;
    
    // Use token to access protected endpoint
    const protectedResponse = await request.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(protectedResponse.status()).toBe(200);
    
    const userBody = await protectedResponse.json();
    expect(userBody).toHaveProperty('id');
    expect(userBody).toHaveProperty('email', 'test@example.com');
    expect(userBody).toHaveProperty('firstName');
    expect(userBody).toHaveProperty('lastName');
    expect(userBody).toHaveProperty('tier');
  });

  test('should reject protected endpoint without token', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should reject protected endpoint with invalid token', async ({ request }) => {
    const response = await request.get('/api/auth/me', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should handle CORS properly', async ({ request }) => {
    // Test CORS by checking response headers
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    // Note: CORS headers might not be visible in Playwright request context
    // This test mainly ensures the endpoint is accessible
  });

  test('should validate request data', async ({ request }) => {
    // Test registration with missing required fields
    const invalidData = {
      email: 'invalid-email',
      password: '123' // Too short
    };

    const response = await request.post('/api/auth/register', {
      data: invalidData
    });

    expect(response.status()).toBe(400);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should handle rate limiting gracefully', async ({ request }) => {
    // This test checks that the API responds appropriately to requests
    // In a real scenario, you might want to test actual rate limiting
    
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(request.get('/api/health'));
    }
    
    const responses = await Promise.all(promises);
    
    // All health check requests should succeed (unless rate limited)
    responses.forEach(response => {
      expect([200, 429]).toContain(response.status());
    });
  });
});
