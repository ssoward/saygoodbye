import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../utils/api';

const SubscriptionPlans = () => {
  const { user, refreshUser } = useAuth();
  const { showNotification } = useNotification();
  const [plans, setPlans] = useState({});
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, plan: null });

  useEffect(() => {
    fetchPlansAndUsage();
  }, []);

  const fetchPlansAndUsage = async () => {
    try {
      const [plansResponse, usageResponse] = await Promise.all([
        api.get('/payments/plans'),
        api.get('/payments/usage')
      ]);

      setPlans(plansResponse.data.plans);
      setUsage(usageResponse.data.usage);
    } catch (error) {
      console.error('Error fetching plans:', error);
      showNotification('Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType) => {
    try {
      setUpgrading(true);
      
      const response = await api.post('/payments/create-checkout-session', {
        planType
      });

      if (response.data.success) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      showNotification(
        error.response?.data?.message || 'Failed to initiate upgrade',
        'error'
      );
    } finally {
      setUpgrading(false);
    }
  };

  const handleConfirmUpgrade = () => {
    if (confirmDialog.plan) {
      handleUpgrade(confirmDialog.plan);
      setConfirmDialog({ open: false, plan: null });
    }
  };

  const getPlanColor = (planType) => {
    switch (planType) {
      case 'professional':
        return 'primary';
      case 'enterprise':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'professional':
        return <TrendingUpIcon />;
      case 'enterprise':
        return <BusinessIcon />;
      default:
        return <StarIcon />;
    }
  };

  const isCurrentPlan = (planType) => {
    return user?.tier === planType;
  };

  const canUpgrade = (planType) => {
    if (planType === 'free') return false;
    if (user?.tier === 'enterprise') return false;
    if (user?.tier === 'professional' && planType === 'professional') return false;
    return true;
  };

  const renderUsageIndicator = () => {
    if (!usage || usage.remaining === -1) return null;

    const percentage = (usage.used / usage.limit) * 100;
    const isNearLimit = percentage > 80;

    return (
      <Card sx={{ mb: 3, bgcolor: isNearLimit ? 'warning.light' : 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly Usage
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {usage.used} of {usage.limit} validations used this month
            </Typography>
            <LinearProgress
              variant="determinate"
              value={percentage}
              color={isNearLimit ? 'warning' : 'primary'}
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
            />
          </Box>
          {isNearLimit && (
            <Alert severity="warning" size="small">
              You're approaching your monthly limit. Consider upgrading for unlimited validations.
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Loading subscription plans...
        </Typography>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" align="center" gutterBottom>
        Choose Your Plan
      </Typography>
      <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Select the perfect plan for your POA validation needs
      </Typography>

      {renderUsageIndicator()}

      <Grid container spacing={4} justifyContent="center">
        {Object.entries(plans).map(([planType, plan]) => (
          <Grid item key={planType} xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: isCurrentPlan(planType) ? 2 : 1,
                borderColor: isCurrentPlan(planType) ? 'primary.main' : 'divider',
                ...(planType === 'professional' && {
                  transform: 'scale(1.05)',
                  boxShadow: 3
                })
              }}
            >
              {isCurrentPlan(planType) && (
                <Chip
                  label="Current Plan"
                  color="primary"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1
                  }}
                />
              )}

              {planType === 'professional' && (
                <Chip
                  label="Most Popular"
                  color="secondary"
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

              <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getPlanIcon(planType)}
                  <Typography variant="h5" sx={{ ml: 1 }}>
                    {plan.name}
                  </Typography>
                </Box>

                <Typography variant="h4" color="primary" gutterBottom>
                  ${plan.price}
                  {plan.price > 0 && (
                    <Typography component="span" variant="subtitle1" color="text.secondary">
                      /month
                    </Typography>
                  )}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {plan.validationsPerMonth === -1
                    ? 'Unlimited validations'
                    : `${plan.validationsPerMonth} validations per month`}
                </Typography>

                <List dense>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                {isCurrentPlan(planType) ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : canUpgrade(planType) ? (
                  <Button
                    fullWidth
                    variant="contained"
                    color={getPlanColor(planType)}
                    onClick={() => setConfirmDialog({ open: true, plan: planType })}
                    disabled={upgrading}
                  >
                    {planType === 'free' ? 'Current Plan' : 'Upgrade Now'}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled
                  >
                    Contact Sales
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Upgrade Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, plan: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Subscription Upgrade</DialogTitle>
        <DialogContent>
          <Typography>
            You're about to upgrade to the {plans[confirmDialog.plan]?.name} plan.
            You'll be redirected to Stripe to complete your payment.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Plan Benefits:
            </Typography>
            <List dense>
              {plans[confirmDialog.plan]?.features.map((feature, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, plan: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpgrade}
            variant="contained"
            disabled={upgrading}
          >
            Continue to Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionPlans;
