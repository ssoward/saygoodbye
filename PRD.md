# Product Requirements Document (PRD)
# Say Goodbye POA App - Production System

**Document Version:** 4.0  
**Last Updated:** July 14, 2025  
**Owner:** Development Team  
**Status:** Production Active  

## Executive Summary

The Say Goodbye POA (Power of Attorney) Application is a production-ready web application for validating POA documents for cremation processes in California. This system has been successfully deployed and tested with comprehensive health monitoring, automated deployment procedures, and robust error handling.

**Key Achievements:**
- ✅ Production deployment with zero-downtime capabilities
- ✅ Comprehensive health monitoring and automated alerting
- ✅ Robust admin user system with unlimited privileges
- ✅ Complete POA document test suite with 25 test cases
- ✅ Automated Playwright test integration
- ✅ Full error handling and defensive coding
- ✅ Document details functionality fully operational

## Table of Contents

1. [System Overview](#system-overview)
2. [Production Architecture](#production-architecture)
3. [Deployment Procedures](#deployment-procedures)
4. [Health Monitoring](#health-monitoring)
5. [Operational Procedures](#operational-procedures)
6. [Security Requirements](#security-requirements)
7. [Performance Requirements](#performance-requirements)
8. [Disaster Recovery](#disaster-recovery)
9. [Lessons Learned](#lessons-learned)
10. [Appendices](#appendices)

## System Overview

### Core Functionality
- **Document Validation**: Analyze POA documents for compliance with California Probate Code
- **Scanned Document Processing**: Upload and verify scanned documents (images/PDFs) with OCR capability
- **User Management**: Tiered access system (Free, Professional, Enterprise, Admin)
- **Authentication**: Secure JWT-based authentication with role-based access
- **File Processing**: PDF upload, preview, and validation with drag-and-drop interface
- **Image Processing**: Support for scanned documents (JPEG, PNG, TIFF) with OCR text extraction
- **Compliance Reporting**: Generate detailed validation reports for all document types

### Technical Stack
- **Frontend**: React 18.x, Material-UI, React Router v6
- **Backend**: Node.js 18+, Express.js, MongoDB 7.0
- **Infrastructure**: AWS EC2 (Amazon Linux 2023), nginx, PM2
- **Monitoring**: Custom health monitoring with automated alerts

## Production Architecture

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 Instance                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   nginx                              │   │
│  │  ┌─────────────────┐    ┌─────────────────────────┐ │   │
│  │  │    Frontend     │    │      API Proxy         │ │   │
│  │  │ /var/www/       │    │   /api/ -> :3001       │ │   │
│  │  │ saygoodbye      │    │                        │ │   │
│  │  └─────────────────┘    └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   PM2                               │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │           Backend API Server                    │ │   │
│  │  │            Port 3001                           │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 MongoDB 7.0                        │   │
│  │              Local Database                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### User Access Tiers

| Tier | Validations/Month | Features | Admin Privileges |
|------|------------------|----------|------------------|
| Free | 5 | Basic validation | No |
| Professional | Unlimited | All features | No |
| Enterprise | Unlimited | All features + integrations | No |
| Admin | Unlimited | All features + system admin | Yes |

## Deployment Procedures

### Prerequisites
- AWS CLI configured with appropriate permissions
- SSH key pair for EC2 access
- Node.js 18+ installed locally
- Playwright for testing

### Automated Deployment

The enhanced deployment script (`deploy-enhanced.sh`) implements all lessons learned:

```bash
# Full deployment
./deploy-enhanced.sh all

# Backend only
./deploy-enhanced.sh backend

# Frontend only
./deploy-enhanced.sh frontend

# Skip tests (not recommended for production)
./deploy-enhanced.sh all --skip-tests
```

### Deployment Process

1. **Pre-Deployment Validation**
   - Run comprehensive test suite against current production
   - Validate critical user flows
   - Check current system health

2. **Infrastructure Management**
   - Check and manage disk space (minimum 3GB free)
   - Auto-resize EBS volumes if needed
   - Install/update system dependencies

3. **Database Setup**
   - Install MongoDB 7.0 locally (preferred over Atlas)
   - Configure proper security settings
   - Create database indexes

4. **Backend Deployment**
   - Deploy application code via rsync
   - Install Node.js dependencies
   - Configure PM2 process management
   - Start backend services with health checks

5. **Frontend Deployment**
   - Build React application with production optimizations
   - Deploy to `/var/www/saygoodbye`
   - Configure nginx with security headers and performance optimizations

6. **Demo User Setup**
   - Create/update demo accounts with proper permissions
   - Validate admin user unlimited privileges
   - Test authentication for all user types

7. **Post-Deployment Validation**
   - Comprehensive health checks
   - API endpoint testing
   - Frontend functionality validation
   - Performance monitoring

### Infrastructure Management

#### Disk Space Management
- **Minimum Free Space**: 3GB
- **Auto-Resize Trigger**: <3GB free OR >85% used
- **EBS Volume Growth**: +10GB increments
- **Filesystem**: Automatic extension after resize

#### Service Management
```bash
# PM2 Backend Management
pm2 start ecosystem.config.json
pm2 restart saygoodbye-api
pm2 logs saygoodbye-api

# Nginx Management
sudo systemctl start nginx
sudo systemctl reload nginx
sudo nginx -t

# MongoDB Management
sudo systemctl start mongod
sudo systemctl status mongod
mongosh saygoodbye
```

## Health Monitoring

### Comprehensive Health Monitoring System

The application includes multiple levels of health monitoring:

#### 1. Basic Health Check
```bash
./health-check-simple.sh
```
- Quick system status
- Service availability
- Basic API health

#### 2. Comprehensive Health Monitor
```bash
./health-monitor-comprehensive.sh
```
- Detailed component analysis
- Performance metrics
- User flow validation
- JSON report generation

#### 3. Continuous Monitoring
```bash
./health-monitor-comprehensive.sh --continuous --alert
```
- Real-time monitoring (5-minute intervals)
- Automated alerting
- Historical data collection

### Health Scoring System

| Component | Max Score | Weight |
|-----------|-----------|--------|
| Frontend | 30 | 30% |
| Backend | 40 | 40% |
| Database | 20 | 20% |
| Infrastructure | 10 | 10% |

#### Health Status Levels
- **🎉 HEALTHY (80-100%)**: All systems operational
- **⚠️ WARNING (60-79%)**: Some issues detected, monitoring required
- **🚨 CRITICAL (0-59%)**: Immediate attention needed

### Monitoring Components

#### Frontend Monitoring
- HTTP response codes and timing
- Content structure validation
- React app mounting verification
- Static asset loading

#### Backend Monitoring
- API health endpoint response
- Authentication functionality
- PM2 process status
- Database connectivity

#### Database Monitoring
- MongoDB service status
- Connection testing
- Demo user validation
- Data integrity checks

#### Infrastructure Monitoring
- nginx service status
- System resource usage
- Disk space monitoring
- Memory utilization

## Operational Procedures

### Daily Operations
1. Check health monitoring dashboard
2. Review application logs
3. Monitor system resources
4. Verify demo user functionality

### Weekly Operations
1. Review health reports archive
2. Update security patches
3. Backup database
4. Performance analysis

### Monthly Operations
1. Capacity planning review
2. Security audit
3. Dependency updates
4. Disaster recovery testing

### Emergency Procedures

#### Service Outage Response
1. Run immediate health check
2. Check service status (PM2, nginx, MongoDB)
3. Review logs for errors
4. Restart services if needed
5. Escalate if issues persist

#### Performance Degradation
1. Check system resources
2. Analyze response times
3. Review database performance
4. Scale resources if needed

#### Security Incident
1. Isolate affected systems
2. Collect forensic data
3. Apply security patches
4. Review access logs
5. Update security procedures

## Security Requirements

### Authentication & Authorization
- JWT-based authentication with secure tokens
- Role-based access control (RBAC)
- Admin users have unlimited system privileges
- Demo accounts with restricted permissions

### Data Protection
- HTTPS enforcement (when SSL configured)
- Input validation and sanitization
- SQL injection prevention
- XSS protection via CSP headers

### Infrastructure Security
- nginx security headers
- Rate limiting configuration
- Firewall rules (EC2 security groups)
- SSH key-based access only

### Monitoring & Auditing
- Authentication attempt logging
- Admin action auditing
- Failed request monitoring
- Security event alerting

## Performance Requirements

### Response Time Targets
- Frontend page load: <2 seconds
- API endpoints: <500ms
- Authentication: <300ms
- Document validation: <5 seconds

### Throughput Requirements
- Concurrent users: 100+
- API requests/minute: 1000+
- Document uploads/hour: 500+

### Resource Limits
- CPU utilization: <70% average
- Memory usage: <80% average
- Disk usage: <85% maximum
- Network bandwidth: 100 Mbps

## Disaster Recovery

### Backup Strategy
- Database backups: Daily automated
- Application code: Version control (Git)
- Configuration files: Documented and versioned
- System state: AMI snapshots weekly

### Recovery Procedures
1. **Database Recovery**: Restore from latest backup
2. **Application Recovery**: Redeploy from Git repository
3. **Infrastructure Recovery**: Launch new EC2 instance
4. **Full System Recovery**: Automated deployment script

### Recovery Time Objectives (RTO)
- Database: 1 hour
- Application: 30 minutes
- Infrastructure: 2 hours
- Full system: 4 hours

## Lessons Learned

### Infrastructure Lessons
✅ **Always manage disk space proactively**
- Implement automatic EBS volume resizing
- Monitor disk usage continuously
- Maintain minimum 3GB free space

✅ **Use local MongoDB instead of Atlas**
- Better performance and reliability
- Reduced network dependencies
- Easier debugging and maintenance

✅ **Proper nginx configuration is critical**
- Security headers prevent vulnerabilities
- Proxy settings must handle all API routes
- Static asset caching improves performance

### Application Lessons
✅ **Frontend defensive coding prevents runtime errors**
- Always check for undefined object properties
- Use optional chaining and null coalescing
- Implement proper error boundaries

✅ **Admin users need unlimited privileges**
- Set validationsPerMonth to -1 for unlimited access
- Enable adminPrivileges flag in user model
- Display admin status clearly in UI

✅ **Backend configuration requires careful attention**
- Enable trust proxy for rate limiting behind nginx
- Configure CORS properly for production domain
- Use PM2 for reliable process management

### Testing Lessons
✅ **Comprehensive testing prevents deployment issues**
- Run pre-deployment tests against current production
- Test critical user flows after deployment
- Validate all admin user functionality

✅ **Health monitoring catches issues early**
- Monitor all system components continuously
- Set up automated alerting for critical issues
- Maintain historical health data

### Deployment Lessons
✅ **Automated deployment reduces human error**
- Codify all manual steps in deployment script
- Include validation and rollback procedures
- Document all configuration requirements

✅ **Demo users facilitate testing and demos**
- Create users for each tier level
- Use consistent demo passwords
- Validate demo user creation in deployment

✅ **Service reliability requires robust monitoring**
- PM2 process management prevents service outages
- Health monitoring catches issues early
- Comprehensive logging enables rapid debugging
- Regular validation testing ensures functionality

## Appendices

### Appendix A: Configuration Files

#### nginx Configuration
```nginx
# /etc/nginx/conf.d/saygoodbye.conf
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        root /var/www/saygoodbye;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### PM2 Configuration
```javascript
// ecosystem.config.json
{
  "apps": [{
    "name": "saygoodbye-api",
    "script": "src/app.js",
    "instances": 1,
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3001
    }
  }]
}
```

### Appendix B: Demo User Credentials

| User Type | Email | Password | Tier | Validations/Month |
|-----------|-------|----------|------|------------------|
| Regular | user@demo.com | demopass123 | free | 5 |
| Professional | pro@demo.com | demopass123 | professional | Unlimited |
| Admin | admin@demo.com | demopass123 | enterprise | Unlimited + Admin |

### Appendix C: Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|------------------|
| /health | nginx health | "healthy" |
| /api/health | Backend health | {"status": "ok"} |
| /api/auth/login | Authentication | {"token": "..."} |

### Appendix D: Emergency Contacts

| Role | Contact | Escalation Level |
|------|---------|-----------------|
| Development Team | [Email] | Primary |
| System Administrator | [Email] | Secondary |
| Management | [Email] | Executive |

### Appendix E: Project Status & Recent Updates

#### Production Readiness Status: ✅ COMPLETE

**All Major Features Implemented:**
- ✅ Document upload and validation system
- ✅ User authentication and authorization
- ✅ Admin user system with unlimited privileges
- ✅ Health monitoring and alerting
- ✅ Automated deployment pipeline
- ✅ Comprehensive test suite (25 POA test documents)
- ✅ Playwright end-to-end test integration

**Recent Critical Fixes (July 2025):**
- ✅ Fixed document details "invalid document id" error
- ✅ Backend-frontend field mapping corrected (_id vs id)
- ✅ Admin validation limit warnings properly hidden
- ✅ Defensive error handling throughout application
- ✅ Production 500 error handling improved
- ✅ MongoDB ObjectId validation enhanced
- ✅ **RESOLVED: Validation results and report downloads**
  - Fixed backend service outage (PM2 restart)
  - Corrected PDF text extraction (Tesseract OCR misconfiguration)
  - Validation now processes documents successfully
  - Report generation and download fully operational

**Deployment Pipeline:**
- ✅ Enhanced deployment script with lessons learned
- ✅ Pre and post-deployment health checks
- ✅ Automated rollback capabilities
- ✅ Comprehensive monitoring dashboard

**Current Production Status:**
- Server: EC2 (34.235.117.235)
- Health Score: 100% (All systems operational)
- Uptime: Stable with PM2 process management
- Users: 3 demo users (free, pro, admin tiers)
- **Document Validation: ✅ FULLY OPERATIONAL**
- **Report Downloads: ✅ FULLY OPERATIONAL**

**Next Steps:**
- Monitor production usage and performance
- Gather user feedback for future enhancements
- Scale infrastructure as needed
- Implement additional POA document types if required

---

**Document Control:**
- **Version**: 3.0
- **Approval**: Development Team
- **Next Review**: August 12, 2025
- **Distribution**: All stakeholders

## Scanned Document Processing Feature

### Overview
The scanned document processing feature enables users to upload and verify physical POA documents that have been scanned or photographed. This capability significantly expands the app's utility by supporting real-world scenarios where only physical documents are available.

### Key Capabilities

#### 1. Multi-Format Support
- **Image Formats**: JPEG, PNG, TIFF, WebP
- **PDF Scans**: Scanned PDF documents with embedded images
- **Mobile Photos**: Documents photographed with smartphones/tablets
- **Multi-Page Documents**: Support for documents spanning multiple pages

#### 2. Advanced OCR Processing
- **Text Extraction**: High-accuracy OCR using Tesseract.js
- **Language Support**: English with legal document optimization
- **Confidence Scoring**: OCR confidence levels for extracted text
- **Error Correction**: Intelligent text cleanup and formatting

#### 3. Image Enhancement
- **Auto-Rotation**: Automatically detect and correct document orientation
- **Contrast Enhancement**: Improve text clarity for better OCR results
- **Noise Reduction**: Remove artifacts and improve image quality
- **Edge Detection**: Automatically crop document boundaries

#### 4. Quality Validation
- **Resolution Check**: Minimum 300 DPI recommendation
- **Readability Assessment**: Validate text clarity before processing
- **Format Verification**: Ensure supported file types
- **Size Limits**: Maximum 25MB per file, up to 10 pages per document

### User Experience

#### Upload Process
1. **Drag & Drop Interface**: Enhanced to support image files
2. **Camera Integration**: Direct photo capture on mobile devices
3. **Preview Mode**: Show original image with extracted text overlay
4. **Quality Feedback**: Real-time suggestions for image improvement

#### Processing Workflow
1. **Upload Validation**: Check file format, size, and basic quality
2. **Image Enhancement**: Auto-improve image quality for OCR
3. **OCR Processing**: Extract text with confidence scoring
4. **Document Analysis**: Apply same validation rules as PDF documents
5. **Results Display**: Show OCR confidence and validation results

#### Quality Indicators
- **OCR Confidence**: Green (>90%), Yellow (70-90%), Red (<70%)
- **Text Coverage**: Percentage of document successfully extracted
- **Processing Status**: Real-time progress indicator
- **Retry Options**: Re-upload suggestions for poor quality scans

### Technical Implementation

#### Frontend Enhancements
- **File Type Detection**: Automatic format identification
- **Image Preview**: Thumbnail generation and full-size preview
- **Progress Tracking**: Multi-stage processing indicators
- **Error Handling**: Specific guidance for image quality issues

#### Backend Processing
- **OCR Service**: Tesseract.js integration with optimized settings
- **Image Processing**: Sharp.js for image enhancement and manipulation
- **Batch Processing**: Handle multi-page documents efficiently
- **Caching**: Store processed OCR results to avoid reprocessing

#### Performance Considerations
- **Async Processing**: Background OCR to maintain UI responsiveness
- **Progress Updates**: WebSocket notifications for processing status
- **Resource Management**: Limit concurrent OCR operations
- **Storage Optimization**: Compress original images after processing

### Validation Rules

#### Image Quality Requirements
- **Minimum Resolution**: 300 DPI recommended, 150 DPI minimum
- **File Size**: Maximum 25MB per image
- **Aspect Ratio**: Standard document proportions (A4, Letter, Legal)
- **Color Mode**: Support for color, grayscale, and black & white

#### OCR Accuracy Thresholds
- **High Confidence**: >90% - Process normally
- **Medium Confidence**: 70-90% - Flag for review
- **Low Confidence**: <70% - Suggest re-upload with better quality

#### Document Structure Detection
- **Header Recognition**: Identify POA title and document type
- **Signature Areas**: Detect signature blocks and notary sections
- **Date Fields**: Extract and validate date formats
- **Legal Text**: Identify required legal language and clauses

### Error Handling

#### Common Issues
- **Poor Image Quality**: Blurry, low contrast, or skewed images
- **Incomplete Text**: Partial document capture or cropped content
- **Mixed Formats**: Documents with both text and handwritten sections
- **Multiple Pages**: Handling page sequence and continuity

#### User Guidance
- **Quality Tips**: Best practices for scanning/photographing documents
- **Retry Instructions**: Specific suggestions for improving uploads
- **Alternative Options**: Fallback to PDF if available
- **Support Contact**: Help for complex document issues

### Security Considerations

#### Image Processing Security
- **File Validation**: Verify file headers and content
- **Malware Scanning**: Check uploaded images for threats
- **Memory Management**: Prevent buffer overflow attacks
- **Access Control**: Same security model as existing documents

#### Data Protection
- **OCR Data**: Encrypt extracted text at rest
- **Image Storage**: Secure storage with access logging
- **Processing Logs**: Audit trail for all OCR operations
- **Cleanup Policies**: Automatic deletion of temporary processing files

### Performance Metrics

#### Processing Benchmarks
- **OCR Speed**: Target <30 seconds for standard documents
- **Accuracy Rate**: >95% for high-quality scans
- **Success Rate**: >90% successful processing
- **User Satisfaction**: <3 retries average per document

#### Resource Usage
- **CPU**: OCR processing intensive, use worker threads
- **Memory**: Limit concurrent operations to prevent overflow
- **Storage**: Implement cleanup policies for temporary files
- **Bandwidth**: Optimize image compression for uploads

### Future Enhancements

#### Advanced Features
- **AI Document Recognition**: Automatically identify POA vs other documents
- **Handwriting Recognition**: Support for handwritten signatures and notes
- **Multi-Language Support**: Expand beyond English documents
- **Batch Processing**: Upload multiple documents simultaneously

#### Integration Opportunities
- **Cloud OCR Services**: Azure/AWS OCR for improved accuracy
- **Document Comparison**: Compare scanned vs original versions
- **Template Matching**: Pre-defined POA templates for validation
- **Export Options**: Extract structured data for external systems
