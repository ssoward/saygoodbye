import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  Alert,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Description as DocumentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import { downloadFromResponse, safeDownload } from '../../utils/downloadUtils';
import moment from 'moment';

const DocumentList = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [page, filter, searchTerm]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents', {
        params: {
          page,
          limit: 10,
          search: searchTerm,
          status: filter !== 'all' ? filter : undefined
        }
      });
      
      setDocuments(response.data.documents);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showError('Failed to load documents');
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

  const getValidationScore = (validationResults) => {
    if (!validationResults) return 'N/A';
    const { notary, witness, verbiage } = validationResults;
    const total = (notary?.passed ? 1 : 0) + (witness?.passed ? 1 : 0) + (verbiage?.passed ? 1 : 0);
    return `${total}/3`;
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (filterValue) => {
    setFilter(filterValue);
    setPage(1);
    handleFilterClose();
  };

  const handleDownloadReport = async (documentId) => {
    if (!documentId || documentId === 'undefined') {
      showError('Invalid document ID');
      return;
    }
    
    await safeDownload(
      async () => {
        const response = await api.get(`/documents/${documentId}/report`, {
          responseType: 'blob'
        });
        downloadFromResponse(response, `validation-report-${documentId}.pdf`);
      },
      () => showSuccess('Report downloaded successfully'),
      () => showError('Failed to download report')
    );
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  if (loading && documents.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading documents...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Documents
        </Typography>
        <Button
          variant="contained"
          startIcon={<DocumentIcon />}
          onClick={() => navigate('/documents/upload')}
        >
          Upload New Document
        </Button>
      </Box>

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search documents by filename, case ID, or notes..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleFilterClick}
            >
              Filter: {filter === 'all' ? 'All Documents' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={handleFilterClose}
            >
              <MenuItem onClick={() => handleFilterSelect('all')}>All Documents</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('completed')}>Completed</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('processing')}>Processing</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('warning')}>Warnings</MenuItem>
              <MenuItem onClick={() => handleFilterSelect('failed')}>Failed</MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </Paper>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first document to get started'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<DocumentIcon />}
            onClick={() => navigate('/documents/upload')}
          >
            Upload First Document
          </Button>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            {documents.map((document) => (
              <Grid item xs={12} md={6} lg={4} key={document._id || `doc-${Math.random()}`}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getStatusIcon(document.status)}
                      <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }} noWrap>
                        {document.filename}
                      </Typography>
                      <Chip
                        label={document.status}
                        color={getStatusColor(document.status)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Uploaded: {moment(document.createdAt).format('MMM DD, YYYY HH:mm')}
                    </Typography>

                    {document.caseId && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Case ID: {document.caseId}
                      </Typography>
                    )}

                    {document.validationResults && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Validation Score: {getValidationScore(document.validationResults)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label="Notary"
                            color={document.validationResults.notary?.passed ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label="Witness"
                            color={document.validationResults.witness?.passed ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label="Verbiage"
                            color={document.validationResults.verbiage?.passed ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    )}

                    {document.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Notes: {document.notes}
                      </Typography>
                    )}
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={() => {
                            if (document._id && document._id !== 'undefined') {
                              navigate(`/documents/${document._id}`);
                            } else {
                              showError('Invalid document ID');
                            }
                          }}
                        >
                          View Details
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={() => {
                            if (document._id && document._id !== 'undefined') {
                              handleDownloadReport(document._id);
                            } else {
                              showError('Invalid document ID');
                            }
                          }}
                          disabled={document.status !== 'completed'}
                        >
                          Report
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default DocumentList;
