import { vi, describe, it, expect, beforeEach } from 'vitest';
import { initWebPush, sendPushNotification } from '../pushNotification';
import webpush from 'web-push';
import User from '../../models/User';
import fs from 'fs';

vi.mock('web-push', () => ({
  default: {
    generateVAPIDKeys: vi.fn().mockReturnValue({
      publicKey: 'mockPublicKey',
      privateKey: 'mockPrivateKey'
    }),
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../models/User', () => ({
  default: {
    findById: vi.fn()
  }
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(''),
    writeFileSync: vi.fn()
  }
}));

describe('pushNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  describe('initWebPush', () => {
    it('should generate new VAPID keys if they are missing in environment', () => {
      initWebPush();

      expect(webpush.generateVAPIDKeys).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(process.env.VAPID_PUBLIC_KEY).toBe('mockPublicKey');
      expect(process.env.VAPID_PRIVATE_KEY).toBe('mockPrivateKey');
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:budgetizer@example.com',
        'mockPublicKey',
        'mockPrivateKey'
      );
    });

    it('should use existing VAPID keys if they are present in environment', () => {
      process.env.VAPID_PUBLIC_KEY = 'existingPublic';
      process.env.VAPID_PRIVATE_KEY = 'existingPrivate';

      initWebPush();

      expect(webpush.generateVAPIDKeys).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:budgetizer@example.com',
        'existingPublic',
        'existingPrivate'
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should do nothing if user is not found or has no subscriptions', async () => {
      User.findById.mockResolvedValue(null);

      await sendPushNotification('user1', { title: 'Test' });

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should send notification to all active subscriptions', async () => {
      const mockUser = {
        _id: 'user1',
        pushSubscriptions: [
          { _id: 'sub1', endpoint: 'ep1', keys: { p256dh: 'p1', auth: 'a1' } },
          { _id: 'sub2', endpoint: 'ep2', keys: { p256dh: 'p2', auth: 'a2' } }
        ],
        save: vi.fn().mockResolvedValue({})
      };
      User.findById.mockResolvedValue(mockUser);

      await sendPushNotification('user1', { title: 'Test Title', body: 'Test Body' });

      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        { endpoint: 'ep1', keys: { p256dh: 'p1', auth: 'a1' } },
        JSON.stringify({ title: 'Test Title', body: 'Test Body' })
      );
    });

    it('should remove dead subscriptions when status is 410 or 404', async () => {
      const mockUser = {
        _id: 'user1',
        pushSubscriptions: [
          { _id: 'sub_active', endpoint: 'ep_active', keys: { p256dh: 'p1', auth: 'a1' } },
          { _id: 'sub_expired', endpoint: 'ep_expired', keys: { p256dh: 'p2', auth: 'a2' } }
        ],
        save: vi.fn().mockResolvedValue({})
      };
      User.findById.mockResolvedValue(mockUser);

      // Make first subscription succeed, second fail with 410 Gone
      webpush.sendNotification.mockImplementation(async (sub) => {
        if (sub.endpoint === 'ep_expired') {
          const err = new Error('Subscription expired');
          err.statusCode = 410;
          throw err;
        }
        return {};
      });

      await sendPushNotification('user1', { title: 'Notification' });

      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(mockUser.pushSubscriptions).toHaveLength(1);
      expect(mockUser.pushSubscriptions[0].endpoint).toBe('ep_active');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
