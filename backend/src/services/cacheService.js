const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isEnabled = process.env.REDIS_URL || process.env.REDIS_HOST;
    this.defaultTTL = 300; // 5 minutes default
    
    if (this.isEnabled) {
      this.connect();
    }
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.client = null;
      this.isEnabled = false;
    }
  }

  async get(key) {
    if (!this.isEnabled || !this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isEnabled || !this.client) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    if (!this.isEnabled || !this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern) {
    if (!this.isEnabled || !this.client) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Document-specific caching methods
  async getDocumentList(userId, filters = {}) {
    const cacheKey = this.generateDocumentListKey(userId, filters);
    return await this.get(cacheKey);
  }

  async setDocumentList(userId, filters = {}, documents, ttl = 300) {
    const cacheKey = this.generateDocumentListKey(userId, filters);
    return await this.set(cacheKey, documents, ttl);
  }

  async invalidateUserDocuments(userId) {
    const pattern = `docs:${userId}:*`;
    return await this.deletePattern(pattern);
  }

  async getUserStats(userId) {
    const cacheKey = `stats:${userId}`;
    return await this.get(cacheKey);
  }

  async setUserStats(userId, stats, ttl = 600) {
    const cacheKey = `stats:${userId}`;
    return await this.set(cacheKey, stats, ttl);
  }

  async invalidateUserStats(userId) {
    const cacheKey = `stats:${userId}`;
    return await this.delete(cacheKey);
  }

  // Generate cache keys
  generateDocumentListKey(userId, filters) {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `docs:${userId}:list:${Buffer.from(filterString).toString('base64')}`;
  }

  // Cache warming for frequently accessed data
  async warmCache(userId) {
    try {
      const Document = require('../models/Document');
      
      // Cache recent documents
      const recentDocs = await Document.find({ userId })
        .select('_id originalName status createdAt fileSize')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      
      await this.setDocumentList(userId, { recent: true }, recentDocs, 600);
      
      // Cache user stats
      const stats = await this.calculateUserStats(userId);
      await this.setUserStats(userId, stats, 600);
      
      logger.info(`Cache warmed for user ${userId}`);
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }

  async calculateUserStats(userId) {
    const Document = require('../models/Document');
    
    const pipeline = [
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      {
        $facet: {
          totalDocs: [{ $count: "count" }],
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byResults: [
            { $match: { status: "completed" } },
            { $group: { _id: "$validationResults.overall", count: { $sum: 1 } } }
          ],
          recentActivity: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            { $project: { originalName: 1, status: 1, createdAt: 1 } }
          ]
        }
      }
    ];

    const result = await Document.aggregate(pipeline);
    return result[0];
  }

  // Middleware for automatic caching
  cacheMiddleware(keyGenerator, ttl = 300) {
    return async (req, res, next) => {
      if (!this.isEnabled) return next();
      
      const cacheKey = keyGenerator(req);
      const cached = await this.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          cacheService.set(cacheKey, data, ttl);
        }
        return originalJson.call(this, data);
      };
      
      next();
    };
  }

  // Health check
  async healthCheck() {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }
    
    try {
      await this.client.ping();
      return { status: 'healthy', enabled: true };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, enabled: true };
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
