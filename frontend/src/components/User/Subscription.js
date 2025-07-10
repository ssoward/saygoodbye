import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  CreditCard as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';
import moment from 'moment';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'Perfect for getting started',
    features: [
      '5 validations per month',
      'Basic validation reports',
      'Email support',
      'Standard processing time'
    ],
    limitations: [
      'No batch processing',
      'No priority support',
      'No custom reports',
      'No API access'
    ],
    popular: false,
    color: 'default'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    interval: 'month',
    description: 'For professionals and small businesses',
    features: [
      'Unlimited validations',
      'Batch processing',
      'Priority support',
      'Advanced reports',
      'Export capabilities',
      'Case management'
    ],
    limitations: [
      'No API access',
      'No white-label reports'
    ],
    popular: true,
    color: 'primary'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    description: 'For large organizations and funeral homes',
    features: [
      'Everything in Professional',
      'Admin dashboard',
      'User management',
      'API access',
      'White-label reports',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    limitations: [],
    popular: false,
    color: 'secondary'
  }
];

const Subscription = () => {
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      const response = await api.get('/billing/info');
      setBillingInfo(response.data);
    } catch (error) {
      console.error('Error fetching billing info:', error);
    }
  };

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };

  const handleDowngrade = () => {
    setSelectedPlan(plans.find(p => p.id === 'free'));
    setUpgradeDialogOpen(true);
  };

  const confirmPlanChange = async () => {
    if (!selectedPlan) return;

    try {
      setLoading(true);
      const response = await api.post('/billing/change-plan', {
        planId: selectedPlan.id
      });

      updateUser({ tier: selectedPlan.id });
      showSuccess(`Successfully ${selectedPlan.id === 'free' ? 'downgraded to' : 'upgraded to'} ${selectedPlan.name} plan`);
      setUpgradeDialogOpen(false);
      fetchBillingInfo();
    } catch (error) {
      console.error('Error changing plan:', error);
      showError(error.response?.data?.error || 'Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlan = () => {
    return plans.find(plan => plan.id === user?.tier) || plans[0];
  };

  const getUsagePercentage = () => {
    if (!user?.tierLimits || user.tierLimits.validationsPerMonth === -1) return 0;
    return Math.min((user.validationsThisMonth / user.tierLimits.validationsPerMonth) * 100, 100);
  };

  const currentPlan = getCurrentPlan();
  const usagePercentage = getUsagePercentage();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Subscription Management
      </Typography>

      {/* Current Plan Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Current Plan: {currentPlan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentPlan.description}
                  </Typography>
                </Box>
                <Chip
                  label={currentPlan.name.toUpperCase()}
                  color={currentPlan.color}
                  icon={currentPlan.popular ? <StarIcon /> : undefined}
                />
              </Box>

              {currentPlan.price > 0 && billingInfo && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Next billing date: {moment(billingInfo.nextBillingDate).format('MMMM DD, YYYY')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Amount: ${currentPlan.price}/month
                  </Typography>
                </Box>
              )}

              {/* Usage Statistics */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Monthly Usage
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Validations Used
                  </Typography>
                  <Typography variant="body2">
                    {user?.validationsThisMonth || 0} / {user?.tierLimits?.validationsPerMonth === -1 ? '∞' : user?.tierLimits?.validationsPerMonth || 0}
                  </Typography>
                </Box>
                {user?.tierLimits?.validationsPerMonth !== -1 && (
                  <LinearProgress
                    variant="determinate"
                    value={usagePercentage}
                    color={usagePercentage > 80 ? 'warning' : 'primary'}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Billing Information
              </Typography>
              
              {billingInfo ? (
                <Box>
                  {billingInfo.paymentMethod && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Payment Method
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <PaymentIcon sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          **** **** **** {billingInfo.paymentMethod.last4}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PaymentIcon />}
                    disabled
                  >
                    Update Payment Method
                  </Button>
                </Box>
              ) : (
                <Alert severity="info">
                  No billing information on file
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Available Plans */}
      <Typography variant="h5" gutterBottom>
        Available Plans
      </Typography>

      <Grid container spacing={3}>
        {plans.map((plan) => (
          <Grid item xs={12} md={4} key={plan.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: plan.popular ? 2 : 1,
                borderColor: plan.popular ? 'primary.main' : 'divider'
              }}
            >
              {plan.popular && (
                <Chip
                  label="Most Popular"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1
                  }}
                />
              )}

              <CardContent sx={{ flexGrow: 1, pt: plan.popular ? 3 : 2 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h3" component="div" color="primary">
                    ${plan.price}
                    <Typography component="span" variant="h6" color="text.secondary">
                      /{plan.interval}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {plan.description}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Features */}
                <Typography variant="subtitle2" gutterBottom>
                  Features:
                </Typography>
                <List dense>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>

                {/* Limitations */}
                {plan.limitations.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Not included:
                    </Typography>
                    <List dense>
                      {plan.limitations.map((limitation, index) => (
                        <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CloseIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={limitation}
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>

              <Box sx={{ p: 2, pt: 0 }}>
                {plan.id === user?.tier ? (
                  <Button fullWidth variant="outlined" disabled>
                    Current Plan
                  </Button>
                ) : plan.id === 'free' ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleDowngrade}
                    disabled={user?.tier === 'free'}
                  >
                    Downgrade to Free
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    color={plan.color}
                    onClick={() => handleUpgrade(plan)}
                    startIcon={plan.id === 'enterprise' ? <BusinessIcon /> : <TrendingUpIcon />}
                  >
                    {user?.tier === 'free' ? 'Upgrade' : 'Switch'} to {plan.name}
                  </Button>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Plan Change Confirmation Dialog */}
      <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)}>
        <DialogTitle>
          Confirm Plan Change
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box>
              <Typography gutterBottom>
                Are you sure you want to {selectedPlan.id === 'free' ? 'downgrade to' : 'change to'} the <strong>{selectedPlan.name}</strong> plan?
              </Typography>
              
              {selectedPlan.id !== 'free' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  You will be charged ${selectedPlan.price}/month starting from your next billing cycle.
                </Alert>
              )}
              
              {selectedPlan.id === 'free' && user?.tier !== 'free' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Downgrading will limit your access to certain features. Your validation history will be preserved.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmPlanChange}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Subscription;
