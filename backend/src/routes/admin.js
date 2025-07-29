const express = require('express');
const { auth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth);
router.use(requireAdmin);

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const tier = req.query.tier;

    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tier) {
      query.tier = tier;
    }

    const users = await User.find(query)
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({
      error: 'Server error fetching users'
    });
  }
});

// Get user by ID
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Get user's document statistics
    const documentStats = await Document.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {};
    documentStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });

    res.json({
      user,
      documentStats: stats
    });

  } catch (error) {
    logger.error('Admin get user error:', error);
    res.status(500).json({
      error: 'Server error fetching user'
    });
  }
});

// Update user tier
router.put('/users/:userId/tier', async (req, res) => {
  try {
    const { tier } = req.body;
    
    if (!['free', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier specified'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { tier },
      { new: true }
    ).select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info(`Admin ${req.user.email} updated user ${user.email} tier to ${tier}`);

    res.json({
      message: 'User tier updated successfully',
      user
    });

  } catch (error) {
    logger.error('Admin update user tier error:', error);
    res.status(500).json({
      error: 'Server error updating user tier'
    });
  }
});

// Suspend/unsuspend user (we'll add an active field to user model)
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        error: 'Active status must be boolean'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { active },
      { new: true }
    ).select('-password -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info(`Admin ${req.user.email} ${active ? 'activated' : 'suspended'} user ${user.email}`);

    res.json({
      message: `User ${active ? 'activated' : 'suspended'} successfully`,
      user
    });

  } catch (error) {
    logger.error('Admin update user status error:', error);
    res.status(500).json({
      error: 'Server error updating user status'
    });
  }
});

// Get system analytics
router.get('/analytics', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    const usersByTier = await User.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 }
        }
      }
    ]);

    // Document statistics
    const totalDocuments = await Document.countDocuments();
    const documentsInPeriod = await Document.countDocuments({
      createdAt: { $gte: startDate }
    });

    const documentsByStatus = await Document.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const validationResults = await Document.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$validationResults.overall',
          count: { $sum: 1 }
        }
      }
    ]);

    // Daily document uploads for the period
    const dailyUploads = await Document.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const analytics = {
      users: {
        total: totalUsers,
        new: newUsers,
        byTier: {}
      },
      documents: {
        total: totalDocuments,
        inPeriod: documentsInPeriod,
        byStatus: {},
        dailyUploads
      },
      validations: {
        results: {}
      }
    };

    // Format user tier data
    usersByTier.forEach(tier => {
      analytics.users.byTier[tier._id] = tier.count;
    });

    // Format document status data
    documentsByStatus.forEach(status => {
      analytics.documents.byStatus[status._id] = status.count;
    });

    // Format validation results
    validationResults.forEach(result => {
      analytics.validations.results[result._id || 'unknown'] = result.count;
    });

    res.json(analytics);

  } catch (error) {
    logger.error('Admin analytics error:', error);
    res.status(500).json({
      error: 'Server error fetching analytics'
    });
  }
});

// Get system logs (last 100 entries)
router.get('/logs', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const logFile = path.join(__dirname, '../../logs/combined.log');
    
    try {
      const logData = await fs.readFile(logFile, 'utf8');
      const logs = logData.split('\n')
        .filter(line => line.trim())
        .slice(-100) // Last 100 entries
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date() };
          }
        })
        .reverse(); // Most recent first

      res.json({ logs });
    } catch (fileError) {
      res.json({ logs: [], message: 'No log file found' });
    }

  } catch (error) {
    logger.error('Admin logs error:', error);
    res.status(500).json({
      error: 'Server error fetching logs'
    });
  }
});

// Get admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalDocuments,
      activeSubscriptions,
      recentDocuments,
      usersByTier,
      documentsByStatus
    ] = await Promise.all([
      User.countDocuments(),
      Document.countDocuments(),
      User.countDocuments({ tier: { $ne: 'free' } }),
      Document.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      User.aggregate([
        { $group: { _id: '$tier', count: { $sum: 1 } } },
        { $project: { tier: '$_id', count: 1, _id: 0 } }
      ]),
      Document.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } }
      ])
    ]);

    // Convert aggregation results to objects
    const tiers = {};
    usersByTier.forEach(item => {
      tiers[item.tier || 'free'] = item.count;
    });

    const validationResults = {};
    documentsByStatus.forEach(item => {
      validationResults[item.status || 'unknown'] = item.count;
    });

    const stats = {
      users: {
        total: totalUsers
      },
      documents: {
        total: totalDocuments
      },
      revenue: {
        total: activeSubscriptions * 29 // Rough estimate for demo
      },
      validations: {
        total: totalDocuments,
        successRate: totalDocuments > 0 ? Math.round((validationResults.completed || 0) / totalDocuments * 100) : 0
      },
      tiers,
      validationResults
    };

    res.json(stats);

  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({
      error: 'Error fetching admin stats'
    });
  }
});

// Get recent users
router.get('/recent-users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const users = await User.find()
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ users });

  } catch (error) {
    logger.error('Admin recent users error:', error);
    res.status(500).json({
      error: 'Error fetching recent users'
    });
  }
});

// Get recent documents
router.get('/recent-documents', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const documents = await Document.find()
      .populate('userId', 'firstName lastName email')
      .select('originalName status validationResults.overall createdAt processingTime')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ documents });

  } catch (error) {
    logger.error('Admin recent documents error:', error);
    res.status(500).json({
      error: 'Error fetching recent documents'
    });
  }
});

module.exports = router;
