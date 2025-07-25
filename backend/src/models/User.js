const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        // Basic email validation regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  tier: {
    type: String,
    enum: ['free', 'professional', 'enterprise'],
    default: 'free'
  },
  organization: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  stripeCustomerId: {
    type: String
  },
  stripeSubscriptionId: {
    type: String
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', null],
    default: null
  },
  subscriptionStartDate: {
    type: Date
  },
  lastPaymentDate: {
    type: Date
  },
  validationsUsedThisMonth: {
    type: Number,
    default: 0
  },
  validationsThisMonth: {
    type: Number,
    default: 0
  },
  lastValidationReset: {
    type: Date,
    default: Date.now
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user can validate documents based on tier limits
userSchema.methods.canValidate = function() {
  // Admin users always have unlimited validations
  if (this.role === 'admin') {
    return true;
  }
  
  if (this.tier === 'free') {
    // Reset counter if it's a new month
    const now = new Date();
    const lastReset = new Date(this.lastValidationReset);
    
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      this.validationsThisMonth = 0;
      this.lastValidationReset = now;
      this.save();
    }
    
    return this.validationsThisMonth < 5;
  }
  
  return true; // Professional and Enterprise have unlimited validations
};

// Increment validation count
userSchema.methods.incrementValidations = function() {
  this.validationsThisMonth += 1;
  // Use validateBeforeSave: false to avoid triggering full document validation
  // This prevents validation errors in other fields from blocking the increment
  return this.save({ validateBeforeSave: false });
};

// Reset validation count (for monthly resets)
userSchema.methods.resetValidations = function() {
  this.validationsThisMonth = 0;
  this.lastValidationReset = new Date();
  return this.save({ validateBeforeSave: false });
};

// Get tier limits
userSchema.methods.getTierLimits = function() {
  // Admin users get unlimited access to everything regardless of tier
  if (this.role === 'admin') {
    return {
      validationsPerMonth: -1, // unlimited
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      advancedReports: true,
      adminPanel: true,
      caseIntegration: true,
      adminPrivileges: true // special flag for admin users
    };
  }
  
  const limits = {
    free: {
      validationsPerMonth: 5,
      batchProcessing: false,
      apiAccess: false,
      prioritySupport: false,
      advancedReports: false
    },
    professional: {
      validationsPerMonth: -1, // unlimited
      batchProcessing: true,
      apiAccess: false,
      prioritySupport: true,
      advancedReports: true
    },
    enterprise: {
      validationsPerMonth: -1, // unlimited
      batchProcessing: true,
      apiAccess: true,
      prioritySupport: true,
      advancedReports: true,
      adminPanel: true,
      caseIntegration: true
    }
  };
  
  return limits[this.tier];
};

// Reset validation count
userSchema.methods.resetValidations = function() {
  this.validationsThisMonth = 0;
  this.lastValidationReset = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
