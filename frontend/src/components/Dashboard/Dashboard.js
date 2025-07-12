import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentsIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      showError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = () => {
    if (!stats || !user || !user.tierLimits || !stats.validations) return 0;
    const limits = user.tierLimits;
    if (limits.validationsPerMonth === -1) return 0; // Unlimited
    return (stats.validations.thisMonth / limits.validationsPerMonth) * 100;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  if (loading || !user) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  const usagePercentage = getUsagePercentage();

  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your document validation activity.
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/documents/upload')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Upload Document
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Validate a new POA document
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/documents')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <DocumentsIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                My Documents
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View validation history
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/subscription')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Upgrade Plan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unlock more features
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Statistics Grid */}
      <Grid container spacing={3}>
        {/* Usage Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Usage
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {user?.role === 'admin' ? 'UNLIMITED (Admin)' : 'Validations Used'}
                  </Typography>
                  <Typography variant="body2">
                    {user?.role === 'admin' ? '∞' : `${stats?.validations.thisMonth || 0} / ${user?.tierLimits?.validationsPerMonth === -1 ? '∞' : user?.tierLimits?.validationsPerMonth || 0}`}
                  </Typography>
                </Box>
                {user?.tierLimits?.validationsPerMonth !== -1 && (
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(usagePercentage, 100)}
                    color={usagePercentage > 80 ? 'warning' : 'primary'}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={user?.tier?.toUpperCase() || 'FREE'} 
                  color="primary" 
                  size="small" 
                />
                {user?.role === 'admin' && (
                  <Chip 
                    label="ADMIN" 
                    color="error" 
                    size="small" 
                    variant="outlined"
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Document Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats?.documents.total || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Documents
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {stats?.documents.completed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Validation Results */}
        {stats?.results && Object.keys(stats.results).length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Validation Results
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(stats.results).map(([status, count]) => (
                    <Grid item xs={12} sm={6} md={3} key={status}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        {status === 'pass' && <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />}
                        {status === 'fail' && <ErrorIcon sx={{ fontSize: 32, color: 'error.main', mb: 1 }} />}
                        {status === 'warning' && <WarningIcon sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />}
                        <Typography variant="h4" gutterBottom>
                          {count}
                        </Typography>
                        <Chip 
                          label={status.toUpperCase()} 
                          color={getStatusColor(status)}
                          size="small"
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Getting Started */}
        {(!stats || stats.documents.total === 0) && (
          <Grid item xs={12}>
            <Card sx={{ border: '2px dashed', borderColor: 'primary.main', backgroundColor: 'primary.50' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Get Started with Document Validation
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Upload your first Power of Attorney document to begin validation
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<UploadIcon />}
                  onClick={() => navigate('/documents/upload')}
                >
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;
