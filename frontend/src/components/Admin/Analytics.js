import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as UsersIcon,
  Description as DocumentsIcon,
  AttachMoney as RevenueIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import moment from 'moment';

const Analytics = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/analytics', {
        params: { timeRange }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getMetricIcon = (metric) => {
    switch (metric) {
      case 'users': return <UsersIcon />;
      case 'documents': return <DocumentsIcon />;
      case 'revenue': return <RevenueIcon />;
      case 'success_rate': return <SuccessIcon />;
      default: return <TrendingUpIcon />;
    }
  };

  const getMetricColor = (value) => {
    return value >= 0 ? 'success.main' : 'error.main';
  };

  const getTrendIcon = (value) => {
    return value >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />;
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
        <Typography sx={{ mt: 2 }}>Loading analytics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive insights and performance metrics
          </Typography>
        </Box>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="1y">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {analytics?.keyMetrics?.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.key}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getMetricIcon(metric.key)}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {metric.label}
                  </Typography>
                </Box>
                
                <Typography variant="h4" gutterBottom>
                  {metric.key === 'revenue' ? `$${formatNumber(metric.value)}` : formatNumber(metric.value)}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: getMetricColor(metric.change)
                  }}>
                    {getTrendIcon(metric.change)}
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {formatPercentage(metric.change)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    vs previous period
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* User Growth */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Growth by Tier
              </Typography>
              
              {analytics?.userGrowth?.map((tier) => (
                <Box key={tier.tier} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {tier.tier}
                    </Typography>
                    <Typography variant="body2">
                      {tier.count} users ({tier.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={tier.percentage}
                    color={tier.tier === 'enterprise' ? 'secondary' : tier.tier === 'professional' ? 'primary' : 'default'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Document Processing Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Processing Statistics
              </Typography>
              
              <Grid container spacing={2}>
                {analytics?.documentStats?.map((stat) => (
                  <Grid item xs={6} key={stat.status}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color={
                        stat.status === 'completed' ? 'success.main' :
                        stat.status === 'failed' ? 'error.main' :
                        stat.status === 'warning' ? 'warning.main' : 'info.main'
                      }>
                        {stat.count}
                      </Typography>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize', mt: 1 }}>
                        {stat.status}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stat.percentage}%
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Subscription Tier
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tier</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">% of Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.revenueBreakdown?.map((tier) => (
                      <TableRow key={tier.tier}>
                        <TableCell>
                          <Chip
                            label={tier.tier.toUpperCase()}
                            color={
                              tier.tier === 'enterprise' ? 'secondary' :
                              tier.tier === 'professional' ? 'primary' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">{tier.users}</TableCell>
                        <TableCell align="right">${tier.revenue.toLocaleString()}</TableCell>
                        <TableCell align="right">{tier.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Users */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Active Users
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Documents</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics?.topUsers?.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {user.organization || user.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">{user.documentCount}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${user.successRate}%`}
                            color={user.successRate >= 90 ? 'success' : user.successRate >= 70 ? 'warning' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* System Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Performance Metrics
              </Typography>
              
              <Grid container spacing={3}>
                {analytics?.systemMetrics?.map((metric) => (
                  <Grid item xs={12} sm={6} md={3} key={metric.key}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5" color={
                        metric.status === 'good' ? 'success.main' :
                        metric.status === 'warning' ? 'warning.main' : 'error.main'
                      }>
                        {metric.value}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {metric.label}
                      </Typography>
                      <Chip
                        label={metric.status.toUpperCase()}
                        color={
                          metric.status === 'good' ? 'success' :
                          metric.status === 'warning' ? 'warning' : 'error'
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
