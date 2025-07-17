import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TextFields as TextIcon,
  Assessment as AssessmentIcon,
  QrCode as QrCodeIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

const ScannedDocumentViewer = ({ documentId, onClose }) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    loadDocumentDetails();
  }, [documentId]);

  const loadDocumentDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/scanned-documents/${documentId}/details`);
      setDocument(response.data.document);
      setTempNotes(response.data.document.notes || '');
    } catch (error) {
      console.error('Failed to load document details:', error);
      setError('Failed to load document details');
      toast.error('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    try {
      await axios.put(`/api/documents/${documentId}`, {
        notes: tempNotes
      });
      setDocument({ ...document, notes: tempNotes });
      setEditingNotes(false);
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const copyTextToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Text copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy text');
    });
  };

  const downloadExtractedText = () => {
    const blob = new Blob([document.extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.originalName}_extracted_text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'success';
    if (confidence >= 70) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading document details...</Typography>
      </Box>
    );
  }

  if (error || !document) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || 'Document not found'}
        </Alert>
        <Button onClick={onClose} sx={{ mt: 2 }}>
          Close
        </Button>
      </Box>
    );
  }

  const scannedData = document.scannedDocumentData;
  const ocrResults = scannedData?.ocrResults;
  const imageQuality = scannedData?.imageQuality;
  const qrCodes = scannedData?.qrCodes;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Scanned Document Details
        </Typography>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </Box>

      {/* Document Information */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Document Information</Typography>
              <Typography><strong>Name:</strong> {document.originalName}</Typography>
              <Typography><strong>Size:</strong> {Math.round(document.fileSize / 1024)} KB</Typography>
              <Typography><strong>Type:</strong> {document.mimeType}</Typography>
              <Typography><strong>Uploaded:</strong> {new Date(document.createdAt).toLocaleString()}</Typography>
              <Typography><strong>Status:</strong> <Chip label={document.status} color="success" size="small" /></Typography>
              {document.caseId && (
                <Typography><strong>Case ID:</strong> {document.caseId}</Typography>
              )}
              {document.tags && document.tags.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography component="span"><strong>Tags:</strong> </Typography>
                  {document.tags.map((tag, index) => (
                    <Chip key={index} label={tag} size="small" sx={{ mr: 0.5 }} />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Notes</Typography>
                {!editingNotes ? (
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => setEditingNotes(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Box>
                    <Button
                      size="small"
                      startIcon={<SaveIcon />}
                      onClick={saveNotes}
                      sx={{ mr: 1 }}
                    >
                      Save
                    </Button>
                    <Button
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setEditingNotes(false);
                        setTempNotes(document.notes || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>
              {editingNotes ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Add notes about this document..."
                />
              ) : (
                <Typography variant="body2" color={document.notes ? 'text.primary' : 'text.secondary'}>
                  {document.notes || 'No notes added'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Processing Results */}
      <Grid container spacing={3}>
        {/* Image Quality Analysis */}
        {imageQuality && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  Image Quality
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${imageQuality.overallScore}% - ${getQualityScoreText(imageQuality.overallScore)}`}
                    color={getQualityScoreColor(imageQuality.overallScore)}
                    sx={{ mb: 1 }}
                  />
                </Box>

                <Typography variant="body2"><strong>Resolution:</strong> {imageQuality.resolution?.width} × {imageQuality.resolution?.height}</Typography>
                <Typography variant="body2"><strong>DPI:</strong> {imageQuality.resolution?.dpi}</Typography>
                <Typography variant="body2"><strong>Megapixels:</strong> {imageQuality.resolution?.megapixels?.toFixed(1)}</Typography>
                
                {imageQuality.quality && (
                  <>
                    <Typography variant="body2"><strong>Sharpness:</strong> {Math.round(imageQuality.quality.sharpness * 100)}%</Typography>
                    <Typography variant="body2"><strong>Contrast:</strong> {Math.round(imageQuality.quality.contrast * 100)}%</Typography>
                    <Typography variant="body2"><strong>Brightness:</strong> {Math.round(imageQuality.quality.brightness * 100)}%</Typography>
                  </>
                )}

                {imageQuality.recommendations && imageQuality.recommendations.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Recommendations:</Typography>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {imageQuality.recommendations.map((rec, index) => (
                        <li key={index} style={{ fontSize: '0.875rem' }}>{rec}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* OCR Results */}
        {ocrResults && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextIcon sx={{ mr: 1 }} />
                  Text Extraction (OCR)
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={`${Math.round(ocrResults.confidence)}% Confidence`}
                    color={getConfidenceColor(ocrResults.confidence)}
                    sx={{ mb: 1 }}
                  />
                </Box>

                <Typography variant="body2"><strong>Language:</strong> {ocrResults.language}</Typography>
                <Typography variant="body2"><strong>Processing Time:</strong> {ocrResults.processingTime}ms</Typography>
                <Typography variant="body2"><strong>Words Found:</strong> {ocrResults.wordCount}</Typography>
                <Typography variant="body2"><strong>Lines Found:</strong> {ocrResults.lineCount}</Typography>
                <Typography variant="body2"><strong>Text Length:</strong> {document.extractedText?.length || 0} characters</Typography>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => setShowTextDialog(true)}
                    disabled={!document.extractedText}
                  >
                    View Text
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CopyIcon />}
                    onClick={() => copyTextToClipboard(document.extractedText)}
                    disabled={!document.extractedText}
                  >
                    Copy
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={downloadExtractedText}
                    disabled={!document.extractedText}
                  >
                    Download
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* QR Codes */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <QrCodeIcon sx={{ mr: 1 }} />
                QR Codes & Links
              </Typography>
              
              {qrCodes && qrCodes.length > 0 ? (
                <List dense>
                  {qrCodes.map((qr, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <QrCodeIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={qr.type.toUpperCase()}
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              {qr.data}
                            </Typography>
                            {qr.confidence && (
                              <Chip 
                                label={`${Math.round(qr.confidence * 100)}% confidence`}
                                size="small"
                                color="primary"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No QR codes or links detected in this image.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Processing Metadata */}
      {scannedData?.processingMetadata && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Processing Metadata</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2">
                      <strong>Processed At:</strong> {new Date(scannedData.processingMetadata.processedAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Processing Version:</strong> {scannedData.processingMetadata.processingVersion}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Processing Time:</strong> {document.processingTime}ms
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {ocrResults?.words && ocrResults.words.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Word Detection Details:</Typography>
                        <Typography variant="body2">
                          Average Word Confidence: {Math.round(
                            ocrResults.words.reduce((sum, word) => sum + word.confidence, 0) / ocrResults.words.length
                          )}%
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Extracted Text Dialog */}
      <Dialog 
        open={showTextDialog} 
        onClose={() => setShowTextDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { maxHeight: '80vh' } }}
      >
        <DialogTitle>
          Extracted Text
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              startIcon={<CopyIcon />}
              onClick={() => copyTextToClipboard(document.extractedText)}
            >
              Copy All
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={downloadExtractedText}
            >
              Download
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            value={document.extractedText || 'No text extracted'}
            InputProps={{
              readOnly: true,
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.5
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTextDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScannedDocumentViewer;
