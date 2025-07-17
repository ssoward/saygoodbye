import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PhotoCamera as CameraIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  QrCode as QrCodeIcon,
  TextFields as TextIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import { useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-toastify';

const ScannedDocumentUpload = ({ onUploadSuccess, onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [language, setLanguage] = useState('eng');
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [showQualityDialog, setShowQualityDialog] = useState(false);
  
  const webcamRef = useRef(null);
  const queryClient = useQueryClient();

  // Load supported languages on mount
  React.useEffect(() => {
    loadSupportedLanguages();
  }, []);

  const loadSupportedLanguages = async () => {
    try {
      const response = await axios.get('/api/scanned-documents/supported-languages');
      setSupportedLanguages(response.data.languages);
    } catch (error) {
      console.error('Failed to load supported languages:', error);
    }
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      toast.error(`File rejected: ${error.message}`);
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      
      // Auto-analyze quality when file is selected
      analyzeImageQuality(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      // Convert base64 to blob
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(imageSrc);
          setShowCamera(false);
          
          // Auto-analyze quality
          analyzeImageQuality(file);
        });
    }
  }, [webcamRef]);

  const analyzeImageQuality = async (file) => {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await axios.post('/api/scanned-documents/analyze-quality', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setQualityAnalysis(response.data.qualityAnalysis);
    } catch (error) {
      console.error('Quality analysis failed:', error);
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('language', language);
      formData.append('preprocess', 'true');
      
      if (caseId) formData.append('caseId', caseId);
      if (notes) formData.append('notes', notes);
      if (tags) formData.append('tags', tags);

      const response = await axios.post('/api/scanned-documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setUploadResult(response.data);
      
      // Invalidate documents cache to refresh the list
      queryClient.invalidateQueries('documents');
      
      toast.success('Document uploaded and processed successfully!');
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data.document);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.error || 'Upload failed';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadResult(null);
    setQualityAnalysis(null);
    setCaseId('');
    setNotes('');
    setTags('');
    setLanguage('eng');
  };

  const getQualityScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getQualityScoreText = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (uploadResult) {
    return (
      <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckIcon color="success" sx={{ mr: 1 }} />
          Document Processed Successfully
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Document Information</Typography>
                <Typography><strong>Name:</strong> {uploadResult.document.originalName}</Typography>
                <Typography><strong>Processing Time:</strong> {uploadResult.document.processingTime}ms</Typography>
                <Typography><strong>Text Length:</strong> {uploadResult.document.extractedTextLength} characters</Typography>
                <Typography><strong>QR Codes Found:</strong> {uploadResult.document.qrCodesFound}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Quality Analysis</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ mr: 1 }}>Overall Score:</Typography>
                  <Chip 
                    label={`${uploadResult.document.imageQuality.overallScore}% - ${getQualityScoreText(uploadResult.document.imageQuality.overallScore)}`}
                    color={getQualityScoreColor(uploadResult.document.imageQuality.overallScore)}
                  />
                </Box>
                <Typography variant="body2">
                  OCR Confidence: {Math.round(uploadResult.document.ocrResults.confidence)}%
                </Typography>
                <Typography variant="body2">
                  Words Detected: {uploadResult.document.ocrResults.wordCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {uploadResult.document.imageQuality.recommendations.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {uploadResult.document.imageQuality.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </Alert>
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={resetForm}>
            Upload Another Document
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Upload Scanned Document
      </Typography>

      {!selectedFile ? (
        <Box>
          {/* File Drop Zone */}
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.3s ease',
              mb: 2
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: JPEG, PNG, GIF, BMP, TIFF, WebP (Max 10MB)
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>OR</Typography>
            <Button
              variant="outlined"
              startIcon={<CameraIcon />}
              onClick={() => setShowCamera(true)}
            >
              Take Photo with Camera
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          {/* File Preview and Settings */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Selected Image</Typography>
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Preview"
                    sx={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'contain',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Upload Settings</Typography>
                  
                  <TextField
                    fullWidth
                    label="Case ID (Optional)"
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    margin="normal"
                  />

                  <FormControl fullWidth margin="normal">
                    <InputLabel>OCR Language</InputLabel>
                    <Select
                      value={language}
                      label="OCR Language"
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      {supportedLanguages.map((lang) => (
                        <MenuItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    margin="normal"
                    placeholder="e.g., contract, legal, urgent"
                  />

                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    margin="normal"
                    multiline
                    rows={3}
                  />
                </CardContent>
              </Card>
            </Grid>

            {qualityAnalysis && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssessmentIcon sx={{ mr: 1 }} />
                      Image Quality Analysis
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ mr: 1 }}>Overall Quality:</Typography>
                      <Chip 
                        label={`${qualityAnalysis.overallScore}% - ${getQualityScoreText(qualityAnalysis.overallScore)}`}
                        color={getQualityScoreColor(qualityAnalysis.overallScore)}
                      />
                      <Button 
                        size="small" 
                        onClick={() => setShowQualityDialog(true)}
                        sx={{ ml: 1 }}
                      >
                        Details
                      </Button>
                    </Box>

                    {qualityAnalysis.recommendations.length > 0 && (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Recommendations for better OCR:</Typography>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {qualityAnalysis.recommendations.slice(0, 2).map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {isUploading && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                Processing document... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={uploadDocument}
              disabled={isUploading}
              startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {isUploading ? 'Processing...' : 'Upload & Process'}
            </Button>
            <Button variant="outlined" onClick={resetForm} disabled={isUploading}>
              Select Different Image
            </Button>
          </Box>
        </Box>
      )}

      {/* Camera Dialog */}
      <Dialog open={showCamera} onClose={() => setShowCamera(false)} maxWidth="md" fullWidth>
        <DialogTitle>Take Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center' }}>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: "user"
              }}
              style={{ width: '100%', maxWidth: 600 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCamera(false)}>Cancel</Button>
          <Button variant="contained" onClick={capturePhoto} startIcon={<CameraIcon />}>
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quality Details Dialog */}
      <Dialog open={showQualityDialog} onClose={() => setShowQualityDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Image Quality Details</DialogTitle>
        <DialogContent>
          {qualityAnalysis && (
            <List>
              <ListItem>
                <ListItemText
                  primary="Resolution"
                  secondary={`${qualityAnalysis.resolution.width} × ${qualityAnalysis.resolution.height} pixels (${qualityAnalysis.resolution.megapixels.toFixed(1)} MP)`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="DPI"
                  secondary={qualityAnalysis.resolution.dpi}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Sharpness"
                  secondary={`${Math.round(qualityAnalysis.quality.sharpness * 100)}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Contrast"
                  secondary={`${Math.round(qualityAnalysis.quality.contrast * 100)}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Brightness"
                  secondary={`${Math.round(qualityAnalysis.quality.brightness * 100)}%`}
                />
              </ListItem>
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQualityDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ScannedDocumentUpload;
