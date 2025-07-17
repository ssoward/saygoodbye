const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, param } = require('express-validator');
const mongoose = require('mongoose');

const Document = require('../models/Document');
const { auth, checkValidationLimit, requireTier } = require('../middleware/auth');
const documentValidationService = require('../services/documentValidation');
const reportService = require('../services/reportGeneration');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files and images (JPG, PNG, GIF, BMP, TIFF, WebP) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Multer error handler middleware
const multerErrorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === 'Only PDF files are allowed') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  next(error);
};

// Upload and validate single document
router.post('/validate', [
  auth,
  checkValidationLimit,
  upload.single('document'),
  multerErrorHandler
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded or invalid file type'
      });
    }

    const { caseId, notes, tags } = req.body;

    // Create document record
    const document = new Document({
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      caseId: caseId || null,
      notes: notes || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      status: 'processing'
    });

    await document.save();

    // Invalidate user's document cache
    await cacheService.invalidateUserDocuments(req.user._id);

    // Start validation process (async)
    processDocumentValidation(document._id, req.file.path, req.file.originalname, req.user._id);

    logger.info(`Document uploaded for validation: ${req.file.originalname} by user ${req.user.email}`);

    res.status(202).json({
      message: 'Document uploaded successfully and validation started',
      documentId: document._id,
      status: 'processing'
    });

  } catch (error) {
    logger.error('Document upload error:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Error cleaning up uploaded file:', unlinkError);
      }
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size too large. Maximum size is 10MB.'
      });
    }

    res.status(500).json({
      error: 'Error uploading document'
    });
  }
});

// Batch upload and validate documents (Professional/Enterprise only)
router.post('/batch-validate', [
  auth,
  requireTier('professional'),
  upload.array('documents', 50)
], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded'
      });
    }

    const { caseId, notes } = req.body;
    const documentIds = [];

    // Create document records for all files
    for (const file of req.files) {
      const document = new Document({
        userId: req.user._id,
        filename: file.filename,
        originalName: file.originalname,
        fileSize: file.size,
        filePath: file.path,
        mimeType: file.mimetype,
        caseId: caseId || null,
        notes: notes || '',
        status: 'processing'
      });

      await document.save();
      documentIds.push(document._id);

      // Start validation process for each document
      processDocumentValidation(document._id, file.path, file.originalname, req.user._id);
    }

    logger.info(`Batch upload: ${req.files.length} documents by user ${req.user.email}`);

    res.status(202).json({
      message: `${req.files.length} documents uploaded successfully and validation started`,
      documentIds,
      status: 'processing'
    });

  } catch (error) {
    logger.error('Batch upload error:', error);

    // Clean up uploaded files if error occurs
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error('Error cleaning up uploaded file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      error: 'Error uploading documents'
    });
  }
});

// Get document validation status and results
router.get('/:documentId', 
  [
    param('documentId')
      .notEmpty()
      .withMessage('Document ID is required')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid document ID format');
        }
        return true;
      })
  ],
  auth, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid document ID',
          details: errors.array()
        });
      }

      const document = await Document.findOne({
        _id: req.params.documentId,
        userId: req.user._id
      });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    const response = {
      id: document._id,
      filename: document.originalName,
      status: document.status,
      uploadedAt: document.createdAt,
      fileSize: document.fileSize
    };

    if (document.status === 'completed') {
      response.validationResults = document.validationResults;
      response.validationSummary = document.validationSummary;
      response.processingTime = document.processingTime;
    } else if (document.status === 'failed') {
      response.errorMessage = document.errorMessage;
    }

    res.json(response);

  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({
      error: 'Error retrieving document'
    });
  }
});

