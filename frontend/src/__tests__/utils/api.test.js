// Mock axios at the top level
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    defaults: { 
      baseURL: 'http://localhost:5003/api',
      headers: { common: {} } 
    },
    interceptors: {
      request: { 
        use: jest.fn(),
        handlers: []
      },
      response: { 
        use: jest.fn(),
        handlers: []
      }
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} }))
  }))
}));

import api from '../../utils/api';

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should create axios instance with correct configuration', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5003/api');
  });

  it('should have interceptors available', () => {
    expect(api.interceptors).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });
});
