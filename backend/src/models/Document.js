const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: function() {
      return this.source !== 'scanned';
    }
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: function() {
      return this.source !== 'scanned';
    }
  },
  mimeType: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  validationResults: {
    overall: {
      type: String,
      enum: ['pass', 'fail', 'warning'],
      default: undefined
    },
    notaryValidation: {
      status: {
        type: String,
        enum: ['pass', 'fail', 'warning', 'not_checked']
      },
      notaryName: String,
      commissionNumber: String,
      commissionExpiry: Date,
      isValid: Boolean,
      issues: [String]
    },
    witnessValidation: {
      status: {
        type: String,
        enum: ['pass', 'fail', 'warning', 'not_checked']
      },
      witnessCount: Number,
      requiredWitnesses: Number,
      witnessNames: [String],
      issues: [String]
    },
    verbiageValidation: {
      status: {
        type: String,
        enum: ['pass', 'fail', 'warning', 'not_checked']
      },
      hasCremationAuthority: Boolean,
      poaType: {
        type: String,
        enum: ['durable', 'non-durable', 'unknown']
      },
      requiredPhrases: [{
        phrase: String,
        found: Boolean,
        location: String
      }],
      issues: [String]
    },
    additionalChecks: {
      dateValidation: {
        status: String,
        documentDate: Date,
        isCurrentlyValid: Boolean,
        issues: [String]
      },
      signatureValidation: {
        status: String,
        principalSigned: Boolean,
        agentSigned: Boolean,
        issues: [String]
      }
    }
  },
  extractedText: {
    type: String
  },
  ocrConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  processingTime: {
    type: Number // in milliseconds
  },
  errorMessage: {
    type: String
  },
  caseId: {
    type: String // For funeral home case management integration
  },
  tags: [String],
  notes: {
    type: String
  },
  reportGenerated: {
    type: Boolean,
    default: false
  },
  reportPath: {
    type: String
  },
  // Enhanced fields for scanned document support
  source: {
    type: String,
    enum: ['upload', 'scanned'],
    default: 'upload'
  },
  scannedDocumentData: {
    imageQuality: {
      overallScore: Number,
      resolution: {
        width: Number,
        height: Number,
        megapixels: Number,
        dpi: Number
      },
      colorSpace: {
        channels: Number,
        colorSpace: String,
        hasAlpha: Boolean
      },
      quality: {
        sharpness: Number,
        brightness: Number,
        contrast: Number
      },
      recommendations: [String]
    },
    ocrResults: {
      extractedText: String,
      confidence: Number,
      language: String,
      processingTime: Number,
      wordCount: Number,
      lineCount: Number,
      words: [{
        text: String,
        confidence: Number,
        bbox: {
          x0: Number,
          y0: Number,
          x1: Number,
          y1: Number
        }
      }],
      lines: [{
        text: String,
        confidence: Number,
        bbox: {
          x0: Number,
          y0: Number,
          x1: Number,
          y1: Number
        }
      }]
    },
    qrCodes: [{
      type: String,
      data: String,
      confidence: Number
    }],
    processingMetadata: {
      processedAt: Date,
      processingVersion: String
    },
    recommendations: [String]
  }
}, {
  timestamps: true
});

// Enhanced indexes for scalability
documentSchema.index({ userId: 1, createdAt: -1 }); // Existing: User documents by date
documentSchema.index({ userId: 1, status: 1, createdAt: -1 }); // NEW: Status filtering with date
documentSchema.index({ userId: 1, 'validationResults.overall': 1 }); // NEW: Results filtering
documentSchema.index({ userId: 1, caseId: 1 }); // NEW: Case-based queries
documentSchema.index({ userId: 1, tags: 1 }); // NEW: Tag filtering
documentSchema.index({ originalName: 'text', notes: 'text' }); // NEW: Full-text search
documentSchema.index({ status: 1 }); // Existing: Global status queries
documentSchema.index({ caseId: 1 }); // Existing: Case queries

// Virtual for validation summary
documentSchema.virtual('validationSummary').get(function() {
  if (!this.validationResults || this.status !== 'completed') {
    return null;
  }
  
  const results = this.validationResults;
  const summary = {
    overall: results.overall,
    passed: 0,
    failed: 0,
    warnings: 0,
    total: 0
  };
  
  const checks = [
    results.notaryValidation,
    results.witnessValidation,
    results.verbiageValidation
  ];
  
  checks.forEach(check => {
    if (check && check.status !== 'not_checked') {
      summary.total++;
      switch (check.status) {
        case 'pass':
          summary.passed++;
          break;
        case 'fail':
          summary.failed++;
          break;
        case 'warning':
          summary.warnings++;
          break;
      }
    }
  });
  
  return summary;
});

// Method to determine overall validation status
documentSchema.methods.calculateOverallStatus = function() {
  const results = this.validationResults;
  
  if (!results) return 'fail';
  
  const statuses = [
    results.notaryValidation?.status,
    results.witnessValidation?.status,
    results.verbiageValidation?.status
  ].filter(status => status && status !== 'not_checked');
  
  if (statuses.includes('fail')) {
    return 'fail';
  } else if (statuses.includes('warning')) {
    return 'warning';
  } else if (statuses.every(status => status === 'pass')) {
    return 'pass';
  }
  
  return 'fail';
};

// Pre-save middleware to calculate overall status
documentSchema.pre('save', function(next) {
  if (this.validationResults && this.status === 'completed') {
    this.validationResults.overall = this.calculateOverallStatus();
  } else if (this.validationResults && !this.validationResults.overall) {
    // Set a default value if overall is not set
    this.validationResults.overall = 'warning';
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);
