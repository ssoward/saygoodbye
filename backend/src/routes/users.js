const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Get user profile (already handled in auth routes, but keeping for consistency)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    const limits = user.getTierLimits();

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organization: user.organization,
        phone: user.phone,
        tier: user.tier,
        role: user.role,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboardingCompleted,
        twoFactorEnabled: user.twoFactorEnabled,
        validationsThisMonth: user.validationsThisMonth,
        preferences: user.preferences,
        tierLimits: limits,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Server error fetching profile'
    });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = req.user;
    const { emailNotifications, smsNotifications } = req.body;

    const preferences = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : user.preferences.emailNotifications,
      smsNotifications: smsNotifications !== undefined ? smsNotifications : user.preferences.smsNotifications
    };

    await User.findByIdAndUpdate(user._id, { preferences });

    logger.info(`User preferences updated: ${user.email}`);

    res.json({
      message: 'Preferences updated successfully',
      preferences
    });

  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Server error updating preferences'
    });
  }
});

// Get user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const Document = require('../models/Document');

    // Get document statistics
    const totalDocuments = await Document.countDocuments({ userId });
    const completedDocuments = await Document.countDocuments({ userId, status: 'completed' });
    const failedDocuments = await Document.countDocuments({ userId, status: 'failed' });
    const processingDocuments = await Document.countDocuments({ userId, status: 'processing' });

    // Get validation results breakdown
    const validationStats = await Document.aggregate([
      { $match: { userId: userId, status: 'completed' } },
      {
        $group: {
          _id: '$validationResults.overall',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      documents: {
        total: totalDocuments,
        completed: completedDocuments,
        failed: failedDocuments,
        processing: processingDocuments
      },
      validations: {
        thisMonth: req.user.validationsThisMonth,
        limit: req.user.getTierLimits().validationsPerMonth
      },
      results: {}
    };

    // Format validation results
    validationStats.forEach(stat => {
      stats.results[stat._id || 'unknown'] = stat.count;
    });

    res.json(stats);

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Server error fetching statistics'
    });
  }
});

module.exports = router;
