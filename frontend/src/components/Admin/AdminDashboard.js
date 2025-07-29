import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  People as UsersIcon,
  Description as DocumentsIcon,
  TrendingUp as RevenueIcon,
  CheckCircle as ValidIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ProcessingIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import moment from 'moment';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  
  const [stats, setStats] = useState({
    users: { total: 0 },
    documents: { total: 0 },
    revenue: { total: 0 },
    validations: { total: 0, successRate: 0 },
    tiers: {},
    validationResults: {}
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse, documentsResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-users'),
        api.get('/admin/recent-documents')
      ]);
      
      setStats(statsResponse.data || {
        users: { total: 0 },
        documents: { total: 0 },
        revenue: { total: 0 },
        validations: { total: 0, successRate: 0 },
        tiers: {},
        validationResults: {}
      });
      setRecentUsers(usersResponse.data?.users || []);
      setRecentDocuments(documentsResponse.data?.documents || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      showError('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <ValidIcon sx={{ color: 'success.main' }} />;
      case 'processing':
        return <ProcessingIcon sx={{ color: 'info.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <DocumentsIcon sx={{ color: 'text.secondary' }} />;
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

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading admin dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        System overview and management tools
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <UsersIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats?.users.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +{stats?.users.thisMonth || 0} this month
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DocumentsIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="secondary">
                    {stats?.documents.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Documents Processed
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +{stats?.documents.thisMonth || 0} this month
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <RevenueIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    ${stats?.revenue.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Revenue (MTD)
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {stats?.revenue.growth || 0}% growth
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ValidIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {stats?.validations.successRate || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats?.validations.total || 0} total validations
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* User Tier Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Tier Distribution
              </Typography>
              
              {stats?.tiers && (
                <Box>
                  {Object.entries(stats?.tiers || {}).map(([tier, count]) => (
                    <Box key={tier} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {tier}
                        </Typography>
                        <Typography variant="body2">
                          {count} users
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={stats?.users?.total ? (count / stats.users.total) * 100 : 0}
                        color={getTierColor(tier)}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Validation Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Validation Results (This Month)
              </Typography>
              
              {stats?.validationResults && (
                <Grid container spacing={2}>
                  {Object.entries(stats?.validationResults || {}).map(([status, count]) => (
                    <Grid item xs={6} key={status}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        {getStatusIcon(status)}
                        <Typography variant="h5" sx={{ mt: 1 }}>
                          {count}
                        </Typography>
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                          {status}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Users */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent User Registrations
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Tier</TableCell>
                      <TableCell>Joined</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.tier?.toUpperCase() || 'FREE'}
                            color={getTierColor(user.tier)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {moment(user.createdAt).fromNow()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Document Validations
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Document</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Processed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentDocuments.map((doc) => (
                      <TableRow key={doc._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" noWrap>
                              {doc.filename}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              by {doc.user?.firstName} {doc.user?.lastName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(doc.status)}
                            <Typography variant="caption" sx={{ ml: 1, textTransform: 'capitalize' }}>
                              {doc.status}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {moment(doc.createdAt).fromNow()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {stats?.system?.uptime || '99.9'}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Uptime (30 days)
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {stats?.system?.avgProcessingTime || '2.3'}s
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Processing Time
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {stats?.system?.pendingJobs || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Jobs
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {stats?.system?.failedJobs || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed Jobs (24h)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
