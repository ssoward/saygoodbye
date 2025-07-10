import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Grid,
  TextField,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as PdfIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const DocumentUpload = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  const navigate = useNavigate();

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [caseId, setCaseId] = useState('');
  const [notes, setNotes] = useState('');

  // Check if user can upload based on tier limits
  const canUpload = () => {
    if (!user) return false;
    const limits = user.tierLimits;
    if (limits.validationsPerMonth === -1) return true; // Unlimited
    return user.validationsThisMonth < limits.validationsPerMonth;
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => 
        file.errors.map(error => error.message).join(', ')
      );
      showError(`File upload error: ${errors.join('; ')}`);
      return;
    }

    if (!canUpload() && acceptedFiles.length > 0) {
      showWarning('You have reached your monthly validation limit. Please upgrade your plan to continue.');
      return;
    }

    // Add files to the upload queue
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, [user, showError, showWarning]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: user?.tierLimits?.batchProcessing || false
  });

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) {
      showError('Please select files to upload');
      return;
    }

    if (!canUpload()) {
      showWarning('You have reached your monthly validation limit. Please upgrade your plan to continue.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      if (user?.tierLimits?.batchProcessing && uploadedFiles.length > 1) {
        // Batch upload for Professional/Enterprise
        uploadedFiles.forEach(({ file }) => {
          formData.append('documents', file);
        });
        formData.append('caseId', caseId);
        formData.append('notes', notes);

        const response = await api.post('/documents/batch-validate', formData);

        showSuccess(`${uploadedFiles.length} documents uploaded successfully! Validation is in progress.`);
        navigate('/documents');
      } else {
        // Single file upload
        const file = uploadedFiles[0];
        formData.append('document', file.file);
        formData.append('caseId', caseId);
        formData.append('notes', notes);

        const response = await api.post('/documents/validate', formData);

        showSuccess('Document uploaded successfully! Validation is in progress.');
        navigate(`/documents/${response.data.documentId}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError(error.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!canUpload() && uploadedFiles.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You have reached your monthly validation limit ({user?.validationsThisMonth}/{user?.tierLimits?.validationsPerMonth}).
          Please upgrade your plan to continue validating documents.
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/subscription')}
        >
          Upgrade Plan
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Upload Document for Validation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload your Power of Attorney document to validate compliance with California Probate Code.
      </Typography>

      {/* Usage Information */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Current Plan: <strong>{user?.tier?.toUpperCase()}</strong> | 
          Validations Used: <strong>{user?.validationsThisMonth}/{user?.tierLimits?.validationsPerMonth === -1 ? '∞' : user?.tierLimits?.validationsPerMonth}</strong>
          {user?.tierLimits?.batchProcessing && ' | Batch Processing: Enabled'}
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Upload Area */}
        <Grid item xs={12} md={8}>
          <Paper
            {...getRootProps()}
            sx={{
              p: 4,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              backgroundColor: isDragActive ? 'primary.50' : 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.50'
              }
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop PDF files here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              or click to browse files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Maximum file size: 10MB | Accepted format: PDF only
              {user?.tierLimits?.batchProcessing && ' | Batch upload available'}
            </Typography>
          </Paper>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Files to Upload ({uploadedFiles.length})
              </Typography>
              {uploadedFiles.map(({ file, id }) => (
                <Paper key={id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center' }}>
                  <PdfIcon sx={{ mr: 2, color: 'error.main' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1">{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => removeFile(id)}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                </Paper>
              ))}
            </Box>
          )}
        </Grid>

        {/* Form Fields */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            
            <TextField
              fullWidth
              label="Case ID (Optional)"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              helperText="For funeral home case management integration"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              helperText="Any additional notes about this document"
              sx={{ mb: 3 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={uploading ? null : <UploadIcon />}
              onClick={uploadFiles}
              disabled={uploading || uploadedFiles.length === 0}
            >
              {uploading ? 'Uploading...' : 'Start Validation'}
            </Button>

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Uploading and starting validation process...
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Information Panel */}
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              What We Validate
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip icon={<CheckIcon />} label="Notary Acknowledgment" color="primary" variant="outlined" />
              <Chip icon={<CheckIcon />} label="Witness Signatures" color="primary" variant="outlined" />
              <Chip icon={<CheckIcon />} label="Required Verbiage" color="primary" variant="outlined" />
              <Chip icon={<CheckIcon />} label="Cremation Authority" color="primary" variant="outlined" />
              <Chip icon={<CheckIcon />} label="California Compliance" color="primary" variant="outlined" />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentUpload;
