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

const User = mongoose.model('User', userSchema);

async function updateDemoPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/cremation-poa-db');
    console.log('Connected to MongoDB');

    const demoEmails = ['user@demo.com', 'pro@demo.com', 'admin@demo.com'];
    const newPassword = 'demo1234'; // 8 characters to meet validation

    for (const email of demoEmails) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          // Hash the new password
          const hashedPassword = await bcrypt.hash(newPassword, 12);
          
          // Update password directly in database to avoid pre-save hook
          await User.updateOne({ email }, { password: hashedPassword });
          console.log(`Updated password for ${email}`);
        } else {
          console.log(`User ${email} not found`);
        }
      } catch (error) {
        console.error(`Error updating ${email}:`, error.message);
      }
    }

    console.log('\nDemo user passwords updated successfully!');
    console.log('\nNew login credentials:');
    console.log('Regular User: user@demo.com / demo1234');
    console.log('Professional User: pro@demo.com / demo1234');
    console.log('Admin User: admin@demo.com / demo1234');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateDemoPasswords();
