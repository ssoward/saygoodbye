import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  LinearProgress,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  GetApp as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Description as DocumentIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as NotaryIcon,
  People as WitnessIcon,
  TextFields as VerbiageIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import { downloadFromResponse, safeDownload } from '../../utils/downloadUtils';
import moment from 'moment';

const DocumentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    // Validate ID parameter before making API call
    if (!id || id === 'undefined' || id === 'null') {
      console.error('Invalid document ID:', id);
      showError('Invalid document ID provided');
      navigate('/documents');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/documents/${id}`);
      setDocument(response.data);
    } catch (error) {
      console.error('Error fetching document:', error);
      showError('Failed to load document details');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'processing':
        return <ScheduleIcon sx={{ color: 'info.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <DocumentIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'warning': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const handleDownloadReport = async () => {
    await safeDownload(
      async () => {
        const response = await api.get(`/documents/${id}/report`, {
          responseType: 'blob'
        });
        downloadFromResponse(response, `validation-report-${id}.pdf`);
      },
      () => showSuccess('Report downloaded successfully'),
      () => showError('Failed to download report')
    );
  };

  const handleDownloadOriginal = async () => {
    await safeDownload(
      async () => {
        const response = await api.get(`/documents/${id}/download`, {
          responseType: 'blob'
        });
        downloadFromResponse(response, document.filename || 'document.pdf');
      },
      () => showSuccess('Document downloaded successfully'),
      () => showError('Failed to download document')
    );
  };

  const renderValidationResult = (title, result, icon) => {
    if (!result) return null;

    const { passed, confidence, details, issues } = result;

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
              {title}
            </Typography>
            <Chip
              label={passed ? 'PASSED' : 'FAILED'}
              color={passed ? 'success' : 'error'}
              size="small"
            />
          </Box>

          {confidence && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Confidence: {Math.round(confidence * 100)}%
            </Typography>
          )}

          {details && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              {details}
            </Typography>
          )}

          {issues && issues.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Issues Found:
              </Typography>
              <List dense>
                {issues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <ErrorIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={issue} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading document details...</Typography>
      </Box>
    );
  }

  if (!document) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Document not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/documents')}
          sx={{ mr: 2 }}
        >
          Back to Documents
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" gutterBottom>
            Document Details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadOriginal}
          >
            Download Original
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadReport}
            disabled={document.status !== 'completed'}
          >
            Download Report
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Document Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Information
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Filename:</strong></TableCell>
                      <TableCell>{document.filename}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Status:</strong></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getStatusIcon(document.status)}
                          <Chip
                            label={document.status}
                            color={getStatusColor(document.status)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Uploaded:</strong></TableCell>
                      <TableCell>{moment(document.createdAt).format('MMMM DD, YYYY HH:mm')}</TableCell>
                    </TableRow>
                    {document.caseId && (
                      <TableRow>
                        <TableCell><strong>Case ID:</strong></TableCell>
                        <TableCell>{document.caseId}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell><strong>File Size:</strong></TableCell>
                      <TableCell>{(document.fileSize / 1024).toFixed(2)} KB</TableCell>
                    </TableRow>
                    {document.processingTime && (
                      <TableRow>
                        <TableCell><strong>Processing Time:</strong></TableCell>
                        <TableCell>{document.processingTime}ms</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {document.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Notes:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {document.notes}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Validation Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Validation Summary
              </Typography>
              
              {document.validationResults ? (
                <Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <NotaryIcon sx={{ fontSize: 32, color: document.validationResults.notary?.passed ? 'success.main' : 'error.main', mb: 1 }} />
                        <Typography variant="body2">Notary</Typography>
                        <Chip
                          label={document.validationResults.notary?.passed ? 'PASS' : 'FAIL'}
                          color={document.validationResults.notary?.passed ? 'success' : 'error'}
                          size="small"
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <WitnessIcon sx={{ fontSize: 32, color: document.validationResults.witness?.passed ? 'success.main' : 'error.main', mb: 1 }} />
                        <Typography variant="body2">Witness</Typography>
                        <Chip
                          label={document.validationResults.witness?.passed ? 'PASS' : 'FAIL'}
                          color={document.validationResults.witness?.passed ? 'success' : 'error'}
                          size="small"
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <VerbiageIcon sx={{ fontSize: 32, color: document.validationResults.verbiage?.passed ? 'success.main' : 'error.main', mb: 1 }} />
                        <Typography variant="body2">Verbiage</Typography>
                        <Chip
                          label={document.validationResults.verbiage?.passed ? 'PASS' : 'FAIL'}
                          color={document.validationResults.verbiage?.passed ? 'success' : 'error'}
                          size="small"
                        />
                      </Paper>
                    </Grid>
                  </Grid>

                  <Typography variant="body2" color="text.secondary">
                    Overall Score: {[
                      document.validationResults.notary?.passed,
                      document.validationResults.witness?.passed,
                      document.validationResults.verbiage?.passed
                    ].filter(Boolean).length}/3 validations passed
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  {document.status === 'processing' 
                    ? 'Validation is currently in progress. Results will appear here when complete.'
                    : 'No validation results available.'
                  }
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Validation Results */}
        {document.validationResults && (
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Detailed Validation Results
            </Typography>
            
            {renderValidationResult(
              'Notary Acknowledgment',
              document.validationResults.notary,
              <NotaryIcon color="primary" />
            )}
            
            {renderValidationResult(
              'Witness Signatures',
              document.validationResults.witness,
              <WitnessIcon color="primary" />
            )}
            
            {renderValidationResult(
              'Required Verbiage',
              document.validationResults.verbiage,
              <VerbiageIcon color="primary" />
            )}
          </Grid>
        )}

        {/* Processing History */}
        {document.processingHistory && document.processingHistory.length > 0 && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Processing History</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {document.processingHistory.map((entry, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={entry.step}
                        secondary={`${entry.status} - ${moment(entry.timestamp).format('MMM DD, YYYY HH:mm:ss')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DocumentDetails;
