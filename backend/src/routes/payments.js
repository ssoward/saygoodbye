const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Create Stripe customer and setup subscription
router.post('/create-subscription', auth, async (req, res) => {
  try {
    const { tier, paymentMethodId } = req.body;
    const user = req.user;

    if (!['professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid subscription tier'
      });
    }

    // Create Stripe customer if not exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString()
        }
      });
      customerId = customer.id;
      
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: customerId
      });
    }

    // Attach payment method to customer
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Create subscription
    const priceId = tier === 'professional' 
      ? process.env.STRIPE_PROFESSIONAL_PRICE_ID 
      : process.env.STRIPE_ENTERPRISE_PRICE_ID;

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user with subscription info
    await User.findByIdAndUpdate(user._id, {
      tier,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status
    });

    logger.info(`Subscription created for user ${user.email}: ${tier}`);

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status
    });

  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({
      error: 'Error creating subscription'
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscriptionId) {
      return res.status(400).json({
        error: 'No active subscription found'
      });
    }

    // Cancel at period end
    const subscription = await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true
    });

    logger.info(`Subscription cancelled for user ${user.email}`);

    res.json({
      message: 'Subscription will be cancelled at the end of current billing period',
      cancellationDate: new Date(subscription.current_period_end * 1000)
    });

  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Error cancelling subscription'
    });
  }
});

// Get subscription details
router.get('/subscription', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscriptionId) {
      return res.json({
        subscription: null,
        tier: user.tier
      });
    }

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: user.stripeCustomerId,
    });

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
      },
      nextInvoice: {
        amount: invoice.amount_due,
        currency: invoice.currency,
        date: new Date(invoice.next_payment_attempt * 1000)
      },
      tier: user.tier
    });

  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      error: 'Error fetching subscription details'
    });
  }
});

// Get billing information (subscription status, payment history, etc.)
router.get('/info', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Default billing info for users without Stripe
    let billingInfo = {
      subscription: {
        status: 'free',
        tier: user.tier,
        validationsUsed: user.validationsThisMonth || 0,
        validationsLimit: user.tierLimits?.validationsPerMonth || 5,
        nextBillingDate: null,
        amount: 0
      },
      paymentMethod: null,
      invoices: []
    };

    // If user has Stripe customer ID, get subscription details
    if (user.stripeCustomerId) {
      try {
        // Get customer details
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        
        // Get subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          billingInfo.subscription = {
            status: subscription.status,
            tier: user.tier,
            validationsUsed: user.validationsThisMonth || 0,
            validationsLimit: user.tierLimits?.validationsPerMonth || 5,
            nextBillingDate: new Date(subscription.current_period_end * 1000),
            amount: subscription.items.data[0]?.price.unit_amount / 100 || 0,
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          };
        }

        // Get payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'card'
        });

        if (paymentMethods.data.length > 0) {
          const card = paymentMethods.data[0].card;
          billingInfo.paymentMethod = {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_year
          };
        }

        // Get recent invoices
        const invoices = await stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 5
        });

        billingInfo.invoices = invoices.data.map(invoice => ({
          id: invoice.id,
          date: new Date(invoice.created * 1000),
          amount: invoice.total / 100,
          status: invoice.status,
          pdfUrl: invoice.hosted_invoice_url
        }));

      } catch (stripeError) {
        logger.warn('Error fetching Stripe data:', stripeError);
        // Continue with default billing info
      }
    }

    res.json(billingInfo);

  } catch (error) {
    logger.error('Get billing info error:', error);
    res.status(500).json({
      error: 'Error retrieving billing information'
    });
  }
});

// Change subscription plan
router.post('/change-plan', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = req.user;

    if (!['free', 'professional', 'enterprise'].includes(planId)) {
      return res.status(400).json({
        error: 'Invalid plan ID'
      });
    }

    // Handle downgrade to free
    if (planId === 'free') {
      if (user.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active'
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true
          });
        }
      }

      await User.findByIdAndUpdate(user._id, {
        tier: 'free',
        subscriptionStatus: 'canceling'
      });

      res.json({
        message: 'Subscription will be cancelled at the end of current billing period'
      });
      return;
    }

    // Handle upgrade (redirect to create subscription flow)
    res.json({
      message: 'Please use the subscription creation flow for upgrades',
      redirectTo: '/create-subscription'
    });

  } catch (error) {
    logger.error('Change plan error:', error);
    res.status(500).json({
      error: 'Error changing subscription plan'
    });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

async function handleSubscriptionChange(subscription) {
  try {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (!user) {
      logger.warn(`User not found for customer ${subscription.customer}`);
      return;
    }

    const tierMapping = {
      [process.env.STRIPE_PROFESSIONAL_PRICE_ID]: 'professional',
      [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
    };

    let newTier = 'free';
    if (subscription.status === 'active' && subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      newTier = tierMapping[priceId] || 'free';
    }

    await User.findByIdAndUpdate(user._id, {
      tier: newTier,
      subscriptionStatus: subscription.status
    });

    logger.info(`User ${user.email} subscription updated: ${subscription.status}, tier: ${newTier}`);
  } catch (error) {
    logger.error('Handle subscription change error:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    if (!user) {
      logger.warn(`User not found for customer ${invoice.customer}`);
      return;
    }

    logger.info(`Payment succeeded for user ${user.email}, amount: ${invoice.amount_paid / 100}`);
    
    // TODO: Send payment confirmation email
  } catch (error) {
    logger.error('Handle payment succeeded error:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const user = await User.findOne({ stripeCustomerId: invoice.customer });
    if (!user) {
      logger.warn(`User not found for customer ${invoice.customer}`);
      return;
    }

    logger.warn(`Payment failed for user ${user.email}, amount: ${invoice.amount_due / 100}`);
    
    // TODO: Send payment failed notification
  } catch (error) {
    logger.error('Handle payment failed error:', error);
  }
}

module.exports = router;
