const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const natural = require('natural');
const axios = require('axios');
const logger = require('../utils/logger');

class DocumentValidationService {
  constructor() {
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    
    // California Probate Code requirements
    this.requiredPhrases = [
      'power of attorney',
      'cremation',
      'disposition of remains',
      'authorize',
      'durable power of attorney'
    ];
    
    this.prohibitedWitnesses = [
      'agent',
      'attorney-in-fact',
      'spouse',
      'heir',
      'beneficiary'
    ];
  }

  async validateDocument(filePath, filename) {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting validation for document: ${filename}`);
      
      // Extract text from PDF
      const { text, confidence } = await this.extractTextFromPDF(filePath);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }
      
      // Perform validations
      const notaryValidation = await this.validateNotary(text);
      const witnessValidation = await this.validateWitnesses(text);
      const verbiageValidation = await this.validateVerbiage(text);
      const additionalChecks = await this.performAdditionalChecks(text);
      
      const processingTime = Date.now() - startTime;
      
      const results = {
        notaryValidation,
        witnessValidation,
        verbiageValidation,
        additionalChecks,
        extractedText: text,
        ocrConfidence: confidence,
        processingTime
      };
      
      logger.info(`Document validation completed in ${processingTime}ms for: ${filename}`);
      
      return results;
      
    } catch (error) {
      logger.error(`Validation error for ${filename}:`, error);
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      
      // Try PDF parsing first
      try {
        const pdfData = await pdfParse(dataBuffer);
        if (pdfData.text && pdfData.text.trim().length > 100) {
          return { 
            text: pdfData.text, 
            confidence: 95 // High confidence for direct PDF text extraction
          };
        }
      } catch (pdfError) {
        logger.warn('PDF parsing failed, falling back to OCR:', pdfError.message);
      }
      
      // Fallback to OCR
      logger.info('Using OCR for text extraction');
      const ocrResult = await Tesseract.recognize(dataBuffer, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      return {
        text: ocrResult.data.text,
        confidence: Math.round(ocrResult.data.confidence)
      };
      
    } catch (error) {
      logger.error('Text extraction error:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  async validateNotary(text) {
    try {
      logger.info('Starting notary validation');
      
      const notaryPatterns = [
        /notary\s+public[:\s]*([^\n]+)/gi,
        /commission\s+number[:\s]*([A-Z0-9\s-]+)/gi,
        /commission\s+expires?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
        /acknowledged\s+before\s+me[:\s]*([^\n]+)/gi
      ];
      
      let notaryName = null;
      let commissionNumber = null;
      let commissionExpiry = null;
      const issues = [];
      
      // Extract notary information
      notaryPatterns.forEach((pattern, index) => {
        const matches = text.match(pattern);
        if (matches) {
          switch (index) {
            case 0: // Notary name
              notaryName = matches[0].replace(/notary\s+public[:\s]*/gi, '').trim();
              break;
            case 1: // Commission number
              commissionNumber = matches[0].replace(/commission\s+number[:\s]*/gi, '').trim();
              break;
            case 2: // Commission expiry
              const dateMatch = matches[0].match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
              if (dateMatch) {
                commissionExpiry = new Date(dateMatch[1]);
              }
              break;
          }
        }
      });
      
      // Validate notary information
      if (!notaryName) {
        issues.push('Notary name not found or not clearly visible');
      }
      
      if (!commissionNumber) {
        issues.push('Notary commission number not found');
      }
      
      if (!commissionExpiry) {
        issues.push('Notary commission expiry date not found');
      } else if (commissionExpiry < new Date()) {
        issues.push('Notary commission has expired');
      }
      
      // Check with California Secretary of State (if API available)
      let isValid = false;
      if (commissionNumber && process.env.CA_NOTARY_API_URL) {
        try {
          isValid = await this.validateNotaryWithState(commissionNumber, notaryName);
        } catch (apiError) {
          logger.warn('Notary API validation failed:', apiError.message);
          issues.push('Could not verify notary with state database - manual verification recommended');
        }
      } else {
        issues.push('Notary validation requires manual verification');
      }
      
      const status = issues.length === 0 ? 'pass' : (issues.length <= 2 ? 'warning' : 'fail');
      
      return {
        status,
        notaryName,
        commissionNumber,
        commissionExpiry,
        isValid,
        issues
      };
      
    } catch (error) {
      logger.error('Notary validation error:', error);
      return {
        status: 'fail',
        issues: ['Error during notary validation: ' + error.message]
      };
    }
  }

  async validateNotaryWithState(commissionNumber, notaryName) {
    try {
      // This would be the actual API call to California Secretary of State
      // For now, this is a placeholder
      const response = await axios.get(`${process.env.CA_NOTARY_API_URL}/verify`, {
        params: {
          commission: commissionNumber,
          name: notaryName
        },
        headers: {
          'Authorization': `Bearer ${process.env.CA_NOTARY_API_KEY}`
        },
        timeout: 5000
      });
      
      return response.data.valid === true;
    } catch (error) {
      logger.error('State notary validation error:', error);
      throw new Error('Failed to validate with state database');
    }
  }

  async validateWitnesses(text) {
    try {
      logger.info('Starting witness validation');
      
      const witnessPatterns = [
        /witness[:\s]*([^\n]+)/gi,
        /signed\s+in\s+the\s+presence\s+of[:\s]*([^\n]+)/gi,
        /witnesses?[:\s]*\n([^\n]+)/gi
      ];
      
      const witnessNames = [];
      const issues = [];
      
      // Extract witness information
      witnessPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleanMatch = match.replace(/witness[:\s]*/gi, '').trim();
            if (cleanMatch && cleanMatch.length > 2) {
              witnessNames.push(cleanMatch);
            }
          });
        }
      });
      
      // Remove duplicates
      const uniqueWitnesses = [...new Set(witnessNames)];
      const witnessCount = uniqueWitnesses.length;
      
      // California Probate Code typically requires 1-2 witnesses depending on POA type
      const requiredWitnesses = 1; // Can be adjusted based on specific requirements
      
      if (witnessCount < requiredWitnesses) {
        issues.push(`Insufficient witnesses found. Required: ${requiredWitnesses}, Found: ${witnessCount}`);
      }
      
      // Check for prohibited witnesses
      uniqueWitnesses.forEach(witness => {
        const lowerWitness = witness.toLowerCase();
        this.prohibitedWitnesses.forEach(prohibited => {
          if (lowerWitness.includes(prohibited)) {
            issues.push(`Prohibited witness detected: ${witness} (contains '${prohibited}')`);
          }
        });
      });
      
      const status = issues.length === 0 ? 'pass' : (witnessCount >= requiredWitnesses ? 'warning' : 'fail');
      
      return {
        status,
        witnessCount,
        requiredWitnesses,
        witnessNames: uniqueWitnesses,
        issues
      };
      
    } catch (error) {
      logger.error('Witness validation error:', error);
      return {
        status: 'fail',
        issues: ['Error during witness validation: ' + error.message]
      };
    }
  }

  async validateVerbiage(text) {
    try {
      logger.info('Starting verbiage validation');
      
      const lowerText = text.toLowerCase();
      const issues = [];
      const requiredPhrases = [];
      
      // Check for required phrases
      this.requiredPhrases.forEach(phrase => {
        const found = lowerText.includes(phrase.toLowerCase());
        requiredPhrases.push({
          phrase,
          found,
          location: found ? this.findPhraseLocation(text, phrase) : null
        });
        
        if (!found) {
          issues.push(`Required phrase not found: "${phrase}"`);
        }
      });
      
      // Check for cremation authority
      const cremationPhrases = [
        'cremat',
        'disposition of remains',
        'final disposition',
        'dispose of my remains'
      ];
      
      const hasCremationAuthority = cremationPhrases.some(phrase => 
        lowerText.includes(phrase)
      );
      
      if (!hasCremationAuthority) {
        issues.push('No explicit cremation authority found in document');
      }
      
      // Determine POA type
      let poaType = 'unknown';
      if (lowerText.includes('durable power of attorney')) {
        poaType = 'durable';
      } else if (lowerText.includes('power of attorney') && !lowerText.includes('durable')) {
        poaType = 'non-durable';
      }
      
      // Check for California-specific requirements
      if (!lowerText.includes('california') && !lowerText.includes('ca')) {
        issues.push('Document may not be California-specific');
      }
      
      const status = issues.length === 0 ? 'pass' : (hasCremationAuthority ? 'warning' : 'fail');
      
      return {
        status,
        hasCremationAuthority,
        poaType,
        requiredPhrases,
        issues
      };
      
    } catch (error) {
      logger.error('Verbiage validation error:', error);
      return {
        status: 'fail',
        issues: ['Error during verbiage validation: ' + error.message]
      };
    }
  }

  async performAdditionalChecks(text) {
    try {
      const additionalChecks = {
        dateValidation: await this.validateDates(text),
        signatureValidation: await this.validateSignatures(text)
      };
      
      return additionalChecks;
    } catch (error) {
      logger.error('Additional checks error:', error);
      return {
        dateValidation: { status: 'fail', issues: ['Error validating dates'] },
        signatureValidation: { status: 'fail', issues: ['Error validating signatures'] }
      };
    }
  }

  async validateDates(text) {
    try {
      const datePatterns = [
        /dated?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
        /executed[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
        /signed[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
      ];
      
      const dates = [];
      const issues = [];
      
      datePatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const dateMatch = match.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
            if (dateMatch) {
              dates.push(new Date(dateMatch[1]));
            }
          });
        }
      });
      
      if (dates.length === 0) {
        issues.push('No execution date found in document');
      }
      
      const documentDate = dates.length > 0 ? dates[0] : null;
      const currentDate = new Date();
      const isCurrentlyValid = documentDate ? documentDate <= currentDate : false;
      
      if (documentDate && documentDate > currentDate) {
        issues.push('Document appears to be dated in the future');
      }
      
      const status = issues.length === 0 ? 'pass' : 'warning';
      
      return {
        status,
        documentDate,
        isCurrentlyValid,
        issues
      };
    } catch (error) {
      return {
        status: 'fail',
        issues: ['Error validating dates: ' + error.message]
      };
    }
  }

  async validateSignatures(text) {
    try {
      const signaturePatterns = [
        /principal[:\s]*signature/gi,
        /agent[:\s]*signature/gi,
        /attorney-in-fact[:\s]*signature/gi,
        /signed[:\s]*by/gi
      ];
      
      const issues = [];
      let principalSigned = false;
      let agentSigned = false;
      
      signaturePatterns.forEach(pattern => {
        if (text.match(pattern)) {
          if (pattern.source.includes('principal')) {
            principalSigned = true;
          } else if (pattern.source.includes('agent') || pattern.source.includes('attorney-in-fact')) {
            agentSigned = true;
          }
        }
      });
      
      if (!principalSigned) {
        issues.push('Principal signature not clearly identified');
      }
      
      // Note: Agent signature is typically not required on the POA document itself
      
      const status = issues.length === 0 ? 'pass' : 'warning';
      
      return {
        status,
        principalSigned,
        agentSigned,
        issues
      };
    } catch (error) {
      return {
        status: 'fail',
        issues: ['Error validating signatures: ' + error.message]
      };
    }
  }

  findPhraseLocation(text, phrase) {
    const index = text.toLowerCase().indexOf(phrase.toLowerCase());
    if (index === -1) return null;
    
    const lines = text.substring(0, index).split('\n');
    return `Line ${lines.length}`;
  }
}

module.exports = new DocumentValidationService();
