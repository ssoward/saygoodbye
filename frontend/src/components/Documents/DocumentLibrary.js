import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem as MenuItemAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Pagination,
  LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';

const DocumentLibrary = () => {
  const { showNotification } = useNotification();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, document: null });

  useEffect(() => {
    fetchDocuments();
  }, [page, searchTerm, statusFilter, sortBy]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sort: sortBy,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await api.get(`/documents?${params}`);
      setDocuments(response.data.documents);
      setTotalPages(Math.ceil(response.data.total / 10));
    } catch (error) {
      console.error('Error fetching documents:', error);
      showNotification('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (document) => {
    try {
      const response = await api.get(`/documents/${document._id}/report`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${document.originalName}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('Report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading report:', error);
      showNotification('Failed to download report', 'error');
    }
    handleCloseMenu();
  };

  const handleDeleteDocument = async () => {
    try {
      await api.delete(`/documents/${deleteDialog.document._id}`);
      showNotification('Document deleted successfully', 'success');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification('Failed to delete document', 'error');
    }
    setDeleteDialog({ open: false, document: null });
  };

  const handleMenuClick = (event, document) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'fail':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <ScheduleIcon color="info" />;
      default:
        return <DescriptionIcon color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return 'success';
      case 'warning':
        return 'warning';
      case 'fail':
        return 'error';
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  const getValidationSummary = (validationResults) => {
    if (!validationResults) return 'Pending validation';
    
    const { notaryValidation, witnessValidation, verbiageValidation } = validationResults;
    const passCount = [notaryValidation, witnessValidation, verbiageValidation]
      .filter(result => result?.status === 'pass').length;
    
    return `${passCount}/3 checks passed`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFilterControls = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="pass">Valid</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="fail">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="createdAt">Date Created</MenuItem>
                <MenuItem value="originalName">Name</MenuItem>
                <MenuItem value="fileSize">File Size</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={fetchDocuments}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderDocumentTable = () => {
    if (documents.length === 0) {
      return (
        <Card>
          <CardContent>
            <Alert severity="info">
              No documents found. {searchTerm ? 'Try adjusting your search criteria.' : 'Upload your first document to get started.'}
            </Alert>
            {!searchTerm && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button variant="contained" href="/validate">
                  Upload First Document
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Validation Summary</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Upload Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
                        {doc.originalName}
                      </Typography>
                      {doc.caseId && (
                        <Typography variant="caption" color="text.secondary">
                          Case: {doc.caseId}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getStatusIcon(doc.validationResults?.overallStatus || doc.status)}
                    <Chip
                      label={doc.validationResults?.overallStatus || doc.status}
                      color={getStatusColor(doc.validationResults?.overallStatus || doc.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {getValidationSummary(doc.validationResults)}
                  </Typography>
                  {doc.validationResults?.ocrConfidence && (
                    <Typography variant="caption" color="text.secondary">
                      OCR: {doc.validationResults.ocrConfidence}% confidence
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatFileSize(doc.fileSize)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(doc.createdAt).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, doc)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Document Library
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage and review your POA validation history
        </Typography>
      </Box>

      {renderFilterControls()}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {renderDocumentTable()}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
      >
        <MenuItemAction
          onClick={() => window.open(`/documents/${selectedDocument?._id}`, '_blank')}
        >
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItemAction>
        {selectedDocument?.validationResults && (
          <MenuItemAction
            onClick={() => handleDownloadReport(selectedDocument)}
          >
            <DownloadIcon sx={{ mr: 1 }} />
            Download Report
          </MenuItemAction>
        )}
        <MenuItemAction
          onClick={() => {
            setDeleteDialog({ open: true, document: selectedDocument });
            handleCloseMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItemAction>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, document: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.document?.originalName}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, document: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteDocument} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentLibrary;
