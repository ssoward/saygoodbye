# Say Goodbye POA Validation System

A comprehensive, production-ready web application for validating Power of Attorney (POA) documents for cremation processes in California, ensuring full compliance with California Probate Code requirements.

## 🚀 Features Overview

### 🔐 **Complete Payment Integration & Subscription Management**
- **Stripe Payment Processing**: Full checkout, webhook handling, and subscription management
- **Tiered Subscription Plans**: Free (5 documents), Professional (50 documents), Enterprise (unlimited)
- **Usage Tracking**: Real-time monitoring with automatic limits and upgrade prompts
- **Payment Security**: PCI-compliant processing with secure webhook validation

### 📄 **Advanced Document Processing**
- **Enhanced PDF OCR**: Handles both text-based and scanned PDFs with `pdf2pic` conversion
- **Multi-format Support**: PDF, JPG, PNG, TIFF, and other image formats
- **High-Quality OCR**: 300 DPI conversion for optimal text extraction accuracy
- **Automatic Fallback**: Smart text extraction with multiple processing methods

### 🎯 **Comprehensive Validation Engine**
- **California Probate Code Compliance**: Validates against specific legal requirements
- **Notary Validation**: Commission verification, expiry dates, and state database integration
- **Witness Requirements**: Validates witness count and prohibited witness detection
- **Required Verbiage**: Checks for cremation authority and POA-specific language
- **Date & Signature Validation**: Comprehensive document authenticity checks

### �️ **Modern User Interface**
- **Enhanced Dashboard**: Real-time usage stats, recent documents, and quick actions
- **Document Library**: Advanced filtering, search, bulk operations, and report generation
- **Subscription Management**: Plan comparison, upgrade flow, and usage visualization
- **Responsive Design**: Mobile-optimized with Material-UI components
- **Error Handling**: Comprehensive error boundaries and user feedback

### 👥 **Admin & Analytics**
- **User Management**: Comprehensive admin dashboard with user controls
- **Analytics**: Document processing statistics, user engagement metrics
- **Payment Monitoring**: Subscription tracking and revenue analytics
- **System Health**: Server monitoring and performance metrics

## 🏗️ Technical Architecture

### Frontend (React)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/                 # Login, Register
│   │   ├── Dashboard/            # Enhanced user dashboard
│   │   ├── Documents/            # Document library & upload
│   │   ├── Subscription/         # Payment & plan management
│   │   ├── Admin/               # Admin dashboard & analytics
│   │   └── Common/              # Shared components
│   ├── contexts/                # Auth & global state
│   ├── services/                # API integration
│   └── utils/                   # Helper functions
```

### Backend (Node.js/Express)
```
backend/
├── src/
│   ├── routes/                  # API endpoints
│   ├── services/
│   │   ├── documentValidation.js    # Enhanced OCR & validation
│   │   ├── paymentService.js        # Stripe integration
│   │   └── imageProcessingService.js # OCR processing
│   ├── models/                  # MongoDB schemas
│   ├── middleware/              # Auth, validation, error handling
│   └── utils/                   # Logger, helpers
```

## 🛠️ Setup & Installation

### Prerequisites
- **Node.js 18+** and npm
- **MongoDB** (local or Atlas)
- **Redis** (for session management)
- **Stripe account** (for payments)

### Environment Configuration

#### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/saygoodbye
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# CORS
FRONTEND_URL=http://localhost:3000

# File Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

> **Note**: Environment templates are automatically created by the deployment script if they don't exist.
FRONTEND_URL=http://localhost:3000

# File Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Installation Steps

#### Option 1: Automated Deployment (Recommended)
```bash
git clone https://github.com/ssoward/saygoodbye.git
cd saygoodbye

