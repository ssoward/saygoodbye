#!/usr/bin/env node

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User model (simplified for this script)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  tier: { type: String, enum: ['free', 'professional', 'enterprise'], default: 'free' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  validationsThisMonth: { type: Number, default: 0 },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get tier limits method
userSchema.methods.getTierLimits = function() {
  const limits = {
    free: {
      validationsPerMonth: 5,
      batchProcessing: false,
      apiAccess: false,
      prioritySupport: false,
      advancedReports: false
    },
    professional: {
      validationsPerMonth: 100,
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      advancedReports: true
    },
    enterprise: {
      validationsPerMonth: -1, // unlimited
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      advancedReports: true
    }
  };
  return limits[this.tier] || limits.free;
};

const User = mongoose.model('User', userSchema);

async function createDemoUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cremation-poa-db');
    console.log('Connected to MongoDB');

    const demoUsers = [
      {
        email: 'user@demo.com',
        password: 'demo123',
        firstName: 'Regular',
        lastName: 'User',
        tier: 'free',
        role: 'user',
        isVerified: true,
        onboardingCompleted: true
      },
      {
        email: 'pro@demo.com',
        password: 'demo123',
        firstName: 'Professional',
        lastName: 'User',
        tier: 'professional',
        role: 'user',
        isVerified: true,
        onboardingCompleted: true
      },
      {
        email: 'admin@demo.com',
        password: 'demo123',
        firstName: 'Admin',
        lastName: 'User',
        tier: 'professional',
        role: 'admin',
        isVerified: true,
        onboardingCompleted: true
      }
    ];

    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          console.log(`User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Create new user
        const user = new User(userData);
        await user.save();
        console.log(`Created demo user: ${userData.email} (${userData.tier} ${userData.role})`);
      } catch (error) {
        console.error(`Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log('\nDemo users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Regular User: user@demo.com / demo123');
    console.log('Professional User: pro@demo.com / demo123');
    console.log('Admin User: admin@demo.com / demo123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDemoUsers();
