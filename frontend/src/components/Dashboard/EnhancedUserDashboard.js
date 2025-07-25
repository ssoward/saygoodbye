import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';

const EnhancedUserDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [dashboardData, setDashboardData] = useState({
    usage: null,
    recentDocuments: [],
    stats: {},
    subscription: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usageResponse, documentsResponse, subscriptionResponse] = await Promise.all([
        api.get('/payments/usage'),
        api.get('/documents?limit=5'),
        api.get('/payments/subscription-status')
      ]);

      // Calculate stats from documents
      const documents = documentsResponse.data.documents || [];
      const stats = {
        totalDocuments: documents.length,
        validDocuments: documents.filter(doc => doc.validationResults?.overallStatus === 'pass').length,
        pendingDocuments: documents.filter(doc => doc.status === 'processing').length,
        failedDocuments: documents.filter(doc => doc.validationResults?.overallStatus === 'fail').length
      };

      setDashboardData({
        usage: usageResponse.data.usage,
        recentDocuments: documents.slice(0, 5),
        stats,
        subscription: subscriptionResponse.data.subscription
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (documentId, documentName) => {
    try {
      const response = await api.get(`/documents/${documentId}/report`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${documentName}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showNotification('Report downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading report:', error);
      showNotification('Failed to download report', 'error');
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case 'professional':
        return <TrendingUpIcon />;
      case 'enterprise':
        return <BusinessIcon />;
      default:
        return <StarIcon />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'fail':
        return <ErrorIcon color="error" />;
      default:
        return <AssessmentIcon color="action" />;
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
      default:
        return 'default';
    }
  };

  const renderUsageCard = () => {
    const { usage, subscription } = dashboardData;
    if (!usage) return null;

    const isUnlimited = usage.remaining === -1;
    const percentage = isUnlimited ? 0 : (usage.used / usage.limit) * 100;
    const isNearLimit = percentage > 80;

    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {getTierIcon(user?.tier)}
            <Typography variant="h6" sx={{ ml: 1 }}>
              {subscription?.currentPlan?.name || 'Free'} Plan
            </Typography>
          </Box>

          {!isUnlimited && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Monthly Usage: {usage.used} of {usage.limit} validations
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage}
                color={isNearLimit ? 'warning' : 'primary'}
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />
            </>
          )}

          {isUnlimited && (
            <Typography variant="body2" color="primary" gutterBottom>
              ✨ Unlimited validations
            </Typography>
          )}

          {isNearLimit && !isUnlimited && (
            <Alert severity="warning" size="small" sx={{ mb: 2 }}>
              You're approaching your monthly limit. Consider upgrading for unlimited validations.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={subscription?.status === 'active' ? <CheckCircleIcon /> : undefined}
              label={subscription?.status || 'Free'}
              color={subscription?.status === 'active' ? 'success' : 'default'}
              size="small"
            />
            {user?.tier !== 'enterprise' && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                href="/subscription"
              >
                Upgrade Plan
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderStatsCards = () => {
    const { stats } = dashboardData;
    
    const statCards = [
      {
        title: 'Total Documents',
        value: stats.totalDocuments || 0,
        icon: <DescriptionIcon />,
        color: 'primary'
      },
      {
        title: 'Valid Documents',
        value: stats.validDocuments || 0,
        icon: <CheckCircleIcon />,
        color: 'success'
      },
      {
        title: 'Processing',
        value: stats.pendingDocuments || 0,
        icon: <AssessmentIcon />,
        color: 'info'
      },
      {
        title: 'Failed Validation',
        value: stats.failedDocuments || 0,
        icon: <ErrorIcon />,
        color: 'error'
      }
    ];

    return statCards.map((stat, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ color: `${stat.color}.main`, mr: 1 }}>
                {stat.icon}
              </Box>
              <Typography variant="h4" color={stat.color}>
                {stat.value}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {stat.title}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ));
  };

  const renderRecentDocuments = () => {
    const { recentDocuments } = dashboardData;

    if (recentDocuments.length === 0) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Documents
            </Typography>
            <Alert severity="info">
              No documents uploaded yet. Start by uploading your first POA document for validation.
            </Alert>
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              href="/validate"
            >
              Upload First Document
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Documents
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDocuments.map((doc) => (
                  <TableRow key={doc._id}>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {doc.originalName}
                      </Typography>
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
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          href={`/documents/${doc._id}`}
                        >
                          View
                        </Button>
                        {doc.validationResults && (
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownloadReport(doc._id, doc.originalName)}
                          >
                            Report
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button href="/documents" variant="outlined">
              View All Documents
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Loading Dashboard...
        </Typography>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.firstName}!
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Here's an overview of your POA validation activity
      </Typography>

      <Grid container spacing={3}>
        {/* Usage Card */}
        <Grid item xs={12} md={4}>
          {renderUsageCard()}
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List>
                <ListItem button component="a" href="/validate">
                  <ListItemIcon>
                    <DescriptionIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Validate New Document"
                    secondary="Upload and validate a POA document"
                  />
                </ListItem>
                <ListItem button component="a" href="/documents">
                  <ListItemIcon>
                    <AssessmentIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="View All Documents"
                    secondary="Manage your document library"
                  />
                </ListItem>
                {user?.tier === 'free' && (
                  <ListItem button component="a" href="/subscription">
                    <ListItemIcon>
                      <TrendingUpIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Upgrade Plan"
                      secondary="Get unlimited validations and premium features"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Recent Documents */}
        <Grid item xs={12}>
          {renderRecentDocuments()}
        </Grid>
      </Grid>
    </Container>
  );
};

export default EnhancedUserDashboard;
