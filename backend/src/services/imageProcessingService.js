const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const jimp = require('jimp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class ImageProcessingService {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.ocrCache = new Map(); // Simple in-memory cache for OCR results
  }

  /**
   * Validate if the uploaded file is a supported image format
   */
  validateImageFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!this.supportedFormats.includes(fileExtension)) {
      errors.push(`Unsupported file format. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/bmp', 'image/tiff', 'image/webp'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid MIME type: ${file.mimetype}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileInfo: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        extension: fileExtension
      }
    };
  }

  /**
   * Pre-process image for better OCR results
   */
  async preprocessImage(imageBuffer, options = {}) {
    try {
      logger.info('Starting image preprocessing');

      const {
        enhance = true,
        denoise = true,
        sharpen = true,
        autoRotate = true,
        convertToGrayscale = true,
        adjustContrast = true
      } = options;

      let processedImage = sharp(imageBuffer);

      // Get image metadata
      const metadata = await processedImage.metadata();
      logger.info(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Auto-rotate based on EXIF orientation
      if (autoRotate) {
        processedImage = processedImage.rotate();
      }

      // Convert to grayscale for better OCR
      if (convertToGrayscale) {
        processedImage = processedImage.grayscale();
      }

      // Enhance contrast
      if (adjustContrast) {
        processedImage = processedImage.normalize();
      }

      // Sharpen for better text recognition
      if (sharpen) {
        processedImage = processedImage.sharpen();
      }

      // Denoise if requested
      if (denoise) {
        processedImage = processedImage.median(3);
      }

      // Ensure minimum DPI for OCR
      processedImage = processedImage.jpeg({ quality: 95 });

      const processedBuffer = await processedImage.toBuffer();
      
      logger.info('Image preprocessing completed successfully');
      return {
        success: true,
        processedImage: processedBuffer,
        originalMetadata: metadata,
        processedSize: processedBuffer.length
      };

    } catch (error) {
      logger.error('Image preprocessing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageBuffer, options = {}) {
    try {
      const startTime = Date.now();
      logger.info('Starting OCR text extraction');

      // Check cache first
      const cacheKey = this.generateCacheKey(imageBuffer);
      if (this.ocrCache.has(cacheKey)) {
        logger.info('OCR result found in cache');
        return this.ocrCache.get(cacheKey);
      }

      const {
        language = 'eng',
        oem = 1, // LSTM OCR Engine Mode
        psm = 3, // Automatic page segmentation
        preprocessImage = true
      } = options;

      let processBuffer = imageBuffer;

      // Preprocess image if requested
      if (preprocessImage) {
        const preprocessResult = await this.preprocessImage(imageBuffer);
        if (preprocessResult.success) {
          processBuffer = preprocessResult.processedImage;
        }
      }

      // Perform OCR
      const { data } = await Tesseract.recognize(processBuffer, language, {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        tessedit_ocr_engine_mode: oem,
        tessedit_pageseg_mode: psm,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()_+-=[]{}|;:\'",.<>/? \n\t'
      });

      const processingTime = Date.now() - startTime;
      
      const result = {
        success: true,
        extractedText: data.text.trim(),
        confidence: data.confidence,
        words: data.words?.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })) || [],
        lines: data.lines?.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })) || [],
        processingTime,
        language,
        ocrEngine: 'Tesseract.js'
      };

      // Cache result
      this.ocrCache.set(cacheKey, result);
      
      // Limit cache size
      if (this.ocrCache.size > 100) {
        const firstKey = this.ocrCache.keys().next().value;
        this.ocrCache.delete(firstKey);
      }

      logger.info(`OCR completed in ${processingTime}ms with confidence ${data.confidence}%`);
      return result;

    } catch (error) {
      logger.error('OCR text extraction failed:', error);
      return {
        success: false,
        error: error.message,
        extractedText: '',
        confidence: 0
      };
    }
  }

  /**
   * Detect and extract QR codes from image
   */
  async extractQRCodes(imageBuffer) {
    try {
      logger.info('Starting QR code detection');

      // Use Jimp constructor instead of jimp.read
      const image = await Jimp.read(imageBuffer);
      
      // Convert to grayscale and enhance contrast
      image.greyscale().contrast(0.3);
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      // For now, we'll extract text and look for URL patterns
      // In a production environment, you might want to use a dedicated QR code library
      const ocrResult = await this.extractTextFromImage(processedBuffer, {
        preprocessImage: false // Already preprocessed
      });

      // Look for URL patterns that might be QR codes
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const urls = ocrResult.extractedText.match(urlRegex) || [];

      return {
        success: true,
        qrCodes: urls.map(url => ({
          type: 'url',
          data: url,
          confidence: 0.8 // Placeholder confidence
        })),
        extractedText: ocrResult.extractedText
      };

    } catch (error) {
      logger.error('QR code detection failed:', error);
      return {
        success: false,
        error: error.message,
        qrCodes: []
      };
    }
  }

  /**
   * Analyze image quality and provide recommendations
   */
  async analyzeImageQuality(imageBuffer) {
    try {
      logger.info('Analyzing image quality');

      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // Basic quality metrics
      const analysis = {
        resolution: {
          width: metadata.width,
          height: metadata.height,
          megapixels: (metadata.width * metadata.height) / 1000000,
          dpi: metadata.density || 72
        },
        colorSpace: {
          channels: metadata.channels,
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha
        },
        quality: {
          sharpness: this.calculateSharpness(stats),
          brightness: this.calculateBrightness(stats),
          contrast: this.calculateContrast(stats)
        },
        recommendations: []
      };

      // Generate recommendations
      if (analysis.resolution.dpi < 150) {
        analysis.recommendations.push('Image resolution is low. For better OCR results, scan at 300 DPI or higher.');
      }

      if (analysis.quality.sharpness < 0.3) {
        analysis.recommendations.push('Image appears blurry. Try to capture a sharper image.');
      }

      if (analysis.quality.contrast < 0.4) {
        analysis.recommendations.push('Image has low contrast. Adjust lighting or image settings.');
      }

      if (analysis.resolution.megapixels > 20) {
        analysis.recommendations.push('Image is very large. Consider reducing size for faster processing.');
      }

      analysis.overallScore = this.calculateOverallQualityScore(analysis);

      return {
        success: true,
        analysis
      };

    } catch (error) {
      logger.error('Image quality analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process scanned document image completely
   */
  async processScannedDocument(imageBuffer, options = {}) {
    try {
      const startTime = Date.now();
      logger.info('Starting complete document processing');

      // Validate image
      const validation = this.validateImageFile({
        buffer: imageBuffer,
        size: imageBuffer.length,
        mimetype: 'image/jpeg', // Default assumption
        originalname: 'scanned-document.jpg'
      });

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Parallel processing for efficiency
      const [qualityAnalysis, ocrResult, qrCodeResult] = await Promise.allSettled([
        this.analyzeImageQuality(imageBuffer),
        this.extractTextFromImage(imageBuffer, options.ocr),
        this.extractQRCodes(imageBuffer)
      ]);

      const totalProcessingTime = Date.now() - startTime;

      const result = {
        success: true,
        processingTime: totalProcessingTime,
        imageQuality: qualityAnalysis.status === 'fulfilled' ? qualityAnalysis.value : null,
        textExtraction: ocrResult.status === 'fulfilled' ? ocrResult.value : null,
        qrCodes: qrCodeResult.status === 'fulfilled' ? qrCodeResult.value : null,
        metadata: {
          processedAt: new Date().toISOString(),
          processingVersion: '1.0.0'
        }
      };

      // Check for critical failures
      if (ocrResult.status === 'rejected') {
        result.warnings = result.warnings || [];
        result.warnings.push('Text extraction failed');
      }

      logger.info(`Document processing completed in ${totalProcessingTime}ms`);
      return result;

    } catch (error) {
      logger.error('Document processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods
  generateCacheKey(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  calculateSharpness(stats) {
    // Simplified sharpness calculation based on variance
    const variance = stats.channels?.[0]?.variance || 0;
    return Math.min(variance / 10000, 1);
  }

  calculateBrightness(stats) {
    // Calculate brightness from mean values
    const mean = stats.channels?.[0]?.mean || 128;
    return mean / 255;
  }

  calculateContrast(stats) {
    // Calculate contrast from standard deviation
    const std = Math.sqrt(stats.channels?.[0]?.variance || 0);
    return Math.min(std / 128, 1);
  }

  calculateOverallQualityScore(analysis) {
    let score = 0;
    
    // Resolution score (30%)
    const resolutionScore = Math.min(analysis.resolution.dpi / 300, 1) * 0.3;
    
    // Quality metrics (70%)
    const qualityScore = (
      analysis.quality.sharpness * 0.3 +
      Math.min(analysis.quality.contrast * 2, 1) * 0.2 +
      (1 - Math.abs(analysis.quality.brightness - 0.5) * 2) * 0.2
    );

    score = resolutionScore + qualityScore;
    return Math.round(score * 100);
  }
}

module.exports = new ImageProcessingService();
