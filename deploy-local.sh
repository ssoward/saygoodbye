#!/bin/bash

#############################################
# Say Goodbye POA App - Local Deployment
#############################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}Say Goodbye POA App - Local Deployment${NC}"
echo -e "${BLUE}===========================================${NC}"
echo "Project Directory: $PROJECT_DIR"
echo "Backend Directory: $BACKEND_DIR"
echo "Frontend Directory: $FRONTEND_DIR"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            print_status "Node.js version $NODE_VERSION (✓ >= 18.0)"
            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+"
            return 1
        fi
    else
        print_error "Node.js not found. Please install Node.js 18+"
        return 1
    fi
}

# Function to check MongoDB
check_mongodb() {
    if command_exists mongod; then
        print_status "MongoDB is installed"
        
        # Check if MongoDB is running
        if pgrep mongod > /dev/null; then
            print_status "MongoDB is running"
        else
            print_warning "MongoDB is not running. Starting MongoDB..."
            # Try to start MongoDB
            if command_exists brew; then
                brew services start mongodb-community@7.0 || brew services start mongodb/brew/mongodb-community@7.0 || true
            else
                mongod --config /usr/local/etc/mongod.conf --fork || sudo service mongod start || true
            fi
            sleep 3
        fi
    else
        print_warning "MongoDB not found. Installing MongoDB..."
        if command_exists brew; then
            print_info "Installing MongoDB via Homebrew..."
            brew tap mongodb/brew
            brew install mongodb-community@7.0
            brew services start mongodb-community@7.0
        else
            print_error "Please install MongoDB manually: https://docs.mongodb.com/manual/installation/"
            return 1
        fi
    fi
}

# Function to setup backend
setup_backend() {
    print_info "Setting up backend..."
    cd "$BACKEND_DIR"
    
    # Install dependencies
    print_info "Installing backend dependencies..."
    npm install
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating backend .env file..."
        cat > .env << EOF
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/saygoodbye
JWT_SECRET=your-super-secret-jwt-key-for-local-development-only
CORS_ORIGIN=http://localhost:3000
EOF
        print_status "Created backend .env file"
    else
        print_status "Backend .env file already exists"
    fi
    
    print_status "Backend setup complete"
}

# Function to setup frontend
setup_frontend() {
    print_info "Setting up frontend..."
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    print_info "Installing frontend dependencies..."
    npm install
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        print_info "Creating frontend .env file..."
        cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
EOF
        print_status "Created frontend .env file"
    else
        print_status "Frontend .env file already exists"
    fi
    
    print_status "Frontend setup complete"
}

# Function to create demo users
create_demo_users() {
    print_info "Creating demo users..."
    cd "$BACKEND_DIR"
    
    # Create a script to add demo users
    cat > create-demo-users.js << 'EOF'
const mongoose = require('mongoose');
const User = require('./src/models/User');

const demoUsers = [
  {
    email: 'user@demo.com',
    password: 'demopass123',
    firstName: 'Demo',
    lastName: 'User',
    tier: 'free',
    role: 'user'
  },
  {
    email: 'pro@demo.com', 
    password: 'demopass123',
    firstName: 'Pro',
    lastName: 'User',
    tier: 'professional',
    role: 'user'
  },
  {
    email: 'admin@demo.com',
    password: 'demopass123', 
    firstName: 'Admin',
    lastName: 'User',
    tier: 'enterprise',
    role: 'admin'
  }
];

async function createDemoUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/saygoodbye');
    
    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created demo user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`ℹ️  Demo user already exists: ${userData.email}`);
      }
    }
    
    console.log('✅ Demo users setup complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  }
}

createDemoUsers();
EOF

    # Run the demo user creation script
    node create-demo-users.js
    rm create-demo-users.js
    
    print_status "Demo users created"
}

# Function to run tests
run_tests() {
    print_info "Running tests..."
    
    # Backend tests
    cd "$BACKEND_DIR"
    print_info "Running backend tests..."
    npm test
    
    # Frontend tests
    cd "$FRONTEND_DIR"
    print_info "Running frontend tests..."
    npm test -- --watchAll=false
    
    print_status "All tests passed"
}