// Get user's documents with enhanced pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, // Increased default for better performance
      cursor, 
      search, 
      status, 
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      validationResult
    } = req.query;

    const filters = { search, status, tags, sortBy, sortOrder, validationResult };
    
    // Try to get from cache first
    const cacheKey = `docs:${req.user._id}:${cursor || page}:${JSON.stringify(filters)}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return res.json({
        ...cached,
        fromCache: true,
        performance: {
          queryTime: '0ms (cached)',
          cacheHit: true
        }
      });
    }

    const startTime = Date.now();
    const query = { userId: req.user._id };
    
    // Enhanced filtering
    if (status && status !== 'all') query.status = status;
    if (tags) query.tags = { $in: tags.split(',') };
    if (validationResult && validationResult !== 'all') {
      query['validationResults.overall'] = validationResult;
    }
    
    // Full-text search across multiple fields
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { caseId: { $regex: search, $options: 'i' } }
      ];
    }

    // Cursor-based pagination for better performance with large datasets
    if (cursor) {
      const cursorDate = new Date(cursor);
      query.createdAt = sortOrder === 'desc' 
        ? { $lt: cursorDate }
        : { $gt: cursorDate };
    }

    // Optimized query with lean() for better performance
    const documents = await Document.find(query)
      .select('_id originalName status createdAt fileSize caseId validationResults.overall tags processingTime notes')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .lean(); // Use lean() for 40-60% performance improvement

    // Get total count only when needed (not for cursor-based pagination)
    const total = cursor ? null : await Document.countDocuments({ userId: req.user._id });

    // Calculate next cursor for infinite scroll
    const nextCursor = documents.length === parseInt(limit) && documents.length > 0
      ? documents[documents.length - 1].createdAt.toISOString()
      : null;

    // Optimized response mapping
    const documentsWithSummary = documents.map(doc => ({
      _id: doc._id,
      filename: doc.originalName,
      status: doc.status,
      uploadedAt: doc.createdAt,
      fileSize: doc.fileSize,
      caseId: doc.caseId,
      tags: doc.tags || [],
      validationResult: doc.validationResults?.overall,
      processingTime: doc.processingTime,
      notes: doc.notes
    }));

    const response = {
      documents: documentsWithSummary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: total ? Math.ceil(total / limit) : null,
        hasMore: !!nextCursor,
        nextCursor
      },
      performance: {
        queryTime: `${Date.now() - startTime}ms`,
        resultCount: documents.length,
        cacheHit: false
      }
    };

    // Cache the response for 5 minutes
    await cacheService.set(cacheKey, response, 300);

    res.json(response);

  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({
      error: 'Error retrieving documents'
    });
  }
});

// Generate validation report
router.get('/:documentId/report', 
  [
    param('documentId')
      .notEmpty()
      .withMessage('Document ID is required')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid document ID format');
        }
        return true;
      })
  ],
  auth, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid document ID',
          details: errors.array()
        });
      }

      const document = await Document.findOne({
        _id: req.params.documentId,
        userId: req.user._id
      });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    if (document.status !== 'completed') {
      return res.status(400).json({
        error: 'Document validation not completed'
      });
    }

    // Generate PDF report
    const reportBuffer = await reportService.generateValidationReport(document);
    
    // Update document with report generation status
    if (!document.reportGenerated) {
      document.reportGenerated = true;
      await document.save();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="validation-report-${document.originalName}.pdf"`);
    res.send(reportBuffer);

  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({
      error: 'Error generating report'
    });
  }
});

// Download original document file
router.get('/:documentId/download', 
  [
    param('documentId')
      .notEmpty()
      .withMessage('Document ID is required')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid document ID format');
        }
        return true;
      })
  ],
  auth, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid document ID',
          details: errors.array()
        });
      }

      const document = await Document.findOne({
        _id: req.params.documentId,
        userId: req.user._id
      });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        error: 'Document file not found on server'
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', document.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    
    // Send file
    res.sendFile(path.resolve(document.filePath));

    logger.info(`Document downloaded: ${document.originalName} by user ${req.user.email}`);

  } catch (error) {
    logger.error('Download document error:', error);
    res.status(500).json({
      error: 'Error downloading document'
    });
  }
});

// Delete document
router.delete('/:documentId', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      logger.warn('Error deleting file from filesystem:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await Document.findByIdAndDelete(document._id);

    // Invalidate user's document cache
    await cacheService.invalidateUserDocuments(req.user._id);

    logger.info(`Document deleted: ${document.originalName} by user ${req.user.email}`);

    res.json({
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      error: 'Error deleting document'
    });
  }
});

