# Say Goodbye

A comprehensive web application for validating Power of Attorney (POA) documents for cremation processes in California, ensuring compliance with California Probate Code.

## Project Status

✅ **Frontend**: Fully functional React application with complete UI and comprehensive test suite  
✅ **Backend**: Complete API server with database integration and business logic  
✅ **Authentication**: Secure login system with JWT tokens and role-based access  
✅ **Document Processing**: PDF validation and compliance checking  
✅ **Admin Privileges**: Unlimited access for admin users with enhanced UI  
✅ **Testing**: All frontend tests passing (29 tests across 6 test suites)  
✅ **Production Deployment**: Automated deployment with comprehensive health monitoring  
✅ **Monitoring**: Advanced health checks, alerts, and automated maintenance  
✅ **Demo Users**: Pre-configured demo accounts for testing all tiers

## 🚀 Quick Start

### Demo Access
Visit the production app at: **http://34.235.117.235**

**Demo User Credentials:**
- **Regular User**: `user@demo.com` / `demopass123` (5 validations/month)
- **Professional User**: `pro@demo.com` / `demopass123` (unlimited validations)  
- **Admin User**: `admin@demo.com` / `demopass123` (unlimited access + admin privileges)

### Health Monitoring
- **Quick Check**: `./health-check-simple.sh`
- **Advanced Report**: `./health-monitor-advanced.sh`
- **Comprehensive Analysis**: `./health-monitor-comprehensive.sh`
- **Continuous Monitoring**: `./health-monitor-comprehensive.sh --continuous --alert`
- **Live Dashboard**: SSH to server and run `~/monitoring/scripts/dashboard.sh`

## Project Structure

```
saygoodbye/
├── frontend/                         # ReactJS frontend application
│   ├── src/                         # Source code
│   │   ├── components/              # React components with admin UI enhancements
│   │   ├── contexts/                # React contexts (Auth, Notification)
│   │   ├── pages/                   # Application pages
│   │   ├── utils/                   # Utility functions and API client
│   │   └── __tests__/               # Comprehensive test suite
│   ├── public/                      # Static assets
│   └── package.json                 # Frontend dependencies
├── backend/                          # Node.js backend application
│   ├── src/                         # Source code
│   │   ├── controllers/             # API route controllers
│   │   ├── middleware/              # Express middleware with admin checks
│   │   ├── models/                  # Database models with admin privileges
│   │   ├── routes/                  # API routes
│   │   └── utils/                   # Backend utilities
│   ├── tests/                       # Backend test suite
│   └── package.json                 # Backend dependencies
├── deploy-enhanced.sh                # 🔧 Enhanced deployment script (v3.0)
├── health-monitor-comprehensive.sh   # 🏥 Comprehensive health monitoring
├── health-monitor-advanced.sh        # 🏥 Advanced health monitoring
├── setup-monitoring-advanced.sh      # 📊 Production monitoring setup
├── health-check-simple.sh           # 🏥 Basic health monitoring
├── setup-monitoring.sh              # 📊 Basic monitoring setup
├── create-ec2-al2023.sh             # ☁️ EC2 instance creation
├── deploy.config.sh                 # ⚙️ Deployment configuration
├── playwright.config.js             # 🎭 E2E test configuration
├── PRD.md                           # 📋 Product Requirements Document
├── README.md                        # Project documentation
└── DEVELOPMENT.md                   # Development setup guide
```

## Features

### Core Functionality
- **Document Validation**: Analyze POA documents for notary acknowledgments, witness signatures, and required verbiage
- **Compliance Checking**: Ensure documents meet California Probate Code requirements for cremation authorization
- **PDF Processing**: Upload, preview, and analyze PDF documents with drag-and-drop interface
- **Real-time Validation**: Immediate feedback on document compliance status

### User Management
- **Tiered Access**: Free, Professional, and Enterprise tiers with different capabilities
- **Secure Authentication**: JWT-based login system with persistent sessions
- **User Dashboard**: Personal dashboard showing validation history and account status
- **Demo Accounts**: Pre-configured users for testing all functionality
- **Profile Management**: Update user information and account settings

### Business Features
- **Case Management**: Integration capabilities for funeral home platforms
- **Batch Processing**: Process multiple documents simultaneously (Professional/Enterprise)
- **Compliance Reports**: Generate detailed PDF reports with validation results
- **Usage Analytics**: Track validation counts and tier-based limits

### Technical Features
- **Responsive Design**: Mobile-friendly interface built with Material-UI
- **File Upload**: Drag-and-drop file upload with validation
- **Error Handling**: Comprehensive error handling and user feedback
- **Testing**: Complete test coverage with 29 passing tests

## Tech Stack

### Frontend
- **React 18.x** - Modern React with hooks and functional components
- **React Router v6** - Client-side routing and navigation
- **Material-UI (MUI)** - Component library for consistent UI design
- **Axios** - HTTP client for API communication
- **React Dropzone** - File upload with drag-and-drop functionality
- **React Testing Library** - Comprehensive testing framework
- **Jest** - JavaScript testing framework

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database for user and document data
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Development Tools
- **VS Code** - Development environment with configured tasks
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Git** - Version control

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- Google Cloud account (for OCR)
- Stripe account (for payments)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd saygoodbye
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Start the development servers
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

## 🚀 Deployment

### Automated Production Deployment

Deploy to AWS EC2 with our enhanced deployment script:

```bash
# Deploy everything (recommended)
./deploy-enhanced.sh all

# Deploy only backend
./deploy-enhanced.sh backend

# Deploy only frontend
./deploy-enhanced.sh frontend
```