# One-command setup and deployment
./deploy-local.sh
```

#### Option 2: Manual Setup
```bash
git clone https://github.com/ssoward/saygoodbye.git
cd saygoodbye

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Start development servers (requires 2 terminals)
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm start
```

3. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/

## 🔧 Key Features Implemented

### ✅ Payment System
- [x] Stripe checkout integration
- [x] Subscription plan management
- [x] Usage tracking and limits
- [x] Webhook processing
- [x] Payment history

### ✅ Enhanced Document Processing
- [x] PDF text extraction with fallback OCR
- [x] Scanned PDF support via pdf2pic
- [x] Multi-format image processing
- [x] High-quality OCR with Tesseract.js
- [x] Confidence scoring

### ✅ User Experience
- [x] Modern Material-UI design
- [x] Enhanced dashboard with analytics
- [x] Document library with advanced features
- [x] Subscription management interface
- [x] Mobile-responsive design

### ✅ Admin Features
- [x] User management dashboard
- [x] Analytics and reporting
- [x] Payment monitoring
- [x] System health checks

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Documents
- `POST /api/documents/upload` - Upload and validate document
- `GET /api/documents` - List user documents
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document

### Payments
- `POST /api/payments/create-checkout-session` - Create Stripe checkout
- `POST /api/payments/webhook` - Handle Stripe webhooks
- `GET /api/payments/usage` - Get usage statistics

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/analytics` - System analytics
- `GET /api/admin/payments` - Payment reports

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Build production
cd frontend && npm run build
```

### Test Coverage
- Document validation engine
- Payment processing
- OCR functionality
- Authentication flows
- Admin features

## 🚀 Deployment & Development

### 🎯 Quick Start (Recommended)

For immediate development setup and deployment:

```bash
git clone https://github.com/ssoward/saygoodbye.git
cd saygoodbye

# One-command setup and deployment
./deploy-local.sh
```

This automated script will:
- ✅ Kill any existing Node.js/npm processes
- ✅ Check prerequisites (Node.js 18+, npm)
- ✅ Create environment file templates if missing
- ✅ Install dependencies for both frontend and backend
- ✅ Start both services simultaneously
- ✅ Run health checks and provide service URLs

> 📚 **Quick Reference**: See [DEPLOYMENT.md](DEPLOYMENT.md) for a condensed deployment guide.

### 📋 Deployment Management Commands

#### Unified Management Script (Recommended)
```bash
# Project management (all-in-one command)
./manage.sh <command> [options]

# Quick examples
./manage.sh setup          # Setup development environment
./manage.sh start          # Start all services
./manage.sh stop           # Stop all services
./manage.sh status         # Check service status
./manage.sh logs backend   # View backend logs
./manage.sh restart --force # Force restart services
```

#### Individual Scripts
| Command | Description |
|---------|-------------|
| `./deploy-local.sh` | Full deployment (kill processes, install deps, start services) |
| `./deploy-local.sh --force` | Force restart (kills ALL Node processes) |
| `./deploy-local.sh --clean` | Clean install (removes node_modules first) |
| `./scripts/setup-dev.sh` | Setup development environment (no start) |
| `./scripts/status-local.sh` | Check service status and health |
| `./scripts/status-local.sh --watch` | Monitor services (auto-refresh every 5s) |
| `./scripts/stop-local.sh` | Stop all running services |

#### Management Script Commands
| Category | Command | Description |
|----------|---------|-------------|
| **Development** | `./manage.sh setup` | Setup development environment |
| | `./manage.sh start` | Start all services |
| | `./manage.sh stop` | Stop all services |
| | `./manage.sh restart` | Restart all services |
| | `./manage.sh status` | Check service status |
| | `./manage.sh logs <service>` | Show service logs |
| **Maintenance** | `./manage.sh clean` | Clean install (remove node_modules) |
| | `./manage.sh update` | Update all dependencies |
| | `./manage.sh test` | Run all tests |
| | `./manage.sh build` | Build for production |
| **Monitoring** | `./manage.sh watch` | Watch service status (auto-refresh) |
| | `./manage.sh health` | Check application health |
| | `./manage.sh ports` | Check port usage |

### 🔍 Service Monitoring

#### Real-time Status Monitoring
```bash
# Check current status
./scripts/status-local.sh

# Watch mode (updates every 5 seconds)
./scripts/status-local.sh --watch
```

#### Log File Monitoring
```bash
# View real-time backend logs
tail -f logs/backend.log

# View real-time frontend logs
tail -f logs/frontend.log

# View deployment logs
tail -f logs/deploy.log
```

### 🌐 Service URLs (After Deployment)

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React application |
| **Backend API** | http://localhost:3001 | Express.js API server |
| **API Docs** | http://localhost:3001/ | API documentation |
| **Health Check** | http://localhost:3001/health | Backend health endpoint |

### 🛠️ Manual Development Setup

If you prefer manual control over the development environment:

```bash
# 1. Clone repository
git clone https://github.com/ssoward/saygoodbye.git
cd saygoodbye

