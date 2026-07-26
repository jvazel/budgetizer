import webpush from 'web-push';
import User from '../models/User';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initWebPush = (): void => {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    logger.info('VAPID keys missing. Generating new ones...');
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;

      // Persist to .env file
    try {
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');

          // Remove empty lines at the end to clean it up
        envContent = envContent.trimEnd();

          // Append keys
        envContent += `\n\n# === WEB PUSH PWA CONFIGURATION ===\nVAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\n`;

        fs.writeFileSync(envPath, envContent, 'utf8');
        logger.info('Generated VAPID keys successfully appended to server/.env.');
        } else {
        logger.warn('server/.env not found, could not write VAPID keys. They will reset on server restart.');
        }
      } catch (err) {
      logger.error('Failed to write VAPID keys to .env file:', { error: (err as Error).message });
      }

      // Set process env variables so they are available immediately
    process.env.VAPID_PUBLIC_KEY = publicKey;
    process.env.VAPID_PRIVATE_KEY = privateKey;
    }

  webpush.setVapidDetails(
      'mailto:budgetizer@example.com',
    publicKey,
    privateKey
    );
  logger.info('Web Push initialized successfully.');
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a push notification to all active devices of a given user
 */
export const sendPushNotification = async (userId: string, payload: PushPayload): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
      }

    const payloadString = JSON.stringify(payload);
    const deadSubscriptions: string[] = [];

      // Send notifications to all active subscriptions of this user
    await Promise.all(
      user.pushSubscriptions.map(async (subscription) => {
        try {
          const subObj = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
              },
            };
          await webpush.sendNotification(subObj, payloadString);
          } catch (error: unknown) {
            // If the subscription is no longer valid (e.g., expired or permission revoked), mark for cleanup
          const err = error as { statusCode?: number };
          if (err.statusCode === 410 || err.statusCode === 404) {
            if (subscription._id != null) {
              deadSubscriptions.push(subscription._id.toString());
             }
           } else {
            logger.error(`Error sending push notification to endpoint ${subscription.endpoint}`, { error: (error as Error).message });
           }
          }
        })
      );

      // Clean up dead subscriptions
    if (deadSubscriptions.length > 0) {
       const filtered = user.pushSubscriptions.filter(
          (sub) => sub._id == null || !deadSubscriptions.includes(sub._id.toString())
        );
       user.pushSubscriptions = filtered as typeof user.pushSubscriptions;
      await user.save();
      logger.info(`Cleaned up ${deadSubscriptions.length} dead push subscriptions for user ${userId}`);
      }
    } catch (err) {
    logger.error('Error in sendPushNotification:', { error: (err as Error).message });
    }
};