import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Save as SaveIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import moment from 'moment';

const validationSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  organization: Yup.string(),
  phone: Yup.string()
    .matches(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number')
});

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      organization: user?.organization || '',
      phone: user?.phone || ''
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const response = await api.put('/users/profile', values);
        updateUser(response.data);
        setEditing(false);
        showSuccess('Profile updated successfully');
      } catch (error) {
        console.error('Error updating profile:', error);
        showError(error.response?.data?.error || 'Failed to update profile');
      } finally {
        setLoading(false);
      }
    }
  });

  const getTierColor = (tier) => {
    switch (tier) {
      case 'free': return 'default';
      case 'professional': return 'primary';
      case 'enterprise': return 'secondary';
      default: return 'default';
    }
  };

  const getTierLimits = () => {
    if (!user?.tierLimits) return [];
    
    const limits = user.tierLimits;
    return [
      {
        feature: 'Validations per Month',
        limit: limits.validationsPerMonth === -1 ? 'Unlimited' : limits.validationsPerMonth
      },
      {
        feature: 'Batch Processing',
        limit: limits.batchProcessing ? 'Enabled' : 'Disabled'
      },
      {
        feature: 'Priority Support',
        limit: limits.prioritySupport ? 'Enabled' : 'Disabled'
      },
      {
        feature: 'Custom Reports',
        limit: limits.customReports ? 'Enabled' : 'Disabled'
      },
      {
        feature: 'API Access',
        limit: limits.apiAccess ? 'Enabled' : 'Disabled'
      }
    ];
  };

  const handleCancel = () => {
    formik.resetForm();
    setEditing(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Personal Information
                </Typography>
                {!editing && (
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>

              <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="firstName"
                      value={formik.values.firstName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                      helperText={formik.touched.firstName && formik.errors.firstName}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="lastName"
                      value={formik.values.lastName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                      helperText={formik.touched.lastName && formik.errors.lastName}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.email && Boolean(formik.errors.email)}
                      helperText={formik.touched.email && formik.errors.email}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Organization"
                      name="organization"
                      value={formik.values.organization}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.organization && Boolean(formik.errors.organization)}
                      helperText={formik.touched.organization && formik.errors.organization}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <BusinessIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      name="phone"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.phone && Boolean(formik.errors.phone)}
                      helperText={formik.touched.phone && formik.errors.phone}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <PhoneIcon color="action" sx={{ mr: 1 }} />
                      }}
                    />
                  </Grid>
                </Grid>

                {editing && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    margin: '0 auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2rem'
                  }}
                >
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Avatar>
                <Typography variant="h6">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.tier?.toUpperCase() || 'FREE'}
                  color={getTierColor(user?.tier)}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Member since:</strong> {moment(user?.createdAt).format('MMMM YYYY')}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Role:</strong> {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                <strong>Validations this month:</strong> {user?.validationsThisMonth || 0}
              </Typography>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Plan Features
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Feature</TableCell>
                      <TableCell align="right">Limit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getTierLimits().map((item, index) => (
                      <TableRow key={index}>
                        <TableCell component="th" scope="row">
                          {item.feature}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.limit}
                            size="small"
                            color={item.limit === 'Enabled' || item.limit === 'Unlimited' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => window.location.href = '/subscription'}
              >
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Settings
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                For security reasons, password changes require email verification.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled
                  >
                    Change Password
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled
                  >
                    Enable Two-Factor Auth
                  </Button>
                </Grid>
              </Grid>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Security features will be available in a future update.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
