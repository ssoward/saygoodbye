import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Pagination,
  LinearProgress,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import moment from 'moment';

const UserManagement = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, user: null });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, page, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: 10,
          search: searchTerm
        }
      });
      
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'free': return 'default';
      case 'professional': return 'primary';
      case 'enterprise': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'deleted': return 'error';
      default: return 'default';
    }
  };

  const handleActionClick = (event, user) => {
    setSelectedUser(user);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
    setSelectedUser(null);
  };

  const handleAction = (action) => {
    if (!selectedUser) return;
    
    setConfirmDialog({
      open: true,
      action,
      user: selectedUser
    });
    handleActionClose();
  };

  const confirmAction = async () => {
    const { action, user: targetUser } = confirmDialog;
    
    try {
      let endpoint = '';
      let method = 'put';
      let successMessage = '';

      switch (action) {
        case 'suspend':
          endpoint = `/api/admin/users/${targetUser._id}/suspend`;
          successMessage = 'User suspended successfully';
          break;
        case 'activate':
          endpoint = `/api/admin/users/${targetUser._id}/activate`;
          successMessage = 'User activated successfully';
          break;
        case 'delete':
          endpoint = `/api/admin/users/${targetUser._id}`;
          method = 'delete';
          successMessage = 'User deleted successfully';
          break;
        default:
          return;
      }

      await axios[method](endpoint);
      showSuccess(successMessage);
      fetchUsers();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showError(error.response?.data?.error || `Failed to ${action} user`);
    }
    
    setConfirmDialog({ open: false, action: null, user: null });
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const sendEmail = async (userId, type) => {
    try {
      await api.post(`/api/admin/users/${userId}/email`, { type });
      showSuccess('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      showError('Failed to send email');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  if (loading && users.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading users...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage user accounts, subscriptions, and permissions
      </Typography>

      <Card>
        <CardContent>
          {/* Search */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search users by name, email, or organization..."
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
          </Box>

          {/* Users Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Usage</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {userItem.firstName?.charAt(0)}{userItem.lastName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {userItem.firstName} {userItem.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {userItem.email}
                          </Typography>
                          {userItem.organization && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {userItem.organization}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={userItem.tier?.toUpperCase() || 'FREE'}
                        color={getTierColor(userItem.tier)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={userItem.status || 'active'}
                        color={getStatusColor(userItem.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {userItem.validationsThisMonth || 0} validations
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userItem.totalDocuments || 0} total documents
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {moment(userItem.createdAt).format('MMM DD, YYYY')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {moment(userItem.createdAt).fromNow()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleActionClick(e, userItem)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
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
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => handleAction('edit')} disabled>
          <EditIcon sx={{ mr: 1 }} />
          Edit User
        </MenuItem>
        <MenuItem onClick={() => sendEmail(selectedUser?._id, 'welcome')}>
          <EmailIcon sx={{ mr: 1 }} />
          Send Welcome Email
        </MenuItem>
        {selectedUser?.status !== 'suspended' ? (
          <MenuItem onClick={() => handleAction('suspend')}>
            <BlockIcon sx={{ mr: 1 }} />
            Suspend Account
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleAction('activate')}>
            <ActivateIcon sx={{ mr: 1 }} />
            Activate Account
          </MenuItem>
        )}
        <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete User
        </MenuItem>
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, user: null })}>
        <DialogTitle>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          {confirmDialog.user && (
            <Box>
              <Typography gutterBottom>
                Are you sure you want to {confirmDialog.action} the account for{' '}
                <strong>{confirmDialog.user.firstName} {confirmDialog.user.lastName}</strong>?
              </Typography>
              
              {confirmDialog.action === 'delete' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This action cannot be undone. All user data will be permanently deleted.
                </Alert>
              )}
              
              {confirmDialog.action === 'suspend' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  The user will not be able to access their account until reactivated.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, user: null })}>
            Cancel
          </Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'}
          >
            Confirm {confirmDialog.action}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
