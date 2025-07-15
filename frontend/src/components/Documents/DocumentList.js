import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
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
  Paper,
  Checkbox,
  FormControlLabel,
  Stack,
  Skeleton
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
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);

  // Debounced search for better performance
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      setPage(1);
      setNextCursor(null);
      fetchDocuments(true, term);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    fetchDocuments();
  }, [page, filter]);

  const fetchDocuments = async (reset = false, searchOverride = null) => {
    try {
      setLoading(true);
      const response = await api.get('/documents', {
        params: {
          page: reset ? 1 : page,
          limit: 50, // Increased for better performance
          search: searchOverride !== null ? searchOverride : searchTerm,
          status: filter !== 'all' ? filter : undefined,
          cursor: reset ? null : nextCursor
        }
      });
      
      const newDocuments = response.data.documents;
      
      if (reset) {
        setDocuments(newDocuments);
        setPage(1);
      } else {
        setDocuments(prev => page === 1 ? newDocuments : [...prev, ...newDocuments]);
      }
      
      setTotalPages(response.data.pagination.pages || 1);
      setHasMore(response.data.pagination.hasMore || false);
      setNextCursor(response.data.pagination.nextCursor);
      setSelectedDocuments(new Set()); // Clear selection on new data
      
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

  // Enhanced selection management
  const handleSelectDocument = useCallback((documentId) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc._id)));
    }
  }, [documents, selectedDocuments.size]);

  // Bulk operations
  const handleBulkAction = async (action, params = {}) => {
    if (selectedDocuments.size === 0) {
      showError('Please select documents first');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/documents/bulk-action', {
        action,
        documentIds: Array.from(selectedDocuments),
        ...params
      });

      if (response.data.success) {
        showSuccess(`${action} completed for ${selectedDocuments.size} documents`);
        setSelectedDocuments(new Set());
        fetchDocuments(true); // Refresh the list
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} selected documents`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedDocuments.size} selected documents? This action cannot be undone.`)) {
      handleBulkAction('delete');
    }
  };

  const handleBulkExport = () => {
    handleBulkAction('exportData').then(() => {
      // Could trigger download of export file
      showSuccess('Export data prepared successfully');
    });
  };

  // Load more documents for infinite scroll
  const loadMoreDocuments = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

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

      {/* Enhanced Search, Filter, and Bulk Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleFilterClick}
            >
              Filter: {filter === 'all' ? 'All Documents' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedDocuments.size === documents.length && documents.length > 0}
                  indeterminate={selectedDocuments.size > 0 && selectedDocuments.size < documents.length}
                  onChange={handleSelectAll}
                />
              }
              label={`Select All (${selectedDocuments.size})`}
            />
          </Grid>
        </Grid>

        {/* Bulk Actions Bar */}
        {selectedDocuments.size > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="primary">
                {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={handleBulkDelete}
              >
                Delete Selected
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleBulkExport}
              >
                Export Selected
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => setSelectedDocuments(new Set())}
              >
                Clear Selection
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
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
