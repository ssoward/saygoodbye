const Stripe = require('stripe');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn('STRIPE_SECRET_KEY not found in environment variables. Payment features will be disabled.');
      this.stripe = null;
      return;
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Subscription tiers and pricing
    this.subscriptionPlans = {
      free: {
        name: 'Free',
        price: 0,
        validationsPerMonth: 5,
        features: ['Basic validation', 'PDF support', 'Email support']
      },
      professional: {
        name: 'Professional',
        price: 29.99,
        priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_monthly',
        validationsPerMonth: -1, // Unlimited
        features: [
          'Unlimited validations',
          'Image OCR support', 
          'Batch processing',
          'Priority support',
          'Detailed reports',
          'API access'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        price: 99.99,
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
        validationsPerMonth: -1, // Unlimited
        features: [
          'Everything in Professional',
          'White-label options',
          'Custom integrations',
          'Dedicated support',
          'SLA guarantees',
          'Custom validation rules',
          'Advanced analytics'
        ]
      }
    };
  }

  /**
   * Create a checkout session for subscription upgrade
   */
  async createCheckoutSession(userId, planType, successUrl, cancelUrl) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe is not configured');
      }

      const plan = this.subscriptionPlans[planType];
      if (!plan || planType === 'free') {
        throw new Error('Invalid subscription plan');
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
          userId: userId,
          planType: planType
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_email: null // Will be filled from user data
      });

      logger.info(`Checkout session created for user ${userId}, plan: ${planType}`);
      
      return {
        sessionId: session.id,
        url: session.url
      };

    } catch (error) {
      logger.error('Error creating checkout session:', error);
      throw new Error(`Payment session creation failed: ${error.message}`);
    }
  }

  /**
   * Create a customer portal session for subscription management
   */
  async createCustomerPortalSession(customerId, returnUrl) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe is not configured');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return {
        url: session.url
      };

    } catch (error) {
      logger.error('Error creating customer portal session:', error);
      throw new Error(`Customer portal creation failed: ${error.message}`);
    }
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhook(rawBody, signature) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe is not configured');
      }

      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };

    } catch (error) {
      logger.error('Webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle successful checkout completion
   */
  async handleCheckoutCompleted(session) {
    try {
      const userId = session.client_reference_id || session.metadata.userId;
      const planType = session.metadata.planType;

      if (!userId || !planType) {
        throw new Error('Missing user ID or plan type in checkout session');
      }

      // Get customer and subscription details
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      // Update user subscription in database
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        tier: planType,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        validationsUsedThisMonth: 0 // Reset usage counter
      });

      logger.info(`Subscription activated for user ${userId}: ${planType}`);

    } catch (error) {
      logger.error('Error handling checkout completion:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updates
   */
  async handleSubscriptionUpdated(subscription) {
    try {
      const customerId = subscription.customer;
      
      // Find user by customer ID
      const User = require('../models/User');
      const user = await User.findOne({ stripeCustomerId: customerId });
      
      if (!user) {
        logger.warn(`User not found for customer ID: ${customerId}`);
        return;
      }

      // Update subscription status
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id
      });

      logger.info(`Subscription updated for user ${user._id}: ${subscription.status}`);

    } catch (error) {
      logger.error('Error handling subscription update:', error);
      throw error;
    }
  }

  /**
   * Handle subscription cancellation
   */
  async handleSubscriptionCanceled(subscription) {
    try {
      const customerId = subscription.customer;
      
      // Find user by customer ID
      const User = require('../models/User');
      const user = await User.findOne({ stripeCustomerId: customerId });
      
      if (!user) {
        logger.warn(`User not found for customer ID: ${customerId}`);
        return;
      }

      // Downgrade to free tier
      await User.findByIdAndUpdate(user._id, {
        tier: 'free',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
        validationsUsedThisMonth: 0 // Reset counter
      });

      logger.info(`Subscription canceled for user ${user._id}, downgraded to free tier`);

    } catch (error) {
      logger.error('Error handling subscription cancellation:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const customerId = invoice.customer;
      
      // Find user by customer ID
      const User = require('../models/User');
      const user = await User.findOne({ stripeCustomerId: customerId });
      
      if (!user) {
        logger.warn(`User not found for customer ID: ${customerId}`);
        return;
      }

      // Reset monthly usage counter on successful payment
      await User.findByIdAndUpdate(user._id, {
        validationsUsedThisMonth: 0,
        lastPaymentDate: new Date()
      });

      logger.info(`Payment succeeded for user ${user._id}, usage counter reset`);

    } catch (error) {
      logger.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(invoice) {
    try {
      const customerId = invoice.customer;
      
      // Find user by customer ID
      const User = require('../models/User');
      const user = await User.findOne({ stripeCustomerId: customerId });
      
      if (!user) {
        logger.warn(`User not found for customer ID: ${customerId}`);
        return;
      }

      // Could implement grace period logic here
      logger.warn(`Payment failed for user ${user._id}`);

    } catch (error) {
      logger.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Get subscription plans for frontend
   */
  getSubscriptionPlans() {
    return this.subscriptionPlans;
  }

  /**
   * Check if user can perform more validations
   */
  async canUserValidate(user) {
    const plan = this.subscriptionPlans[user.tier] || this.subscriptionPlans.free;
    
    // Unlimited validations for paid tiers
    if (plan.validationsPerMonth === -1) {
      return { canValidate: true, remaining: -1 };
    }

    // Check monthly limit for free tier
    const used = user.validationsUsedThisMonth || 0;
    const remaining = plan.validationsPerMonth - used;
    
    return {
      canValidate: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: plan.validationsPerMonth,
      used: used
    };
  }

  /**
   * Increment user's validation usage
   */
  async incrementValidationUsage(userId) {
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        $inc: { validationsUsedThisMonth: 1 }
      });

    } catch (error) {
      logger.error('Error incrementing validation usage:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
