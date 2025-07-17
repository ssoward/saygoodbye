import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';
import axios from 'axios';
import ScannedDocumentUpload from '../../components/ScannedDocumentUpload';

// Mock dependencies
jest.mock('axios');
jest.mock('react-webcam', () => {
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,/9j/test-image'
    }));
    return <div data-testid="webcam">Webcam Component</div>;
  });
});

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ScannedDocumentUpload Component', () => {
  let queryClient: QueryClient;
  const mockOnUploadSuccess = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ScannedDocumentUpload
          onUploadSuccess={mockOnUploadSuccess}
          onClose={mockOnClose}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    it('should render the upload interface', () => {
      renderComponent();
      
      expect(screen.getByText('Upload Scanned Document')).toBeInTheDocument();
      expect(screen.getByText(/Drag & drop an image here/)).toBeInTheDocument();
      expect(screen.getByText('Take Photo with Camera')).toBeInTheDocument();
    });

    it('should load supported languages on mount', async () => {
      const mockLanguages = {
        data: {
          languages: [
            { code: 'eng', name: 'English' },
            { code: 'spa', name: 'Spanish' }
          ],
          default: 'eng'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(mockLanguages);
      
      renderComponent();
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/scanned-documents/supported-languages');
      });
    });
  });

  describe('File Upload', () => {
    it('should handle file selection via drag and drop', async () => {
      renderComponent();
      
      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      
      // Mock quality analysis response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          qualityAnalysis: {
            overallScore: 85,
            resolution: { width: 800, height: 600, megapixels: 0.5, dpi: 300 },
            quality: { sharpness: 0.8, brightness: 0.7, contrast: 0.9 },
            recommendations: ['Image quality is good']
          }
        }
      });

      // Simulate file drop
      Object.defineProperty(dropzone, 'files', {
        value: [file],
        writable: false
      });
      
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Selected Image')).toBeInTheDocument();
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should reject invalid file types', () => {
      renderComponent();
      
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      
      fireEvent.drop(dropzone!, { dataTransfer: { files: [invalidFile] } });
      
      // Should show error message (toast)
      expect(require('react-toastify').toast.error).toHaveBeenCalled();
    });
  });

  describe('Camera Capture', () => {
    it('should open camera dialog when camera button is clicked', () => {
      renderComponent();
      
      const cameraButton = screen.getByText('Take Photo with Camera');
      fireEvent.click(cameraButton);
      
      expect(screen.getByText('Take Photo')).toBeInTheDocument();
      expect(screen.getByTestId('webcam')).toBeInTheDocument();
    });

    it('should capture photo and close camera dialog', async () => {
      renderComponent();
      
      // Open camera
      fireEvent.click(screen.getByText('Take Photo with Camera'));
      
      // Mock quality analysis for captured photo
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          qualityAnalysis: {
            overallScore: 75,
            resolution: { width: 1280, height: 720, megapixels: 0.9, dpi: 72 },
            quality: { sharpness: 0.7, brightness: 0.6, contrast: 0.8 },
            recommendations: ['Consider better lighting']
          }
        }
      });
      
      // Capture photo
      const captureButton = screen.getByText('Capture Photo');
      fireEvent.click(captureButton);
      
      await waitFor(() => {
        expect(screen.getByText('Selected Image')).toBeInTheDocument();
        expect(screen.getByText('camera-capture.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('Quality Analysis', () => {
    it('should display quality analysis results', async () => {
      const mockAnalysis = {
        data: {
          qualityAnalysis: {
            overallScore: 92,
            resolution: { width: 2048, height: 1536, megapixels: 3.1, dpi: 300 },
            quality: { sharpness: 0.9, brightness: 0.8, contrast: 0.95 },
            recommendations: []
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockAnalysis);
      
      renderComponent();
      
      const file = new File(['test'], 'high-quality.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/92% - Excellent/)).toBeInTheDocument();
        expect(screen.getByText('Image Quality Analysis')).toBeInTheDocument();
      });
    });

    it('should show quality recommendations when available', async () => {
      const mockAnalysis = {
        data: {
          qualityAnalysis: {
            overallScore: 45,
            resolution: { width: 400, height: 300, megapixels: 0.1, dpi: 72 },
            quality: { sharpness: 0.3, brightness: 0.4, contrast: 0.5 },
            recommendations: [
              'Image resolution is low. For better OCR results, scan at 300 DPI or higher.',
              'Image appears blurry. Try to capture a sharper image.'
            ]
          }
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockAnalysis);
      
      renderComponent();
      
      const file = new File(['test'], 'low-quality.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Recommendations for better OCR:')).toBeInTheDocument();
        expect(screen.getByText(/scan at 300 DPI or higher/)).toBeInTheDocument();
      });
    });
  });

  describe('Document Upload Process', () => {
    it('should upload document with form data', async () => {
      const mockUploadResponse = {
        data: {
          success: true,
          document: {
            _id: 'doc123',
            originalName: 'test.jpg',
            processingTime: 2500,
            extractedTextLength: 1024,
            imageQuality: { overallScore: 85, recommendations: [] },
            ocrResults: { confidence: 89, wordCount: 156 },
            qrCodesFound: 0
          }
        }
      };
      
      mockedAxios.post
        .mockResolvedValueOnce({ data: { qualityAnalysis: { overallScore: 85 } } }) // Quality analysis
        .mockResolvedValueOnce(mockUploadResponse); // Upload
      
      renderComponent();
      
      // Add file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Selected Image')).toBeInTheDocument();
      });
      
      // Fill form fields
      fireEvent.change(screen.getByLabelText(/Case ID/), { target: { value: 'TEST-001' } });
      fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: 'Test upload' } });
      fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: 'test,ocr' } });
      
      // Upload
      const uploadButton = screen.getByText('Upload & Process');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/scanned-documents/upload',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        );
      });
      
      await waitFor(() => {
        expect(mockOnUploadSuccess).toHaveBeenCalledWith(mockUploadResponse.data.document);
      });
    });

    it('should show upload progress during processing', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { qualityAnalysis: { overallScore: 85 } } })
        .mockImplementationOnce(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: {
                  success: true,
                  document: { _id: 'doc123', originalName: 'test.jpg' }
                }
              });
            }, 100);
          });
        });
      
      renderComponent();
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Upload & Process')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Upload & Process'));
      
      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('should display success message with results', async () => {
      const mockUploadResponse = {
        data: {
          success: true,
          document: {
            _id: 'doc123',
            originalName: 'successful-upload.jpg',
            processingTime: 1800,
            extractedTextLength: 2048,
            imageQuality: { 
              overallScore: 92,
              recommendations: ['Excellent image quality']
            },
            ocrResults: { 
              confidence: 95,
              wordCount: 320,
              lineCount: 25
            },
            qrCodesFound: 1
          }
        }
      };
      
      mockedAxios.post
        .mockResolvedValueOnce({ data: { qualityAnalysis: { overallScore: 92 } } })
        .mockResolvedValueOnce(mockUploadResponse);
      
      renderComponent();
      
      const file = new File(['test'], 'success.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Upload & Process'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Document Processed Successfully')).toBeInTheDocument();
        expect(screen.getByText('successful-upload.jpg')).toBeInTheDocument();
        expect(screen.getByText('1800ms')).toBeInTheDocument();
        expect(screen.getByText('2048 characters')).toBeInTheDocument();
        expect(screen.getByText('OCR Confidence: 95%')).toBeInTheDocument();
        expect(screen.getByText('Words Detected: 320')).toBeInTheDocument();
      });
    });

    it('should allow uploading another document after success', async () => {
      // Setup successful upload first
      const mockUploadResponse = {
        data: {
          success: true,
          document: {
            _id: 'doc123',
            originalName: 'test.jpg',
            imageQuality: { overallScore: 85, recommendations: [] },
            ocrResults: { confidence: 89, wordCount: 156 }
          }
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockUploadResponse);
      
      renderComponent();
      
      // Go through upload process
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Upload & Process'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Document Processed Successfully')).toBeInTheDocument();
      });
      
      // Click "Upload Another Document"
      fireEvent.click(screen.getByText('Upload Another Document'));
      
      expect(screen.getByText('Upload Scanned Document')).toBeInTheDocument();
      expect(screen.getByText(/Drag & drop an image here/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors gracefully', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { qualityAnalysis: { overallScore: 85 } } })
        .mockRejectedValueOnce({
          response: { data: { error: 'File processing failed' } }
        });
      
      renderComponent();
      
      const file = new File(['test'], 'error.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Upload & Process'));
      });
      
      await waitFor(() => {
        expect(require('react-toastify').toast.error).toHaveBeenCalledWith('File processing failed');
      });
    });

    it('should handle quality analysis errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      
      renderComponent();
      
      const file = new File(['test'], 'error.jpg', { type: 'image/jpeg' });
      const dropzone = screen.getByText(/Drag & drop an image here/).closest('div');
      fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
      
      // Should still show the selected image even if quality analysis fails
      await waitFor(() => {
        expect(screen.getByText('Selected Image')).toBeInTheDocument();
      });
    });
  });
});
