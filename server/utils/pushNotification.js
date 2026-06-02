import webpush from 'web-push';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initWebPush = () => {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.log('VAPID keys missing. Generating new ones...');
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
        console.log('Generated VAPID keys successfully appended to server/.env.');
      } else {
        console.warn('server/.env not found, could not write VAPID keys. They will reset on server restart.');
      }
    } catch (err) {
      console.error('Failed to write VAPID keys to .env file:', err);
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
  console.log('Web Push initialized successfully.');
};

/**
 * Sends a push notification to all active devices of a given user
 * @param {string} userId - The user ID
 * @param {object} payload - The notification payload containing { title, body, url }
 */
export const sendPushNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const payloadString = JSON.stringify(payload);
    const deadSubscriptions = [];

    // Send notifications to all active subscriptions of this user
    await Promise.all(
      user.pushSubscriptions.map(async (subscription) => {
        try {
          const subObj = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          };
          await webpush.sendNotification(subObj, payloadString);
        } catch (error) {
          // If the subscription is no longer valid (e.g., expired or permission revoked), mark for cleanup
          if (error.statusCode === 410 || error.statusCode === 404) {
            deadSubscriptions.push(subscription._id);
          } else {
            console.error(`Error sending push notification to endpoint ${subscription.endpoint}:`, error);
          }
        }
      })
    );

    // Clean up dead subscriptions
    if (deadSubscriptions.length > 0) {
      user.pushSubscriptions = user.pushSubscriptions.filter(
        (sub) => !deadSubscriptions.includes(sub._id)
      );
      await user.save();
      console.log(`Cleaned up ${deadSubscriptions.length} dead push subscriptions for user ${userId}`);
    }
  } catch (err) {
    console.error('Error in sendPushNotification:', err);
  }
};
