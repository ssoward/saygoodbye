const User = require('../src/models/User');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');

describe('User Model', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'free',
        role: 'user'
      };

      const user = new User(userData);
      await user.save();

      expect(user._id).toBeDefined();
      expect(user.email).toBe('john.doe@test.com');
      expect(user.password).not.toBe('password123'); // Should be hashed
      expect(user.tier).toBe('free');
      expect(user.role).toBe('user');
      expect(user.validationsThisMonth).toBe(0);
    });

    it('should not create user with invalid email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'password123',
        tier: 'free'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should not create user with duplicate email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'free'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Password Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'free'
      });
      await user.save();
    });

    it('should compare password correctly', async () => {
      const isValid = await user.comparePassword('password123');
      expect(isValid).toBe(true);

      const isInvalid = await user.comparePassword('wrongpassword');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Tier Limits', () => {
    it('should return correct limits for free tier', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'free'
      });

      const limits = user.getTierLimits();
      expect(limits.validationsPerMonth).toBe(5);
      expect(limits.batchProcessing).toBe(false);
      expect(limits.apiAccess).toBe(false);
    });

    it('should return correct limits for professional tier', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'professional'
      });

      const limits = user.getTierLimits();
      expect(limits.validationsPerMonth).toBe(-1); // unlimited
      expect(limits.batchProcessing).toBe(true);
      expect(limits.apiAccess).toBe(false); // Professional tier doesn't have API access
    });

    it('should return unlimited access for admin users', async () => {
      const user = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: 'password123',
        tier: 'enterprise',
        role: 'admin'
      });

      const limits = user.getTierLimits();
      expect(limits.validationsPerMonth).toBe(-1); // unlimited
      expect(limits.adminPrivileges).toBe(true);
      expect(limits.batchProcessing).toBe(true);
      expect(limits.apiAccess).toBe(true);
    });
  });

  describe('Validation Count Management', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'free',
        validationsThisMonth: 0
      });
      await user.save();
    });

    it('should increment validation count', async () => {
      expect(user.validationsThisMonth).toBe(0);
      
      await user.incrementValidations();
      // Refresh the user object from database
      const updatedUser = await User.findById(user._id);
      
      expect(updatedUser.validationsThisMonth).toBe(1);
    });

    it('should check if user can validate (within limits)', async () => {
      user.validationsThisMonth = 3;
      expect(user.canValidate()).toBe(true);
    });

    it('should check if user cannot validate (at limit)', async () => {
      user.validationsThisMonth = 5;
      expect(user.canValidate()).toBe(false);
    });

    it('should allow unlimited validations for professional users', async () => {
      user.tier = 'professional';
      user.validationsThisMonth = 100;
      expect(user.canValidate()).toBe(true);
    });

    it('should allow unlimited validations for admin users', async () => {
      user.role = 'admin';
      user.validationsThisMonth = 100;
      expect(user.canValidate()).toBe(true);
    });
  });

  describe('Reset Validations', () => {
    it('should reset monthly validation count', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        password: 'password123',
        tier: 'free',
        validationsThisMonth: 5
      });
      await user.save();

      await user.resetValidations();
      expect(user.validationsThisMonth).toBe(0);
    });
  });
});
