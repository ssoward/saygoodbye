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
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Redis (for session management)
- Stripe account (for payments)

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

### Installation Steps

1. **Clone and install dependencies**
```bash
git clone https://github.com/ssoward/saygoodbye.git
cd saygoodbye

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

2. **Start development servers**
```bash
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

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Start backend in production
cd backend && NODE_ENV=production npm start
```

### Environment Variables
Ensure all production environment variables are set, including:
- Database connections
- Stripe production keys
- CORS settings for production domain
- File upload configurations

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

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for troubleshooting

---

