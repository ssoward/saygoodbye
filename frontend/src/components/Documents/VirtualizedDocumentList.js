import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { useQuery, useInfiniteQuery } from 'react-query';
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

const ITEM_HEIGHT = 120; // Height of each document card in virtual list
const CONTAINER_HEIGHT = 600; // Height of the virtualized container

// Optimized Document Row Component for Virtual Scrolling
const DocumentRow = React.memo(({ index, style, data }) => {
  const { documents, selectedDocuments, onSelect, onView, onDownloadReport, getStatusIcon, getStatusColor } = data;
  const document = documents[index];
  const navigate = useNavigate();

  if (!document) {
    return (
      <div style={style}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rectangular" height={100} />
        </Box>
      </div>
    );
  }

  const isSelected = selectedDocuments.has(document._id);

  return (
    <div style={style}>
      <Box sx={{ p: 1 }}>
        <Card 
          sx={{ 
            height: ITEM_HEIGHT - 16, 
            display: 'flex', 
            flexDirection: 'row',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            cursor: 'pointer',
            '&:hover': { boxShadow: 2 }
          }}
          onClick={() => onSelect(document._id)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
            <Checkbox 
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(document._id);
              }}
            />
          </Box>
          
          <CardContent sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              {getStatusIcon(document.status)}
            </Box>
            
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap sx={{ fontSize: '1rem' }}>
                {document.filename || document.originalName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {moment(document.createdAt || document.uploadedAt).format('MMM DD, YYYY HH:mm')}
                {document.caseId && ` • Case: ${document.caseId}`}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={document.status}
                color={getStatusColor(document.status)}
                size="small"
              />
              
              <Button
                size="small"
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onView(document._id);
                }}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                View
              </Button>
              
              {document.status === 'completed' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadReport(document._id);
                  }}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Report
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </div>
  );
});

const VirtualizedDocumentList = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());

  // React Query for infinite document loading with caching
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery(
    ['documents', searchTerm, filter],
    async ({ pageParam = null }) => {
      const response = await api.get('/documents', {
        params: {
          cursor: pageParam,
          limit: 50,
          search: searchTerm || undefined,
          status: filter !== 'all' ? filter : undefined
        }
      });
      return response.data;
    },
    {
      getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor || undefined,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      keepPreviousData: true
    }
  );

  // Flatten all documents from all pages
  const allDocuments = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.documents || []);
  }, [data]);

  const totalItemCount = hasNextPage ? allDocuments.length + 1 : allDocuments.length;

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  // Check if item is loaded
  const isItemLoaded = useCallback((index) => {
    return !!allDocuments[index];
  }, [allDocuments]);

  // Load more items when scrolling
  const loadMoreItems = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      return fetchNextPage();
    }
    return Promise.resolve();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (filterValue) => {
    setFilter(filterValue);
    handleFilterClose();
  };

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
    if (selectedDocuments.size === allDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(allDocuments.map(doc => doc._id)));
    }
  }, [allDocuments, selectedDocuments.size]);

  const handleViewDocument = useCallback((documentId) => {
    if (documentId && documentId !== 'undefined') {
      navigate(`/documents/${documentId}`);
    } else {
      showError('Invalid document ID');
    }
  }, [navigate, showError]);

  const handleDownloadReport = useCallback(async (documentId) => {
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
  }, [showError, showSuccess]);

  // Bulk operations
  const handleBulkAction = async (action, params = {}) => {
    if (selectedDocuments.size === 0) {
      showError('Please select documents first');
      return;
    }

    try {
      const response = await api.post('/documents/bulk-action', {
        action,
        documentIds: Array.from(selectedDocuments),
        ...params
      });

      if (response.data.success) {
        showSuccess(`${action} completed for ${selectedDocuments.size} documents`);
        setSelectedDocuments(new Set());
        refetch(); // Refresh the data
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showError(`Failed to ${action} selected documents`);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedDocuments.size} selected documents? This action cannot be undone.`)) {
      handleBulkAction('delete');
    }
  };

  // Data object for virtual list
  const itemData = useMemo(() => ({
    documents: allDocuments,
    selectedDocuments,
    onSelect: handleSelectDocument,
    onView: handleViewDocument,
    onDownloadReport: handleDownloadReport,
    getStatusIcon,
    getStatusColor
  }), [allDocuments, selectedDocuments, handleSelectDocument, handleViewDocument, handleDownloadReport]);

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  if (status === 'loading') {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading documents...</Typography>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading documents: {error?.message || 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          My Documents ({allDocuments.length}{hasNextPage ? '+' : ''})
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
              onChange={(e) => debouncedSearch(e.target.value)}
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
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedDocuments.size === allDocuments.length && allDocuments.length > 0}
                  indeterminate={selectedDocuments.size > 0 && selectedDocuments.size < allDocuments.length}
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
                onClick={() => handleBulkAction('exportData')}
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

      {/* Performance Stats */}
      {isFetching && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isFetchingNextPage ? 'Loading more documents...' : 'Searching...'}
          </Typography>
        </Box>
      )}

      {/* Virtualized Document List */}
      {allDocuments.length === 0 ? (
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
        <Paper sx={{ height: CONTAINER_HEIGHT, overflow: 'hidden' }}>
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={totalItemCount}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={CONTAINER_HEIGHT}
                itemCount={totalItemCount}
                itemSize={ITEM_HEIGHT}
                itemData={itemData}
                onItemsRendered={onItemsRendered}
                overscanCount={5} // Render 5 extra items for smooth scrolling
              >
                {DocumentRow}
              </List>
            )}
          </InfiniteLoader>
        </Paper>
      )}

      {/* Performance Info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          📊 Performance: Rendering {Math.min(allDocuments.length, Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT))} of {allDocuments.length} documents in DOM
          {hasNextPage && ' • More documents available on scroll'}
        </Typography>
      </Box>
    </Box>
  );
};

export default VirtualizedDocumentList;
