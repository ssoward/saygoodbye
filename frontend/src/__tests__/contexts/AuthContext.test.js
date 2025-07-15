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

import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock the API after importing
jest.mock('../../utils/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  defaults: { headers: { common: {} } }
}));

const api = require('../../utils/api');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const wrapper = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();
  });

  it('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('restores auth state from localStorage', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockToken = 'mock-token';

    // Reset the mock and set up the return values for localStorage
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'token') return mockToken;
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    // Mock the /auth/me endpoint that gets called when token exists
    api.get.mockResolvedValueOnce({
      data: mockUser
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for the auth state to load
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
    }, { timeout: 2000 });
  });

  it('handles login successfully', async () => {
    const mockResponse = {
      data: {
        token: 'new-token',
        user: { id: '1', email: 'test@example.com' }
      }
    };

    api.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockResponse.data.user);
    expect(result.current.token).toBe(mockResponse.data.token);
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    // The AuthContext only stores token in localStorage, not user
  });

  it('handles login error', async () => {
    const mockError = new Error('Login failed');
    api.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'wrongpassword');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Login failed');
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles logout correctly', () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockToken = 'mock-token';

    mockLocalStorage.getItem
      .mockReturnValueOnce(mockToken)
      .mockReturnValueOnce(JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    // The AuthContext only removes token from localStorage, not user
  });

  it('handles register successfully', async () => {
    const mockResponse = {
      data: {
        token: 'new-token',
        user: { id: '1', email: 'test@example.com' }
      }
    };

    api.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123'
    };

    await act(async () => {
      await result.current.register(userData);
    });

    expect(result.current.user).toEqual(mockResponse.data.user);
    expect(result.current.token).toBe(mockResponse.data.token);
    expect(result.current.isAuthenticated).toBe(true);
    expect(api.post).toHaveBeenCalledWith('/auth/register', userData);
  });

  it('handles register error', async () => {
    const mockError = new Error('Registration failed');
    api.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      password: 'password123'
    };

    let registerResult;
    await act(async () => {
      registerResult = await result.current.register(userData);
    });

    expect(registerResult.success).toBe(false);
    expect(registerResult.error).toBe('Registration failed');
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