// Bulk document operations for better scalability
router.post('/bulk-action', auth, async (req, res) => {
  try {
    const { action, documentIds, ...params } = req.body;
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid document IDs. Must be a non-empty array.' 
      });
    }

    // Validate all document IDs belong to the user
    const validDocuments = await Document.find({
      _id: { $in: documentIds },
      userId: req.user._id
    }).select('_id filePath originalName');

    if (validDocuments.length !== documentIds.length) {
      return res.status(403).json({ 
        error: 'Some documents not found or access denied' 
      });
    }

    let result;
    const startTime = Date.now();

    switch (action) {
      case 'delete':
        // Delete files from filesystem first
        for (const doc of validDocuments) {
          try {
            if (doc.filePath) {
              await fs.unlink(doc.filePath);
            }
          } catch (fileError) {
            logger.warn(`Error deleting file ${doc.filePath}:`, fileError);
          }
        }
        
        // Delete from database
        result = await Document.deleteMany({
          _id: { $in: documentIds },
          userId: req.user._id
        });
        
        logger.info(`Bulk delete: ${result.deletedCount} documents by user ${req.user.email}`);
        
        // Invalidate user's document cache
        await cacheService.invalidateUserDocuments(req.user._id);
        break;
      
      case 'updateTags':
        const { tags = [], addTags = true } = params;
        
        if (!Array.isArray(tags)) {
          return res.status(400).json({ error: 'Tags must be an array' });
        }
        
        const updateOperation = addTags 
          ? { $addToSet: { tags: { $each: tags } } }
          : { $set: { tags } };
          
        result = await Document.updateMany(
          { _id: { $in: documentIds }, userId: req.user._id },
          updateOperation
        );
        
        logger.info(`Bulk tag update: ${result.modifiedCount} documents by user ${req.user.email}`);
        break;
      
      case 'updateStatus':
        const { status } = params;
        
        if (!['processing', 'completed', 'failed'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }
        
        result = await Document.updateMany(
          { _id: { $in: documentIds }, userId: req.user._id },
          { $set: { status, updatedAt: new Date() } }
        );
        
        logger.info(`Bulk status update: ${result.modifiedCount} documents to ${status} by user ${req.user.email}`);
        break;
      
      case 'exportData':
        // Generate export data for selected documents
        const exportDocs = await Document.find({
          _id: { $in: documentIds },
          userId: req.user._id
        }).select('-extractedText -filePath').lean();
        
        result = {
          exportData: exportDocs,
          exportDate: new Date().toISOString(),
          totalDocuments: exportDocs.length
        };
        
        logger.info(`Bulk export: ${exportDocs.length} documents by user ${req.user.email}`);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const processingTime = Date.now() - startTime;

    res.json({ 
      success: true, 
      action,
      documentsProcessed: documentIds.length,
      result,
      performance: {
        processingTime: `${processingTime}ms`,
        documentsPerSecond: Math.round((documentIds.length / processingTime) * 1000)
      }
    });

  } catch (error) {
    logger.error('Bulk action error:', error);
    res.status(500).json({ 
      error: 'Bulk action failed',
      details: error.message 
    });
  }
});

// Async function to process document validation
async function processDocumentValidation(documentId, filePath, originalName, userId) {
  try {
    const User = require('../models/User');
    
    // Perform validation
    const validationResults = await documentValidationService.validateDocument(filePath, originalName);
    
    // Calculate overall status based on individual validation results
    const calculateOverallStatus = (results) => {
      const checks = [
        results.notaryValidation?.status,
        results.witnessValidation?.status,
        results.verbiageValidation?.status
      ];
      
      if (checks.includes('fail')) return 'fail';
      if (checks.includes('warning')) return 'warning';
      if (checks.every(status => status === 'pass')) return 'pass';
      return 'warning'; // default for any unhandled cases
    };
    
    validationResults.overall = calculateOverallStatus(validationResults);
    
    // Update document with results
    await Document.findByIdAndUpdate(documentId, {
      status: 'completed',
      validationResults,
      extractedText: validationResults.extractedText,
      ocrConfidence: validationResults.ocrConfidence,
      processingTime: validationResults.processingTime
    });

    // Increment user's validation count
    const user = await User.findById(userId);
    if (user) {
      await user.incrementValidations();
    }

    // Invalidate user's document cache when validation completes
    await cacheService.invalidateUserDocuments(userId);

    logger.info(`Document validation completed: ${originalName}`);

    // TODO: Send notification to user if enabled
    
  } catch (error) {
    logger.error(`Document validation failed for ${originalName}:`, error);
    
    // Update document with error status
    await Document.findByIdAndUpdate(documentId, {
      status: 'failed',
      errorMessage: error.message
    });
    
    // Invalidate user's document cache when validation fails
    await cacheService.invalidateUserDocuments(userId);
  }
}

module.exports = router;