# 2. Setup development environment
./scripts/setup-dev.sh

# 3. Start backend (Terminal 1)
cd backend && npm run dev

# 4. Start frontend (Terminal 2)
cd frontend && npm start
```

### 🔧 Troubleshooting

#### Common Issues

**Port Already in Use**
```bash
# Kill processes on specific ports
./deploy-local.sh --force

# Or manually check what's using the ports
lsof -ti:3000  # Frontend port
lsof -ti:3001  # Backend port
```

**Dependencies Issues**
```bash
# Clean install
./deploy-local.sh --clean

# Or manually clean
rm -rf frontend/node_modules backend/node_modules
rm -f frontend/package-lock.json backend/package-lock.json
```

**Environment Configuration**
- Backend .env template created at: `backend/.env`
- Frontend .env template created at: `frontend/.env`
- Update these files with your actual configuration values

#### Health Check Endpoints
```bash
# Backend health
curl http://localhost:3001/health

# Frontend availability
curl http://localhost:3000
```

### 🏗️ Production Deployment

#### Build for Production
```bash
# Build optimized frontend
cd frontend && npm run build

# Start backend in production mode
cd backend && NODE_ENV=production npm start
```

#### Production Environment Variables
Ensure all production environment variables are configured:

**Backend (.env)**
- Database connections (MongoDB, Redis)
- Stripe production keys
- JWT secrets
- CORS settings for production domain
- File upload configurations

**Frontend (.env)**
- Production API URL
- Stripe publishable key

### 📊 Development Workflow

1. **Initial Setup**: `./deploy-local.sh`
2. **Development**: Code changes auto-reload
3. **Status Check**: `./scripts/status-local.sh`
4. **Restart Services**: `./deploy-local.sh`
5. **Stop Services**: `./scripts/stop-local.sh`

### 🔒 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Latest version
- **MongoDB**: Local instance or Atlas connection
- **Redis**: For session management
- **Stripe Account**: For payment processing (development keys)

## 📈 Monitoring & Analytics

### Health Checks
- `GET /health` - Basic server health
- `GET /api/health` - Detailed system status

### Metrics Tracked
- Document processing times
- OCR confidence scores
- User engagement
- Payment conversion rates
- System performance

## 🔒 Security Features

- JWT authentication with secure tokens
- CORS protection
- Rate limiting
- Input validation and sanitization
- Secure file upload handling
- Payment data encryption
- Admin role protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Production Deployment

### Current Production Environment
- **Production URL**: http://34.235.117.235
- **API Endpoint**: http://34.235.117.235/api
- **Health Check**: http://34.235.117.235/api/health
- **Server**: AWS EC2 (34.235.117.235)

### Deployment Commands

#### Quick Production Deployment
```bash
# Deploy to production with current build
./quick-deploy-production.sh
```

#### Full Development Setup
```bash
# Local development environment
./deploy-local.sh

# Check status
./manage.sh status

# Stop services
./manage.sh stop
```

### Deployment Requirements
- SSH access with key: `~/.ssh/saygoodbye.pem`
- Production server: ec2-user@34.235.117.235
- Frontend build artifacts (created automatically)
- Backend dependencies (installed on server)

### Production Architecture
- **Frontend**: nginx serving React build (port 80)
- **Backend**: Node.js with PM2 process management (port 3001)
- **Database**: MongoDB (port 27017)
- **Proxy**: nginx reverse proxy for API routes

### Manual Deployment Steps
1. **Build Frontend**: `cd frontend && npm run build`
2. **Deploy**: `./quick-deploy-production.sh`
3. **Verify**: Check health endpoint and frontend access
4. **Monitor**: `ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235 "pm2 status"`

### Troubleshooting Deployment
```bash
# Connect to production server
ssh -i ~/.ssh/saygoodbye.pem ec2-user@34.235.117.235

# Check service status
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod

# View logs
pm2 logs saygoodbye-backend
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart saygoodbye-backend
sudo systemctl restart nginx
```

### Environment Configuration
Production environment variables are automatically configured during deployment:
- `NODE_ENV=production`
- `MONGODB_URI=mongodb://localhost:27017/saygoodbye_production`
- `CORS_ORIGIN=http://34.235.117.235`
- `JWT_SECRET` (auto-generated)

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for troubleshooting
- Production issues: Check server logs and PM2 status

---

