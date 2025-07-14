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
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload and validate single document
router.post('/validate', [
  auth,
  checkValidationLimit,
  upload.single('document')
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

// Get user's documents with pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const caseId = req.query.caseId;

    const query = { userId: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (caseId) {
      query.caseId = caseId;
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-extractedText -filePath'); // Exclude large text and file path for security

    const total = await Document.countDocuments(query);

    const documentsWithSummary = documents.map(doc => ({
      _id: doc._id,
      filename: doc.originalName,
      status: doc.status,
      uploadedAt: doc.createdAt,
      fileSize: doc.fileSize,
      caseId: doc.caseId,
      tags: doc.tags,
      validationSummary: doc.validationSummary,
      processingTime: doc.processingTime
    }));

    res.json({
      documents: documentsWithSummary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

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

    logger.info(`Document validation completed: ${originalName}`);

    // TODO: Send notification to user if enabled
    
  } catch (error) {
    logger.error(`Document validation failed for ${originalName}:`, error);
    
    // Update document with error status
    await Document.findByIdAndUpdate(documentId, {
      status: 'failed',
      errorMessage: error.message
    });
  }
}

module.exports = router;
