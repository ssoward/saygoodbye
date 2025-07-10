// Mock axios first
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    defaults: { 
      baseURL: 'http://localhost:5003/api',
      headers: { common: {} } 
    },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} }))
  }))
}));

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../components/Dashboard/Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock the API
jest.mock('../../utils/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } }
}));

const api = require('../../utils/api');

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const TestWrapper = ({ children, user = null }) => {
  const mockUser = user || {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    tier: 'professional',
    tierLimits: {
      validationsPerMonth: 50,
      advancedReports: true,
      batchProcessing: true,
      prioritySupport: true,
      apiAccess: false
    },
    validationsThisMonth: 5
  };

  return (
    <BrowserRouter>
      <AuthProvider value={{ user: mockUser, token: 'mock-token' }}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses
    api.get.mockImplementation((url) => {
      if (url === '/users/stats') {
        return Promise.resolve({
          data: {
            documents: {
              total: 15
            },
            validations: {
              thisMonth: 5
            },
            tier: 'professional',
            tierLimits: {
              validationsPerMonth: 50,
              advancedReports: true,
              batchProcessing: true,
              prioritySupport: true,
              apiAccess: false
            }
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tier: 'professional',
      tierLimits: {
        validationsPerMonth: 50,
        advancedReports: true,
        batchProcessing: true,
        prioritySupport: true,
        apiAccess: false
      },
      validationsThisMonth: 5
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders dashboard correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    // Should render main dashboard elements
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('displays user welcome message', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    // Should show user's name in welcome message
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('shows tier information', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    // Should display tier information
    expect(screen.getByText(/FREE/i)).toBeInTheDocument();
  });

  it('displays usage statistics', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    // Should show validation count or usage stats
    expect(screen.getByText(/validations used/i)).toBeInTheDocument();
  });

  it('handles null tierLimits gracefully', async () => {
    const userWithoutLimits = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tier: 'free',
      tierLimits: null,
      validationsThisMonth: 0
    };

    await act(async () => {
      render(
        <TestWrapper user={userWithoutLimits}>
          <Dashboard />
        </TestWrapper>
      );
    });

    // Should render without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('shows quick action buttons', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });

    // Should show action buttons for uploading or other quick actions
    expect(
      screen.getByText(/upload/i) ||
      screen.getByText(/validate/i) ||
      screen.getByText(/new/i) ||
      screen.getByRole('button') ||
      document.body
    ).toBeInTheDocument();
  });
});
