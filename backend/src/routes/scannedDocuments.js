const express = require('express');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const imageProcessingService = require('../services/imageProcessingService');
const Document = require('../models/Document');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  message: 'Too many uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/bmp', 'image/tiff', 'image/webp'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. Only image files are allowed.');
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  }
});

/**
 * @route POST /api/scanned-documents/upload
 * @desc Upload and process a scanned document image
 * @access Private
 */
router.post('/upload', uploadLimiter, auth, upload.single('document'), (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only image files are allowed.',
        errors: [`Invalid MIME type: ${req.file ? req.file.mimetype : 'unknown'}`]
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
}, async (req, res) => {
  try {
    logger.info(`Scanned document upload initiated by user ${req.user._id}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate image file
    const validation = imageProcessingService.validateImageFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Process the scanned document
    const processingOptions = {
      ocr: {
        language: req.body.language || 'eng',
        preprocessImage: req.body.preprocess !== 'false'
      }
    };

    const processingResult = await imageProcessingService.processScannedDocument(
      req.file.buffer,
      processingOptions
    );

    if (!processingResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process document',
        details: processingResult.error
      });
    }

    // Create document record
    const documentData = {
      userId: req.user._id,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'completed',
      source: 'scanned',
      scannedDocumentData: {
        imageQuality: processingResult.imageQuality?.analysis,
        ocrResults: {
          extractedText: processingResult.textExtraction?.extractedText || '',
          confidence: processingResult.textExtraction?.confidence || 0,
          language: processingOptions.ocr.language,
          processingTime: processingResult.textExtraction?.processingTime || 0,
          wordCount: processingResult.textExtraction?.words?.length || 0,
          lineCount: processingResult.textExtraction?.lines?.length || 0
        },
        qrCodes: processingResult.qrCodes?.qrCodes || [],
        processingMetadata: processingResult.metadata,
        recommendations: processingResult.imageQuality?.analysis?.recommendations || []
      },
      extractedText: processingResult.textExtraction?.extractedText || '',
      processingTime: processingResult.processingTime,
      caseId: req.body.caseId || null,
      notes: req.body.notes || '',
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
    };

    // Save to database
    const document = new Document(documentData);
    await document.save();

    logger.info(`Scanned document processed successfully: ${document._id}`);

    // Prepare response
    const response = {
      success: true,
      document: {
        _id: document._id,
        originalName: document.originalName,
        status: document.status,
        createdAt: document.createdAt,
        processingTime: document.processingTime,
        extractedTextLength: document.extractedText.length,
        imageQuality: {
          overallScore: processingResult.imageQuality?.analysis?.overallScore,
          recommendations: documentData.scannedDocumentData.recommendations
        },
        ocrResults: {
          confidence: documentData.scannedDocumentData.ocrResults.confidence,
          wordCount: documentData.scannedDocumentData.ocrResults.wordCount,
          lineCount: documentData.scannedDocumentData.ocrResults.lineCount
        },
        qrCodesFound: documentData.scannedDocumentData.qrCodes.length
      },
      processingDetails: {
        totalTime: processingResult.processingTime,
        imageAnalyzed: !!processingResult.imageQuality,
        textExtracted: !!processingResult.textExtraction,
        qrCodesScanned: !!processingResult.qrCodes
      }
    };

    res.status(201).json(response);

  } catch (error) {
    logger.error('Scanned document upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected field name. Use "document" for the file field.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during document processing'
    });
  }
});

/**
 * @route POST /api/scanned-documents/analyze-quality
 * @desc Analyze image quality without full processing
 * @access Private
 */
router.post('/analyze-quality', uploadLimiter, auth, upload.single('document'), (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only image files are allowed.',
        errors: [`Invalid MIME type: ${req.file ? req.file.mimetype : 'unknown'}`]
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const validation = imageProcessingService.validateImageFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const qualityResult = await imageProcessingService.analyzeImageQuality(req.file.buffer);

    if (!qualityResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze image quality'
      });
    }

    res.json({
      success: true,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      qualityAnalysis: qualityResult.analysis
    });

  } catch (error) {
    logger.error('Image quality analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during quality analysis'
    });
  }
});

/**
 * @route POST /api/scanned-documents/extract-text
 * @desc Extract text from image using OCR
 * @access Private
 */
router.post('/extract-text', uploadLimiter, auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const validation = imageProcessingService.validateImageFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    const ocrOptions = {
      language: req.body.language || 'eng',
      preprocessImage: req.body.preprocess !== 'false'
    };

    const ocrResult = await imageProcessingService.extractTextFromImage(
      req.file.buffer,
      ocrOptions
    );

    if (!ocrResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to extract text from image'
      });
    }

    res.json({
      success: true,
      fileName: req.file.originalname,
      extractedText: ocrResult.extractedText,
      confidence: ocrResult.confidence,
      wordCount: ocrResult.words?.length || 0,
      lineCount: ocrResult.lines?.length || 0,
      processingTime: ocrResult.processingTime,
      language: ocrOptions.language
    });

  } catch (error) {
    logger.error('Text extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during text extraction'
    });
  }
});

/**
 * @route GET /api/scanned-documents/:id/details
 * @desc Get detailed information about a scanned document
 * @access Private
 */
router.get('/:id/details', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
      source: 'scanned'
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Scanned document not found'
      });
    }

    const response = {
      success: true,
      document: {
        _id: document._id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        status: document.status,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        extractedText: document.extractedText,
        caseId: document.caseId,
        notes: document.notes,
        tags: document.tags,
        scannedDocumentData: document.scannedDocumentData
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Error retrieving scanned document details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/scanned-documents/supported-languages
 * @desc Get list of supported OCR languages
 * @access Public
 */
router.get('/supported-languages', (req, res) => {
  const supportedLanguages = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'chi_tra', name: 'Chinese (Traditional)' },
    { code: 'kor', name: 'Korean' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' }
  ];

  res.json({
    success: true,
    languages: supportedLanguages,
    default: 'eng'
  });
});

module.exports = router;