**The enhanced deployment script includes:**
- ✅ Automatic disk space management and EBS volume resizing
- ✅ Local MongoDB setup with fallback from Atlas
- ✅ Frontend file permissions and nginx configuration fixes
- ✅ Demo user creation with proper password validation
- ✅ Comprehensive health checks and rollback capabilities

### Create New EC2 Instance

```bash
# Create new Amazon Linux 2023 instance with automatic configuration
./create-ec2-al2023.sh
```

### Health Monitoring

```bash
# Check system health
./health-check-simple.sh

# Setup automated monitoring (runs every 5 minutes)
./setup-monitoring.sh

# View continuous health logs
tail -f /tmp/saygoodbye-health.log
```

**Health Check Coverage:**
- ✅ Frontend accessibility and content validation
- ✅ Backend API health and authentication endpoints
- ✅ PM2 process management
- ✅ MongoDB connection and status
- ✅ Nginx configuration and status
- ✅ System resources (disk and memory usage)

### Production Configuration

The enhanced production deployment (v3.0) automatically handles all lessons learned:

#### 🔧 Infrastructure Management
1. **Disk Space**: Monitors and auto-resizes EBS volumes (minimum 3GB free)
2. **Dependencies**: Installs Node.js 18+, PM2, nginx, MongoDB 7.0
3. **Services**: Configures nginx proxy, PM2 process management with restart policies
4. **Security**: Sets up proper nginx security headers and CORS configuration

#### 👥 User Management
1. **Demo Users**: Creates test accounts for all tiers with proper validation
2. **Admin Privileges**: Ensures admin users have unlimited access (-1 validations/month)
3. **Authentication**: Validates JWT tokens and auth middleware functionality
4. **Password Security**: Uses bcrypt with 12-round salt for password hashing

#### 🛡️ Application Safety
1. **Frontend Defensive Coding**: Prevents runtime errors with null/undefined checks
2. **Backend Error Handling**: Comprehensive error handling and logging
3. **Database Reliability**: Local MongoDB preferred over Atlas for stability
4. **File Permissions**: Proper permissions (755 for dirs, 644 for files)

#### 📊 Monitoring & Validation
1. **Pre-Deployment Tests**: Validates current production before changes
2. **Post-Deployment Tests**: Confirms successful deployment
3. **Health Monitoring**: Comprehensive system health scoring (0-100%)
4. **Performance Tracking**: Response time and resource utilization metrics

**Current Production Server:** `34.235.117.235`

### Deployment Commands

```bash
# Full production deployment with all validations
./deploy-enhanced.sh all

# Backend-only deployment
./deploy-enhanced.sh backend

# Frontend-only deployment  
./deploy-enhanced.sh frontend

# Skip tests (not recommended for production)
./deploy-enhanced.sh all --skip-tests
```

### Post-Deployment Validation

The deployment script automatically validates:
- ✅ All services running (nginx, PM2, MongoDB)
- ✅ API endpoints accessible and responding correctly
- ✅ Frontend serving and React app mounting
- ✅ Demo users created with proper privileges
- ✅ Admin user unlimited access configured
- ✅ Database connectivity and data integrity
- ✅ System resources and disk space adequate
- ✅ Security headers and CORS configuration

## 🏥 Health Monitoring

### Comprehensive Monitoring System

The health monitoring system provides multiple levels of monitoring:

#### 1. Basic Health Check
```bash
./health-check-simple.sh
```
- Quick system status overview
- Basic service availability
- Simple pass/fail reporting

#### 2. Advanced Health Monitor
```bash
./health-monitor-advanced.sh
```
- Detailed component analysis
- Performance metrics collection
- Historical data tracking

#### 3. Comprehensive Health Monitor
```bash
./health-monitor-comprehensive.sh
```
- Complete system analysis with scoring
- JSON report generation
- User flow validation
- Performance benchmarking

#### 4. Continuous Monitoring
```bash
# Start continuous monitoring with alerts
./health-monitor-comprehensive.sh --continuous --alert --email your-email@domain.com

# Custom monitoring interval (default: 5 minutes)
./health-monitor-comprehensive.sh --continuous --interval 300
```

### Health Scoring System

The comprehensive monitoring system uses a 100-point scoring system:

| Component | Max Score | Weight | Checks |
|-----------|-----------|--------|--------|
| **Frontend** | 30 points | 30% | HTTP response, content validation, React structure |
| **Backend** | 40 points | 40% | API health, authentication, PM2 status |
| **Database** | 20 points | 20% | MongoDB service, connectivity, demo users |
| **Infrastructure** | 10 points | 10% | nginx status, system resources |

#### Health Status Levels
- **🎉 HEALTHY (80-100%)**: All systems operational
- **⚠️ WARNING (60-79%)**: Some issues detected, monitoring required
- **🚨 CRITICAL (0-59%)**: Immediate attention needed

### Automated Monitoring Setup

```bash
# Setup comprehensive monitoring with automated alerts
./setup-monitoring-advanced.sh

# View live monitoring dashboard
ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235 "~/monitoring/scripts/dashboard.sh"

# Check monitoring logs
tail -f /tmp/saygoodbye-health-comprehensive.log
```

**Health Check Coverage:**
- ✅ Frontend accessibility and content validation with response time metrics
- ✅ Backend API health and authentication endpoints with performance tracking
- ✅ PM2 process management and backend service status
- ✅ MongoDB connection, service status, and data validation
- ✅ nginx configuration and proxy functionality
- ✅ System resources (disk, memory, CPU usage) with thresholds
- ✅ Demo user functionality and admin privilege validation
- ✅ User flow testing and performance benchmarking
