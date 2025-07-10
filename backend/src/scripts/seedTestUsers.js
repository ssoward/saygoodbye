const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const testUsers = [
  {
    firstName: 'Test',
    lastName: 'User',
    email: 'user@test.com',
    password: 'password123',
    tier: 'free',
    role: 'user',
    subscriptionStatus: 'active',
    tierLimits: {
      validationsPerMonth: 5,
      batchProcessing: false,
      prioritySupport: false,
      customReports: false,
      apiAccess: false
    }
  },
  {
    firstName: 'Professional',
    lastName: 'User',
    email: 'pro@test.com',
    password: 'password123',
    tier: 'professional',
    role: 'user',
    subscriptionStatus: 'active',
    tierLimits: {
      validationsPerMonth: -1, // unlimited
      batchProcessing: true,
      prioritySupport: true,
      customReports: true,
      apiAccess: false
    }
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    password: 'password123',
    tier: 'enterprise',
    role: 'admin',
    subscriptionStatus: 'active',
    tierLimits: {
      validationsPerMonth: -1, // unlimited
      batchProcessing: true,
      prioritySupport: true,
      customReports: true,
      apiAccess: true
    }
  }
];

async function seedTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cremation-poa-db');
    console.log('Connected to MongoDB');

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists`);
        continue;
      }

      // Create user with plain password (will be hashed by pre-save hook)
      const user = new User({
        ...userData,
        emailVerified: true, // Skip email verification for test users
        status: 'active'
      });

      await user.save();
      console.log(`Created test user: ${userData.email} (${userData.role})`);
    }

    console.log('Test users seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test users:', error);
    process.exit(1);
  }
}

seedTestUsers();
