# Development Setup Guide

This guide will help you set up the Cremation POA Validation App for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (version 5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Redis** (version 6.0 or higher) - [Download here](https://redis.io/download)
- **Git** - [Download here](https://git-scm.com/downloads)

### Optional Services (for full functionality):
- **Google Cloud Account** (for advanced OCR)
- **Stripe Account** (for payment processing)
- **Twilio Account** (for SMS notifications)

## Quick Start

### 1. Install Dependencies

Use VS Code Task Runner (Ctrl+Shift+P → "Tasks: Run Task" → "Install All Dependencies")

Or manually:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Environment Variables

Copy the example environment files and update them:

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment  
cp frontend/.env.example frontend/.env
```

**Important**: Update the `.env` files with your actual configuration values.

### 3. Start Development Services

#### Option A: Using VS Code Tasks (Recommended)
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Start Full Application"

This will start both the backend and frontend servers automatically.

#### Option B: Manual Start
```bash
# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend
cd frontend
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## Database Setup

### MongoDB
1. Start MongoDB service:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On Windows (as Administrator)
   net start MongoDB
   ```

2. The application will automatically create the database and collections.

### Redis
1. Start Redis service:
   ```bash
   # On macOS with Homebrew
   brew services start redis
   
   # On Ubuntu/Debian
   sudo systemctl start redis
   
   # On Windows
   redis-server
   ```

## Environment Configuration

### Backend (.env)

**Required:**
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (use a long, random string)

**Optional:**
- `GOOGLE_CLOUD_PROJECT_ID` & `GOOGLE_CLOUD_KEY_FILE`: For advanced OCR
- `STRIPE_SECRET_KEY`: For payment processing
- `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`: For SMS notifications

### Frontend (.env)

**Required:**
- `REACT_APP_API_URL`: Backend API URL (http://localhost:5000/api for development)

**Optional:**
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`: Stripe public key for payments

## First Run

1. **Create Admin User**: Register a new account through the UI, then manually update the user's role to 'admin' in MongoDB:
   ```javascript
   // In MongoDB shell
   db.users.updateOne(
     { email: "your-admin-email@example.com" },
     { $set: { role: "admin" } }
   )
   ```

2. **Test Document Upload**: Use the sample POA documents in the `docs/samples/` folder.

## Development Features

### Available VS Code Tasks
- **Install All Dependencies**: Installs both backend and frontend dependencies
- **Start Full Application**: Starts both servers
- **Start Backend Server**: Starts only the backend
- **Start Frontend Server**: Starts only the frontend

### API Testing
Use the included Postman collection or test endpoints directly:
- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user
- POST `/api/documents/validate` - Upload document

### File Structure
```
cremation-poa-app/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── models/    # Database models
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Express middleware
│   │   └── utils/     # Utilities
├── frontend/          # React application
│   ├── src/
│   │   ├── components/# React components
│   │   ├── contexts/  # React contexts
│   │   └── utils/     # Utilities
└── docs/             # Documentation
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in `.env`

2. **Redis Connection Error**
   - Ensure Redis is running
   - Check Redis URL in `.env`

3. **CORS Errors**
   - Verify `FRONTEND_URL` in backend `.env`
   - Check `REACT_APP_API_URL` in frontend `.env`

4. **File Upload Errors**
   - Ensure the `uploads/` directory exists and is writable
   - Check file size limits in `.env`

### Logs
- Backend logs: `backend/logs/`
- Frontend logs: Browser console

### Reset Development Environment
```bash
# Stop all services
# Delete node_modules
rm -rf backend/node_modules frontend/node_modules

# Clear databases (optional)
# MongoDB: Drop the database
# Redis: FLUSHALL

# Reinstall dependencies
npm run install:all
```

## Next Steps

1. **Configure External Services**: Set up Google Cloud, Stripe, and Twilio accounts
2. **Test Validation**: Upload sample POA documents
3. **Customize**: Modify validation rules in `backend/src/services/documentValidation.js`
4. **Deploy**: See deployment documentation for production setup

## Support

For development support:
- Check the logs in `backend/logs/`
- Review the API documentation
- Create an issue in the repository

---

Happy coding! 🚀