# Function to start services
start_services() {
    print_info "Starting services..."
    
    # Function to start backend in background
    start_backend() {
        cd "$BACKEND_DIR"
        print_info "Starting backend server on http://localhost:3001..."
        npm run dev &
        BACKEND_PID=$!
        echo $BACKEND_PID > /tmp/saygoodbye-backend.pid
        sleep 3
        
        # Check if backend is running
        if curl -s http://localhost:3001/api/health > /dev/null; then
            print_status "Backend server started successfully"
        else
            print_error "Backend server failed to start"
            return 1
        fi
    }
    
    # Function to start frontend
    start_frontend() {
        cd "$FRONTEND_DIR"
        print_info "Starting frontend server on http://localhost:3000..."
        print_info "Frontend will open in your default browser automatically"
        npm start
    }
    
    # Start backend first
    start_backend
    
    # Give user option to start frontend
    echo ""
    echo -e "${GREEN}Backend is running! ✅${NC}"
    echo ""
    echo "Demo User Credentials:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "• Regular User:  user@demo.com  / demopass123  (5 validations/month)"
    echo "• Pro User:      pro@demo.com   / demopass123  (unlimited validations)"  
    echo "• Admin User:    admin@demo.com / demopass123  (unlimited + admin privileges)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}Press ENTER to start the frontend (React development server)...${NC}"
    read -r
    
    # Start frontend
    start_frontend
}

# Function to stop services
stop_services() {
    print_info "Stopping services..."
    
    # Stop backend
    if [ -f /tmp/saygoodbye-backend.pid ]; then
        BACKEND_PID=$(cat /tmp/saygoodbye-backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            rm /tmp/saygoodbye-backend.pid
            print_status "Backend server stopped"
        fi
    fi
    
    # Stop any remaining node processes for this project
    pkill -f "node.*saygoodbye" || true
    
    print_status "All services stopped"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup     Setup the local development environment"
    echo "  start     Start the development servers"
    echo "  stop      Stop the development servers"
    echo "  test      Run all tests"
    echo "  clean     Clean up node_modules and reinstall"
    echo "  status    Check the status of local services"
    echo "  help      Show this help message"
    echo ""
    echo "Options:"
    echo "  --skip-tests    Skip running tests during setup"
    echo ""
    echo "Examples:"
    echo "  $0 setup           # Full setup with tests"
    echo "  $0 setup --skip-tests  # Setup without tests"
    echo "  $0 start           # Start both backend and frontend"
    echo "  $0 test            # Run all tests"
}

# Function to check status
check_status() {
    print_info "Checking local service status..."
    
    # Check Node.js
    if check_node_version; then
        print_status "Node.js: Ready"
    else
        print_error "Node.js: Not ready"
    fi
    
    # Check MongoDB
    if pgrep mongod > /dev/null; then
        print_status "MongoDB: Running"
    else
        print_warning "MongoDB: Not running"
    fi
    
    # Check Backend
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        print_status "Backend API: Running (http://localhost:3001)"
    else
        print_warning "Backend API: Not running"
    fi
    
    # Check Frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend: Running (http://localhost:3000)"
    else
        print_warning "Frontend: Not running"
    fi
}

# Function to clean up
clean_project() {
    print_info "Cleaning up project..."
    
    # Stop services first
    stop_services
    
    # Clean backend
    cd "$BACKEND_DIR"
    rm -rf node_modules package-lock.json
    print_status "Cleaned backend"
    
    # Clean frontend  
    cd "$FRONTEND_DIR"
    rm -rf node_modules package-lock.json build
    print_status "Cleaned frontend"
    
    print_status "Project cleaned. Run 'setup' to reinstall dependencies."
}

# Main execution
case "${1:-setup}" in
    "setup")
        echo -e "${BLUE}Starting local development setup...${NC}"
        echo ""
        
        # Check prerequisites
        print_info "Checking prerequisites..."
        check_node_version
        check_mongodb
        
        # Setup backend and frontend
        setup_backend
        setup_frontend
        
        # Create demo users
        create_demo_users
        
        # Run tests unless skipped
        if [[ "$*" != *"--skip-tests"* ]]; then
            run_tests
        else
            print_warning "Skipping tests as requested"
        fi
        
        echo ""
        print_status "Local development environment setup complete!"
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo "1. Run: ${BLUE}./deploy-local.sh start${NC} to start the development servers"
        echo "2. Open: ${BLUE}http://localhost:3000${NC} in your browser"
        echo "3. Login with demo credentials (admin@demo.com / demopass123)"
        echo ""
        ;;
        
    "start")
        start_services
        ;;
        
    "stop")
        stop_services
        ;;
        
    "test")
        run_tests
        ;;
        
    "status")
        check_status
        ;;
        
    "clean")
        clean_project
        ;;
        
    "help"|"-h"|"--help")
        show_help
        ;;
        
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
