# Say Goodbye

A comprehensive web application for validating Power of Attorney (POA) documents for cremation processes in California, ensuring compliance with California Probate Code.

## Project Status

✅ **Frontend**: Fully functional React application with complete UI and comprehensive test suite  
✅ **Backend**: Complete API server with database integration and business logic  
✅ **Authentication**: Secure login system with JWT tokens  
✅ **Document Processing**: PDF validation and compliance checking  
✅ **Testing**: All frontend tests passing (29 tests across 6 test suites)

## Project Structure

```
saygoodbye/
├── frontend/           # ReactJS frontend application
│   ├── src/           # Source code
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth, Notification)
│   │   ├── pages/         # Application pages
│   │   ├── utils/         # Utility functions and API client
│   │   └── __tests__/     # Comprehensive test suite
│   ├── public/        # Static assets
│   └── package.json   # Frontend dependencies
├── backend/           # Node.js backend application
│   ├── src/           # Source code
│   │   ├── controllers/   # API route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── utils/         # Backend utilities
│   ├── tests/         # Backend test suite
│   └── package.json   # Backend dependencies
├── README.md          # Project documentation
└── DEVELOPMENT.md     # Development setup guide
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

## License

MIT License - see LICENSE file for details.
