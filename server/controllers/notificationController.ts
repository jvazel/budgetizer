import User from '../models/User';
import { sendPushNotification } from '../utils/pushNotification';
import { AppRequest, AppResponse } from '../types';
import { logger } from '../utils/logger';

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-key
// @access  Private
export const getVapidPublicKey = async (req: AppRequest, res: AppResponse) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(404).json({ message: 'VAPID public key not configured' });
    }
    res.json({ publicKey });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
export const subscribe = async (req: AppRequest, res: AppResponse) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Subscription object is required and must contain endpoint and keys' });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Avoid duplicate subscriptions
    const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(201).json({ message: 'Successfully subscribed to push notifications' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Unsubscribe from push notifications
// @route   POST /api/notifications/unsubscribe
// @access  Private
export const unsubscribe = async (req: AppRequest, res: AppResponse) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out the subscription
    user.pushSubscriptions = user.pushSubscriptions.filter(sub => sub.endpoint !== endpoint);
    await user.save();

    res.json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Send a test push notification
// @route   POST /api/notifications/test
// @access  Private
export const sendTestNotification = async (req: AppRequest, res: AppResponse) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'L\'endpoint de test n\'est pas disponible en environnement de production' });
  }

  try {
    await sendPushNotification(req.user!.id, {
      title: 'Budgetizer Test 💰',
      body: 'Super ! Vos notifications push PWA fonctionnent correctement.',
      url: '/settings'
    });
    res.json({ message: 'Test notification triggered' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Failed to trigger test notification' });
  }
};

