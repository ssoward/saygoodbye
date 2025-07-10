const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Server error during authentication.' 
    });
  }
};

const requireTier = (requiredTier) => {
  const tierHierarchy = { free: 0, professional: 1, enterprise: 2 };
  
  return (req, res, next) => {
    const userTier = req.user.tier;
    const userTierLevel = tierHierarchy[userTier];
    const requiredTierLevel = tierHierarchy[requiredTier];
    
    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({
        error: `This feature requires ${requiredTier} tier or higher.`,
        currentTier: userTier,
        requiredTier: requiredTier
      });
    }
    
    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

const checkValidationLimit = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user.canValidate()) {
      const limits = user.getTierLimits();
      return res.status(429).json({
        error: 'Validation limit exceeded for your tier.',
        currentTier: user.tier,
        limit: limits.validationsPerMonth,
        used: user.validationsThisMonth,
        upgradeRequired: true
      });
    }
    
    next();
  } catch (error) {
    logger.error('Validation limit check error:', error);
    res.status(500).json({ 
      error: 'Error checking validation limits.' 
    });
  }
};

module.exports = {
  auth,
  requireTier,
  requireAdmin,
  checkValidationLimit
};
